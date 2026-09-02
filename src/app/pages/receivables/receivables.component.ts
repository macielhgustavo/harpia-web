import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  History,
  LucideAngularModule,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { BankAccountListItem } from '../../core/models/bank-account.model';
import { CompanyListItem } from '../../core/models/company.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { Person } from '../../core/models/person.model';
import {
  Receivable,
  ReceivablePage,
  ReceivablePayment,
  ReceivableStatus,
} from '../../core/models/receivable.model';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { AuthorizationService } from '../../core/services/authorization.service';
import { BankAccountService } from '../../core/services/bank-account.service';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { ReceivableService } from '../../core/services/receivable.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_PAGE: ReceivablePage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  summary: {
    outstanding: '0',
    receivedInPeriod: '0',
    overdue: '0',
    dueNext30Days: '0',
    periodStart: '',
    periodEnd: '',
  },
};

const STATUS_LABELS: Record<ReceivableStatus, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado',
};

@Component({
  selector: 'app-receivables',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    DialogFocusDirective,
    NgTemplateOutlet,
  ],
  templateUrl: './receivables.component.html',
})
export class ReceivablesComponent implements OnInit {
  private readonly receivablesService = inject(ReceivableService);
  private readonly companyService = inject(CompanyService);
  private readonly bankAccountService = inject(BankAccountService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly personService = inject(PersonService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private loadSequence = 0;
  private focusReceivableId = '';

  readonly result = signal<ReceivablePage>(EMPTY_PAGE);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly bankAccounts = signal<BankAccountListItem[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly buyers = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly optionsLoading = signal(true);
  readonly error = signal('');
  readonly optionsError = signal('');
  readonly search = signal('');
  readonly status = signal<ReceivableStatus | ''>('');
  readonly companyId = signal('');
  readonly bankAccountId = signal('');
  readonly developmentId = signal('');
  readonly buyerId = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly saleId = signal('');
  readonly expandedId = signal<string | null>(null);
  readonly paymentTarget = signal<Receivable | null>(null);
  readonly reversalTarget = signal<{
    receivable: Receivable;
    payment: ReceivablePayment;
  } | null>(null);
  readonly cancelTarget = signal<Receivable | null>(null);
  readonly submitting = signal(false);
  readonly actionError = signal('');
  readonly paymentAmount = signal('');
  readonly paymentDate = signal(this.today());
  readonly paymentBankAccountId = signal('');
  readonly paymentNotes = signal('');
  readonly reversalReason = signal('');
  readonly cancelReason = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.FINANCE_WRITE,
  );
  readonly statusOptions = Object.entries(STATUS_LABELS).map(
    ([value, label]) => ({ value: value as ReceivableStatus, label }),
  );

  readonly SearchIcon = Search;
  readonly MoneyIcon = CircleDollarSign;
  readonly ReceivedIcon = CheckCircle2;
  readonly OverdueIcon = CalendarClock;
  readonly NextDueIcon = Banknote;
  readonly RetryIcon = RefreshCw;
  readonly PreviousIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;
  readonly ExpandIcon = ChevronDown;
  readonly CollapseIcon = ChevronUp;
  readonly HistoryIcon = History;
  readonly ReverseIcon = RotateCcw;
  readonly CloseIcon = X;

  ngOnInit(): void {
    this.saleId.set(this.route.snapshot.queryParamMap.get('saleId') ?? '');
    this.focusReceivableId =
      this.route.snapshot.queryParamMap.get('receivableId') ?? '';
    this.loadOptions();
    this.load(1);
  }

  load(page = 1): void {
    if (
      this.startDate() &&
      this.endDate() &&
      this.startDate() > this.endDate()
    ) {
      this.error.set('A data inicial deve ser anterior ou igual à data final.');
      return;
    }

    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.receivablesService
      .list({
        search: this.search().trim(),
        status: this.status() || undefined,
        companyId: this.companyId(),
        developmentId: this.developmentId(),
        buyerId: this.buyerId(),
        bankAccountId: this.bankAccountId(),
        startDate: this.startDate(),
        endDate: this.endDate(),
        saleId: this.saleId(),
        page,
        pageSize: 20,
      })
      .subscribe({
        next: (result) => {
          if (sequence !== this.loadSequence) return;
          this.result.set(result);
          this.loading.set(false);
          if (
            this.focusReceivableId &&
            result.data.some(({ id }) => id === this.focusReceivableId)
          ) {
            this.expandedId.set(this.focusReceivableId);
            this.focusReceivableId = '';
          }
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.loading.set(false);
          this.error.set(
            extractError(
              error,
              'Não foi possível carregar as contas a receber.',
            ),
          );
        },
      });
  }

  loadOptions(): void {
    this.optionsLoading.set(true);
    this.optionsError.set('');
    forkJoin({
      companies: this.companyService.list(),
      bankAccounts: this.bankAccountService.list(),
      developments: this.developmentService.list(),
      buyers: this.personService.list('CLIENTE'),
    }).subscribe({
      next: ({ companies, bankAccounts, developments, buyers }) => {
        this.companies.set(companies);
        this.bankAccounts.set(bankAccounts);
        this.developments.set(developments);
        this.buyers.set(buyers);
        this.optionsLoading.set(false);
      },
      error: (error: unknown) => {
        this.optionsLoading.set(false);
        this.optionsError.set(
          extractError(
            error,
            'Empresas e contas bancárias não puderam ser carregadas.',
          ),
        );
      },
    });
  }

  applyFilters(): void {
    this.load(1);
  }

  resetFilters(): void {
    this.search.set('');
    this.status.set('');
    this.companyId.set('');
    this.bankAccountId.set('');
    this.developmentId.set('');
    this.buyerId.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.saleId.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    this.load(1);
  }

  toggleHistory(receivable: Receivable): void {
    this.expandedId.set(
      this.expandedId() === receivable.id ? null : receivable.id,
    );
  }

  openPayment(receivable: Receivable): void {
    this.actionError.set('');
    this.paymentTarget.set(receivable);
    this.paymentAmount.set(Number(receivable.balance).toFixed(2));
    this.paymentDate.set(this.today());
    this.paymentBankAccountId.set(
      receivable.bankAccountId ?? this.preferredBankAccount(receivable),
    );
    this.paymentNotes.set('');
  }

  closePayment(): void {
    if (this.submitting()) return;
    this.paymentTarget.set(null);
    this.actionError.set('');
  }

  submitPayment(): void {
    const target = this.paymentTarget();
    const amount = Number(this.paymentAmount());
    if (!target) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      this.actionError.set('Informe um valor de pagamento maior que zero.');
      return;
    }
    if (amount > Number(target.balance) + 0.0001) {
      this.actionError.set('O pagamento não pode ser maior que o saldo.');
      return;
    }
    if (!this.paymentDate()) {
      this.actionError.set('Informe a data do pagamento.');
      return;
    }
    if (!this.paymentBankAccountId()) {
      this.actionError.set('Selecione a conta bancária do recebimento.');
      return;
    }

    this.submitting.set(true);
    this.actionError.set('');
    this.receivablesService
      .recordPayment(target.id, {
        amount: amount.toFixed(2),
        paidAt: new Date(`${this.paymentDate()}T00:00:00`).toISOString(),
        bankAccountId: this.paymentBankAccountId(),
        notes: this.paymentNotes().trim() || undefined,
      })
      .subscribe({
        next: () => this.finishAction(),
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  openReversal(receivable: Receivable, payment: ReceivablePayment): void {
    this.actionError.set('');
    this.reversalReason.set('');
    this.reversalTarget.set({ receivable, payment });
  }

  closeReversal(): void {
    if (this.submitting()) return;
    this.reversalTarget.set(null);
    this.actionError.set('');
  }

  submitReversal(): void {
    const target = this.reversalTarget();
    const reason = this.reversalReason().trim();
    if (!target) return;
    if (reason.length < 3) {
      this.actionError.set('Informe o motivo da reversão.');
      return;
    }

    this.submitting.set(true);
    this.actionError.set('');
    this.receivablesService
      .reversePayment(target.receivable.id, target.payment.id, { reason })
      .subscribe({
        next: () => this.finishAction(),
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  openCancel(receivable: Receivable): void {
    this.actionError.set('');
    this.cancelReason.set('');
    this.cancelTarget.set(receivable);
  }

  closeCancel(): void {
    if (this.submitting()) return;
    this.cancelTarget.set(null);
    this.actionError.set('');
  }

  submitCancel(): void {
    const target = this.cancelTarget();
    const reason = this.cancelReason().trim();
    if (!target) return;
    if (reason.length < 3) {
      this.actionError.set('Informe o motivo do cancelamento.');
      return;
    }

    this.submitting.set(true);
    this.actionError.set('');
    this.receivablesService.cancel(target.id, { reason }).subscribe({
      next: () => this.finishAction(),
      error: (error: unknown) => this.handleActionError(error),
    });
  }

  openSale(receivable: Receivable): void {
    if (receivable.saleId) {
      void this.router.navigate(['/sales', receivable.saleId]);
    }
  }

  statusLabel(status: ReceivableStatus): string {
    return STATUS_LABELS[status];
  }

  statusClass(status: ReceivableStatus): string {
    if (status === 'PAGO') return 'bg-emerald-50 text-emerald-800';
    if (status === 'PARCIAL') return 'bg-blue-50 text-blue-800';
    if (status === 'ATRASADO') return 'bg-red-50 text-red-800';
    if (status === 'CANCELADO') return 'bg-slate-100 text-slate-600';
    return 'bg-amber-50 text-amber-800';
  }

  primaryBuyer(receivable: Receivable): string {
    return (
      receivable.sale?.buyers.find(({ isPrimary }) => isPrimary)?.person.name ??
      'Não informado'
    );
  }

  installmentLabel(receivable: Receivable): string {
    return `${receivable.description} · ${receivable.sourceSequence}`;
  }

  canCancel(receivable: Receivable): boolean {
    return (
      this.canWrite &&
      Number(receivable.paidAmount) === 0 &&
      receivable.status !== 'CANCELADO'
    );
  }

  accountLabel(account: BankAccountListItem): string {
    return `${account.bank} · Ag. ${account.agency} · ${account.account}`;
  }

  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
      new Date(value),
    );
  }

  private preferredBankAccount(receivable: Receivable): string {
    return (
      this.bankAccounts().find(
        ({ companyId }) => companyId === receivable.companyId,
      )?.id ?? ''
    );
  }

  private finishAction(): void {
    this.submitting.set(false);
    this.paymentTarget.set(null);
    this.reversalTarget.set(null);
    this.cancelTarget.set(null);
    this.actionError.set('');
    this.load(this.result().pagination.page);
  }

  private handleActionError(error: unknown): void {
    this.submitting.set(false);
    const status = (error as { status?: number })?.status;
    if (status === 404) {
      this.paymentTarget.set(null);
      this.reversalTarget.set(null);
      this.cancelTarget.set(null);
      this.load(this.result().pagination.page);
      this.error.set(
        'O lançamento mudou ou não existe mais. A lista foi atualizada.',
      );
      return;
    }
    this.actionError.set(
      extractError(error, 'Não foi possível concluir a operação financeira.'),
    );
  }

  private today(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
