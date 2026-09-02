import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Landmark,
  LucideAngularModule,
  RefreshCw,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { CompanyListItem } from '../../core/models/company.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import {
  CashFlowGroup,
  CashFlowMode,
  CashFlowResult,
  CostCenter,
} from '../../core/models/finance.model';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { FinanceService } from '../../core/services/finance.service';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './cash-flow.component.html',
})
export class CashFlowComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly companiesService = inject(CompanyService);
  private readonly developmentsService = inject(DevelopmentService);

  readonly result = signal<CashFlowResult | null>(null);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly costCenters = signal<CostCenter[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly startDate = signal(this.relativeDate(-30));
  readonly endDate = signal(this.relativeDate(90));
  readonly companyId = signal('');
  readonly developmentId = signal('');
  readonly costCenterId = signal('');
  readonly mode = signal<CashFlowMode>('CONSOLIDADO');
  readonly groupBy = signal<CashFlowGroup>('SEMANA');

  readonly InflowIcon = ArrowUpRight;
  readonly OutflowIcon = ArrowDownRight;
  readonly BalanceIcon = Landmark;
  readonly DateIcon = CalendarRange;
  readonly RetryIcon = RefreshCw;

  ngOnInit(): void {
    forkJoin({
      companies: this.companiesService.list(),
      developments: this.developmentsService.list(),
      costCenters: this.finance.costCenters(),
    }).subscribe({
      next: ({ companies, developments, costCenters }) => {
        this.companies.set(companies);
        this.developments.set(developments);
        this.costCenters.set(costCenters);
      },
    });
    this.load();
  }

  load(): void {
    if (this.startDate() > this.endDate()) {
      this.error.set('A data inicial deve ser anterior à data final.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.finance
      .cashFlow({
        startDate: this.startDate(),
        endDate: this.endDate(),
        companyId: this.companyId(),
        developmentId: this.developmentId(),
        costCenterId: this.costCenterId(),
        mode: this.mode(),
        groupBy: this.groupBy(),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(
            extractError(error, 'Não foi possível calcular o fluxo de caixa.'),
          );
        },
      });
  }

  clear(): void {
    this.startDate.set(this.relativeDate(-30));
    this.endDate.set(this.relativeDate(90));
    this.companyId.set('');
    this.developmentId.set('');
    this.costCenterId.set('');
    this.mode.set('CONSOLIDADO');
    this.groupBy.set('SEMANA');
    this.load();
  }

  total(field: 'inflows' | 'outflows'): number {
    return (
      this.result()?.data.reduce((sum, row) => sum + Number(row[field]), 0) ?? 0
    );
  }

  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }

  formatDate(value: string): string {
    const options: Intl.DateTimeFormatOptions =
      this.groupBy() === 'MES'
        ? { month: 'short', year: 'numeric' }
        : { dateStyle: 'short' };
    return new Intl.DateTimeFormat('pt-BR', options).format(
      new Date(`${value.slice(0, 10)}T12:00:00`),
    );
  }

  valueClass(value: string | number): string {
    return Number(value) >= 0 ? 'text-emerald-800' : 'text-red-800';
  }

  private relativeDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
