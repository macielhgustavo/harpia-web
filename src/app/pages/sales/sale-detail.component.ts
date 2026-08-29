import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  Download,
  FileText,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { Person } from '../../core/models/person.model';
import { ProposalPaymentConditionType } from '../../core/models/proposal.model';
import {
  SaleCommissionStatus,
  SaleDetail,
  SaleStatus,
} from '../../core/models/sale.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DocumentService } from '../../core/services/document.service';
import { PersonService } from '../../core/services/person.service';
import { SaleService } from '../../core/services/sale.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { filenameFromContentDisposition } from '../../shared/utils/file-download';
import { extractError } from '../../shared/utils/http-error';

const STATUS_LABELS: Record<SaleStatus, string> = {
  ATIVA: 'Ativa',
  QUITADA: 'Quitada',
  CANCELADA: 'Cancelada',
  DISTRATADA: 'Distratada',
};

const CONDITION_LABELS: Record<ProposalPaymentConditionType, string> = {
  ENTRADA: 'Entrada',
  PARCELAS: 'Parcelas',
  SALDO_CHAVES: 'Saldo nas chaves',
  FINANCIAMENTO: 'Financiamento',
  OUTRO: 'Outro',
};

const COMMISSION_LABELS: Record<SaleCommissionStatus, string> = {
  PREVISTA: 'Prevista',
  DEVIDA: 'Devida',
  PAGA: 'Paga',
  CANCELADA: 'Cancelada',
};

@Component({
  selector: 'app-sale-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, DialogFocusDirective],
  templateUrl: './sale-detail.component.html',
})
export class SaleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SaleService);
  private readonly peopleService = inject(PersonService);
  private readonly documentsService = inject(DocumentService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;

  readonly sale = signal<SaleDetail | null>(null);
  readonly people = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly actionError = signal('');
  readonly editOpen = signal(false);
  readonly commissionOpen = signal(false);
  readonly saving = signal(false);
  readonly downloadingId = signal('');
  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.SALES_WRITE,
  );

  editSaleNumber = '';
  editSaleDate = '';
  editNotes = '';
  commissionPersonId = '';
  commissionAmount = '';
  commissionPercentage = '';
  commissionNotes = '';

  readonly BackIcon = ArrowLeft;
  readonly EditIcon = Pencil;
  readonly AddIcon = Plus;
  readonly DownloadIcon = Download;
  readonly DocumentIcon = FileText;
  readonly RetryIcon = RefreshCw;
  readonly CloseIcon = X;

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('feedback') === 'created') {
      this.feedback.set('Venda formalizada com sucesso.');
    }
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Venda inválida.');
      this.loading.set(false);
      return;
    }
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.salesService.getById(id).subscribe({
      next: (sale) => {
        if (sequence !== this.loadSequence) return;
        this.sale.set(sale);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.error.set('Venda não encontrada.');
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível carregar a venda.'),
        );
      },
    });
  }

  openEdit(): void {
    const sale = this.sale();
    if (!sale || !this.canWrite) return;
    this.actionError.set('');
    this.editSaleNumber = sale.saleNumber;
    this.editSaleDate = sale.saleDate.slice(0, 10);
    this.editNotes = sale.notes ?? '';
    this.editOpen.set(true);
  }

  closeEdit(): void {
    if (!this.saving()) this.editOpen.set(false);
  }

  saveEdit(): void {
    const sale = this.sale();
    if (
      !sale ||
      this.saving() ||
      !this.editSaleNumber.trim() ||
      !this.editSaleDate
    )
      return;
    this.saving.set(true);
    this.actionError.set('');
    this.salesService
      .update(sale.id, {
        saleNumber: this.editSaleNumber.trim(),
        saleDate: this.editSaleDate,
        notes: this.editNotes.trim(),
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editOpen.set(false);
          this.sale.set(updated);
          this.feedback.set('Venda atualizada com sucesso.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          if ((error as HttpErrorResponse).status === 404) {
            this.editOpen.set(false);
            this.load();
          }
          this.actionError.set(
            extractError(error, 'Não foi possível atualizar a venda.'),
          );
        },
      });
  }

  openCommission(): void {
    if (!this.canWrite) return;
    this.actionError.set('');
    this.commissionPersonId = '';
    this.commissionAmount = '';
    this.commissionPercentage = '';
    this.commissionNotes = '';
    this.commissionOpen.set(true);
    if (this.people().length === 0) {
      this.peopleService.list().subscribe({
        next: (people) => this.people.set(people),
        error: (error: unknown) =>
          this.actionError.set(
            extractError(error, 'Não foi possível carregar os beneficiários.'),
          ),
      });
    }
  }

  closeCommission(): void {
    if (!this.saving()) this.commissionOpen.set(false);
  }

  saveCommission(): void {
    const sale = this.sale();
    const amount = this.moneyInput(this.commissionAmount);
    const percentage = this.moneyInput(this.commissionPercentage);
    if (
      !sale ||
      this.saving() ||
      !this.commissionPersonId ||
      Number(amount) < 0 ||
      (this.commissionPercentage.trim() &&
        (Number(percentage) <= 0 || Number(percentage) > 100))
    ) {
      this.actionError.set('Informe o beneficiário e um valor válido.');
      return;
    }
    this.saving.set(true);
    this.actionError.set('');
    this.salesService
      .addCommission(sale.id, {
        personId: this.commissionPersonId,
        amount,
        ...(this.commissionPercentage.trim() ? { percentage } : {}),
        ...(this.commissionNotes.trim()
          ? { notes: this.commissionNotes.trim() }
          : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.commissionOpen.set(false);
          this.feedback.set('Comissão adicionada com sucesso.');
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.actionError.set(
            extractError(error, 'Não foi possível adicionar a comissão.'),
          );
        },
      });
  }

  download(document: SaleDetail['documents'][number]): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(document.id);
    this.actionError.set('');
    this.documentsService.download(document.id).subscribe({
      next: (response) => {
        this.downloadingId.set('');
        const url = URL.createObjectURL(response.body ?? new Blob());
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = filenameFromContentDisposition(
          response.headers.get('content-disposition'),
          document.originalName,
        );
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.downloadingId.set('');
        this.actionError.set(
          extractError(error, 'Não foi possível baixar o documento.'),
        );
      },
    });
  }

  back(): void {
    void this.router.navigate(['/sales']);
  }

  statusLabel(status: SaleStatus): string {
    return STATUS_LABELS[status];
  }
  statusClass(status: SaleStatus): string {
    if (status === 'ATIVA') return 'bg-emerald-50 text-emerald-800';
    if (status === 'QUITADA') return 'bg-blue-50 text-blue-800';
    return 'bg-red-50 text-red-700';
  }
  conditionLabel(type: ProposalPaymentConditionType): string {
    return CONDITION_LABELS[type];
  }
  commissionLabel(status: SaleCommissionStatus): string {
    return COMMISSION_LABELS[status];
  }
  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }
  formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(value),
        )
      : 'Não informada';
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  beneficiaryName(
    person: { name: string } | null,
    user: { name: string } | null,
  ): string {
    return person?.name ?? user?.name ?? 'Não informado';
  }
  auditLabel(action: string): string {
    return (
      (
        {
          SALE_CREATED: 'Venda criada',
          SALE_UPDATED: 'Venda atualizada',
          SALE_BUYER_ADDED: 'Comprador adicionado',
          SALE_COMMISSION_CREATED: 'Comissão criada',
        } as Record<string, string>
      )[action] ?? action
    );
  }

  private moneyInput(value: string): string {
    const normalized = value
      .trim()
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number.toFixed(2) : '-1';
  }
}
