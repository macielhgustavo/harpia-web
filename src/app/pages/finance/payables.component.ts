import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  HandCoins,
  History,
  LucideAngularModule,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { BankAccountListItem } from '../../core/models/bank-account.model';
import { CompanyListItem } from '../../core/models/company.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { CostCenter, FinancialCategory } from '../../core/models/finance.model';
import {
  Payable,
  PayablePage,
  PayablePayment,
  PayableStatus,
} from '../../core/models/payable.model';
import { Person } from '../../core/models/person.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { BankAccountService } from '../../core/services/bank-account.service';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { FinanceService } from '../../core/services/finance.service';
import { PayableService } from '../../core/services/payable.service';
import { PersonService } from '../../core/services/person.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_PAGE: PayablePage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};
const STATUS_LABELS: Record<PayableStatus, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado',
};

@Component({
  selector: 'app-payables',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    DialogFocusDirective,
    NgTemplateOutlet,
  ],
  templateUrl: './payables.component.html',
})
export class PayablesComponent implements OnInit {
  private readonly payables = inject(PayableService);
  private readonly finance = inject(FinanceService);
  private readonly companiesService = inject(CompanyService);
  private readonly developmentsService = inject(DevelopmentService);
  private readonly bankAccountsService = inject(BankAccountService);
  private readonly peopleService = inject(PersonService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private loadSequence = 0;

  readonly result = signal<PayablePage>(EMPTY_PAGE);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly bankAccounts = signal<BankAccountListItem[]>([]);
  readonly categories = signal<FinancialCategory[]>([]);
  readonly costCenters = signal<CostCenter[]>([]);
  readonly suppliers = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly optionsLoading = signal(true);
  readonly error = signal('');
  readonly optionsError = signal('');
  readonly search = signal('');
  readonly status = signal<PayableStatus | ''>('');
  readonly companyId = signal('');
  readonly developmentId = signal('');
  readonly categoryId = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly expandedId = signal<string | null>(null);
  readonly createOpen = signal(false);
  readonly paymentTarget = signal<Payable | null>(null);
  readonly reversalTarget = signal<{
    payable: Payable;
    payment: PayablePayment;
  } | null>(null);
  readonly cancelTarget = signal<Payable | null>(null);
  readonly submitting = signal(false);
  readonly actionError = signal('');

  description = '';
  dueDate = '';
  originalAmount = '';
  formCompanyId = '';
  formDevelopmentId = '';
  formCategoryId = '';
  formCostCenterId = '';
  formSupplierId = '';
  paymentAmount = '';
  paymentDate = this.today();
  paymentBankAccountId = '';
  paymentNotes = '';
  reversalReason = '';
  cancelReason = '';

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.FINANCE_WRITE,
  );
  readonly statusOptions = Object.entries(STATUS_LABELS).map(
    ([value, label]) => ({ value: value as PayableStatus, label }),
  );
  readonly SearchIcon = Search;
  readonly PayableIcon = HandCoins;
  readonly AddIcon = Plus;
  readonly RetryIcon = RefreshCw;
  readonly PreviousIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;
  readonly ExpandIcon = ChevronDown;
  readonly CollapseIcon = ChevronUp;
  readonly HistoryIcon = History;
  readonly ReverseIcon = RotateCcw;
  readonly CloseIcon = X;

  ngOnInit(): void {
    this.search.set(this.route.snapshot.queryParamMap.get('search') ?? '');
    this.loadOptions();
    this.load();
  }

  load(page = 1): void {
    if (
      this.startDate() &&
      this.endDate() &&
      this.startDate() > this.endDate()
    ) {
      this.error.set('A data inicial deve ser anterior à data final.');
      return;
    }
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.payables
      .list({
        page,
        pageSize: 20,
        search: this.search().trim(),
        status: this.status() || undefined,
        companyId: this.companyId(),
        developmentId: this.developmentId(),
        categoryId: this.categoryId(),
        startDate: this.startDate(),
        endDate: this.endDate(),
      })
      .subscribe({
        next: (result) => {
          if (sequence !== this.loadSequence) return;
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.loading.set(false);
          this.error.set(
            extractError(error, 'Não foi possível carregar as contas a pagar.'),
          );
        },
      });
  }

