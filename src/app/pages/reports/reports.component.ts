import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CalendarClock,
  FileDown,
  FileSpreadsheet,
  LucideAngularModule,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { DevelopmentListItem } from '../../core/models/development.model';
import { Person } from '../../core/models/person.model';
import {
  ReportFilters,
  ReportFormat,
  ReportType,
} from '../../core/models/report.model';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { ReportService } from '../../core/services/report.service';
import { extractError } from '../../shared/utils/http-error';
import { filenameFromContentDisposition } from '../../shared/utils/file-download';

interface ReportOption {
  type: ReportType;
  title: string;
  description: string;
  filters: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly personService = inject(PersonService);
  private readonly developmentService = inject(DevelopmentService);
  private referenceSequence = 0;
  private generationSequence = 0;

  readonly investors = signal<Person[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly referencesLoading = signal(true);
  readonly referencesError = signal('');
  readonly generating = signal<{
    type: ReportType;
    format: ReportFormat;
  } | null>(null);
  readonly validationError = signal('');
  readonly generationError = signal('');
  readonly feedback = signal('');

  startDate = '';
  endDate = '';
  asOfDate = this.localDateToday();
  investorId = '';
  developmentId = '';
  status: ReportFilters['status'] = '';

  readonly reports: readonly ReportOption[] = [
    {
      type: 'captations',
      title: 'Captação',
      description:
        'Aportes, destinação a empreendimentos, caixa geral e saldo não alocado.',
      filters: 'Período, investidor e empreendimento',
    },
    {
      type: 'returns',
      title: 'Retornos',
      description:
        'Valores previstos e realizados, com situação de cada lançamento.',
      filters: 'Período, investidor, empreendimento e status',
    },
    {
      type: 'overdue-returns',
      title: 'Retornos em atraso',
      description:
        'Pendências vencidas na data de referência e últimos contatos relacionados.',
      filters: 'Data de referência, investidor e empreendimento',
    },
    {
      type: 'investor-positions',
      title: 'Posição por investidor',
      description:
        'Capital, alocações, caixa e retornos consolidados por investidor.',
      filters: 'Investidor e empreendimento',
    },
  ];

  readonly DownloadIcon = FileDown;
  readonly RefreshIcon = RefreshCw;
  readonly ReportsIcon = FileSpreadsheet;
  readonly TrendingIcon = TrendingUp;
  readonly ReturnsIcon = CalendarClock;
  readonly InvestorsIcon = Users;

  ngOnInit(): void {
    this.loadReferences();
  }

  loadReferences(): void {
    const sequence = ++this.referenceSequence;
    this.referencesLoading.set(true);
    this.referencesError.set('');
    forkJoin({
      investors: this.personService.list('INVESTIDOR'),
      developments: this.developmentService.list(),
    }).subscribe({
      next: ({ investors, developments }) => {
        if (sequence !== this.referenceSequence) return;
        this.investors.set(
          [...investors].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        );
        this.developments.set(
          [...developments].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR'),
          ),
        );
        this.referencesLoading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.referenceSequence) return;
        this.referencesLoading.set(false);
        this.referencesError.set(
          extractError(
            error,
            'Não foi possível carregar investidores e empreendimentos.',
          ),
        );
      },
    });
  }

  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.asOfDate = this.localDateToday();
    this.investorId = '';
    this.developmentId = '';
    this.status = '';
    this.validationError.set('');
    this.generationError.set('');
  }

  generate(type: ReportType, format: ReportFormat): void {
    if (this.generating()) return;
    const periodError = this.validatePeriod(type);
    this.validationError.set(periodError);
    this.generationError.set('');
    this.feedback.set('');
    if (periodError) return;

    const sequence = ++this.generationSequence;
    this.generating.set({ type, format });
    this.reportService.generate(type, format, this.filters()).subscribe({
      next: (response) => {
        if (sequence !== this.generationSequence) return;
        this.generating.set(null);
        if (!response.body || response.body.size === 0) {
          this.generationError.set('O relatório retornado está vazio.');
          return;
        }
        this.saveResponse(response, type, format);
        this.feedback.set(
          `${this.reportTitle(type)} gerado em ${format.toUpperCase()}.`,
        );
      },
      error: (error: unknown) => {
        if (sequence !== this.generationSequence) return;
        this.generating.set(null);
        if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
          void this.readBlobError(error, sequence);
          return;
        }
        this.generationError.set(this.reportError(error));
      },
    });
  }

  isGenerating(type: ReportType, format: ReportFormat): boolean {
    const current = this.generating();
    return current?.type === type && current.format === format;
  }

  reportIcon(type: ReportType) {
    if (type === 'captations') return this.TrendingIcon;
    if (type === 'investor-positions') return this.InvestorsIcon;
    return this.ReturnsIcon;
  }

  private filters(): ReportFilters {
    return {
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      asOfDate: this.asOfDate || undefined,
      investorId: this.investorId || undefined,
      developmentId: this.developmentId || undefined,
      status: this.status || undefined,
    };
  }

  private validatePeriod(type: ReportType): string {
    if (type !== 'captations' && type !== 'returns') return '';
    if (!this.startDate || !this.endDate) return '';
    const start = Date.parse(`${this.startDate}T00:00:00Z`);
    const end = Date.parse(`${this.endDate}T00:00:00Z`);
    if (end < start) {
      return 'A data inicial deve ser anterior ou igual à data final.';
    }
    const days = Math.floor((end - start) / 86_400_000) + 1;
    if (days > 366) {
      return 'O período máximo para relatórios é de 366 dias.';
    }
    return '';
  }

  private saveResponse(
    response: HttpResponse<Blob>,
    type: ReportType,
    format: ReportFormat,
  ): void {
    const fallback = `harpia-${this.reportSlug(type)}-${this.localDateToday()}.${format}`;
    const name = filenameFromContentDisposition(
      response.headers.get('Content-Disposition'),
      fallback,
    );
    const url = URL.createObjectURL(response.body!);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private async readBlobError(
    error: HttpErrorResponse,
    sequence: number,
  ): Promise<void> {
    let parsed: unknown = error.error;
    try {
      const text = await error.error.text();
      parsed = JSON.parse(text) as unknown;
    } catch {
      // A resposta não contém JSON legível; o fallback abaixo permanece seguro.
    }
    if (sequence !== this.generationSequence) return;
    this.generationError.set(
      this.reportError(
        new HttpErrorResponse({
          error: parsed,
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        }),
      ),
    );
  }

  private reportError(error: unknown): string {
    return extractError(error, 'Não foi possível gerar o relatório.');
  }

  private reportTitle(type: ReportType): string {
    return this.reports.find((report) => report.type === type)?.title ?? type;
  }

  private reportSlug(type: ReportType): string {
    const slugs: Record<ReportType, string> = {
      captations: 'captacoes',
      returns: 'retornos',
      'overdue-returns': 'retornos-em-atraso',
      'investor-positions': 'posicao-por-investidor',
    };
    return slugs[type];
  }

  private localDateToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