  loadOptions(): void {
    this.optionsLoading.set(true);
    forkJoin({
      companies: this.companiesService.list(),
      developments: this.developmentsService.list(),
      bankAccounts: this.bankAccountsService.list(),
      categories: this.finance.categories('DESPESA'),
      costCenters: this.finance.costCenters(),
      suppliers: this.peopleService.list('FORNECEDOR'),
    }).subscribe({
      next: (options) => {
        this.companies.set(options.companies);
        this.developments.set(options.developments);
        this.bankAccounts.set(options.bankAccounts);
        this.categories.set(options.categories);
        this.costCenters.set(options.costCenters);
        this.suppliers.set(options.suppliers);
        this.optionsLoading.set(false);
      },
      error: (error: unknown) => {
        this.optionsLoading.set(false);
        this.optionsError.set(
          extractError(
            error,
            'Os cadastros auxiliares não puderam ser carregados.',
          ),
        );
      },
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.companyId.set('');
    this.developmentId.set('');
    this.categoryId.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.load();
  }

  toggleHistory(payable: Payable): void {
    this.expandedId.set(this.expandedId() === payable.id ? null : payable.id);
  }

  openCreate(): void {
    this.description = '';
    this.dueDate = this.today();
    this.originalAmount = '';
    this.formCompanyId = '';
    this.formDevelopmentId = '';
    this.formCategoryId = '';
    this.formCostCenterId = '';
    this.formSupplierId = '';
    this.actionError.set('');
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (!this.submitting()) this.createOpen.set(false);
  }

  saveCreate(): void {
    const amount = Number(this.originalAmount.replace(',', '.'));
    if (
      !this.description.trim() ||
      !this.dueDate ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      this.actionError.set('Informe descrição, vencimento e valor válido.');
      return;
    }
    this.submitting.set(true);
    this.actionError.set('');
    this.payables
      .create({
        description: this.description.trim(),
        dueDate: this.dueDate,
        originalAmount: amount.toFixed(2),
        companyId: this.formCompanyId || undefined,
        developmentId: this.formDevelopmentId || undefined,
        categoryId: this.formCategoryId || undefined,
        costCenterId: this.formCostCenterId || undefined,
        supplierPersonId: this.formSupplierId || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.createOpen.set(false);
          this.load(1);
        },
        error: (error: unknown) => this.actionFailure(error),
      });
  }

  openPayment(payable: Payable): void {
    this.paymentTarget.set(payable);
    this.paymentAmount = Number(payable.balance).toFixed(2);
    this.paymentDate = this.today();
    this.paymentBankAccountId =
      payable.bankAccountId ??
      this.bankAccounts().find(
        ({ companyId }) => companyId === payable.companyId,
      )?.id ??
      '';
    this.paymentNotes = '';
    this.actionError.set('');
  }

  closePayment(): void {
    if (!this.submitting()) this.paymentTarget.set(null);
  }

  savePayment(): void {
    const target = this.paymentTarget();
    const amount = Number(this.paymentAmount);
    if (
      !target ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > Number(target.balance)
    ) {
      this.actionError.set('Informe um valor válido, limitado ao saldo.');
      return;
    }
    if (!this.paymentDate || !this.paymentBankAccountId) {
      this.actionError.set('Informe a data e a conta bancária do pagamento.');
      return;
    }
    this.submitting.set(true);
    this.actionError.set('');
    this.payables
      .recordPayment(target.id, {
        amount: amount.toFixed(2),
        paidAt: new Date(`${this.paymentDate}T00:00:00`).toISOString(),
        bankAccountId: this.paymentBankAccountId,
        notes: this.paymentNotes.trim() || undefined,
      })
      .subscribe({
        next: () => this.actionSuccess(),
        error: (error: unknown) => this.actionFailure(error),
      });
  }

  openReversal(payable: Payable, payment: PayablePayment): void {
    this.reversalTarget.set({ payable, payment });
    this.reversalReason = '';
    this.actionError.set('');
  }

  closeReversal(): void {
    if (!this.submitting()) this.reversalTarget.set(null);
  }

  saveReversal(): void {
    const target = this.reversalTarget();
    if (!target || this.reversalReason.trim().length < 3) {
      this.actionError.set('Informe o motivo do estorno.');
      return;
    }
    this.submitting.set(true);
    this.payables
      .reversePayment(target.payable.id, target.payment.id, {
        reason: this.reversalReason.trim(),
      })
      .subscribe({
        next: () => this.actionSuccess(),
        error: (error: unknown) => this.actionFailure(error),
      });
  }

  openCancel(payable: Payable): void {
    this.cancelTarget.set(payable);
    this.cancelReason = '';
    this.actionError.set('');
  }

  closeCancel(): void {
    if (!this.submitting()) this.cancelTarget.set(null);
  }

  saveCancel(): void {
    const target = this.cancelTarget();
    if (!target || this.cancelReason.trim().length < 3) {
      this.actionError.set('Informe o motivo do cancelamento.');
      return;
    }
    this.submitting.set(true);
    this.payables
      .cancel(target.id, this.cancelReason.trim())
      .subscribe({
        next: () => this.actionSuccess(),
        error: (error: unknown) => this.actionFailure(error),
      });
  }

  canCancel(payable: Payable): boolean {
    return (
      this.canWrite &&
      !payable.sourceType &&
      Number(payable.paidAmount) === 0 &&
      payable.status !== 'CANCELADO'
    );
  }

  statusLabel(status: PayableStatus): string {
    return STATUS_LABELS[status];
  }
  statusClass(status: PayableStatus): string {
    if (status === 'PAGO') return 'bg-emerald-50 text-emerald-800';
    if (status === 'PARCIAL') return 'bg-blue-50 text-blue-800';
    if (status === 'ATRASADO') return 'bg-red-50 text-red-800';
    if (status === 'CANCELADO') return 'bg-slate-100 text-slate-600';
    return 'bg-amber-50 text-amber-800';
  }
  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }
  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
      new Date(value),
    );
  }
  accountLabel(account: BankAccountListItem): string {
    return `${account.bank} · Ag. ${account.agency} · ${account.account}`;
  }

  private actionSuccess(): void {
    this.submitting.set(false);
    this.paymentTarget.set(null);
    this.reversalTarget.set(null);
    this.cancelTarget.set(null);
    this.load(this.result().pagination.page);
  }
  private actionFailure(error: unknown): void {
    this.submitting.set(false);
    this.actionError.set(
      extractError(error, 'Não foi possível concluir a operação.'),
    );
  }
  private today(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  }
}
