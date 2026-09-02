import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { AllocationListItem } from '../../core/models/allocation.model';
import { InvestmentListItem } from '../../core/models/investment.model';
import {
  Return,
  ReturnListItem,
  ReturnStatus,
} from '../../core/models/return.model';
import { AllocationService } from '../../core/services/allocation.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InvestmentService } from '../../core/services/investment.service';
import { ReturnService } from '../../core/services/return.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { formatDate } from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';
import {
  ReturnAllocationOption,
  ReturnFormModalComponent,
  ReturnFormMode,
} from './return-form-modal.component';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [
    DialogFocusDirective,
    FormsModule,
    LucideAngularModule,
    ReturnFormModalComponent,
    RouterLink,
  ],
  templateUrl: './returns.component.html',
})
export class ReturnsComponent implements OnInit {
  private readonly returnService = inject(ReturnService);
  private readonly allocationService = inject(AllocationService);
  private readonly investmentService = inject(InvestmentService);
  private readonly authorization = inject(AuthorizationService);
  private readonly router = inject(Router);
  private loadSequence = 0;

  readonly returns = signal<ReturnListItem[]>([]);
  readonly allocations = signal<AllocationListItem[]>([]);
  readonly investments = signal<InvestmentListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly optionsLoading = signal(false);
  readonly optionsError = signal('');
  readonly feedback = signal('');
  readonly search = signal('');
  readonly investorFilter = signal('');
  readonly statusFilter = signal<ReturnStatus | ''>('');
  readonly destinationFilter = signal('');
  readonly formOpen = signal(false);
  readonly formMode = signal<ReturnFormMode>('create');
  readonly selectedReturn = signal<ReturnListItem | null>(null);
  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.RETURNS_WRITE,
  );
  readonly canFinanceWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.FINANCE_WRITE,
  );
  readonly formatCurrency = formatBrl;
  readonly formatDate = formatDate;
  readonly statusOptions: ReadonlyArray<{
    value: ReturnStatus;
    label: string;
  }> = [
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'ATRASADO', label: 'Atrasado' },
    { value: 'PAGO', label: 'Pago' },
  ];

  readonly AddIcon = Plus;
  readonly SearchIcon = Search;
  readonly PaidIcon = CheckCircle2;
  readonly PendingIcon = Clock3;
  readonly MoneyIcon = Coins;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly RetryIcon = RefreshCw;
  readonly WarningIcon = AlertTriangle;
  readonly CloseIcon = X;

  readonly investors = computed(() => {
    const map = new Map<string, string>();
    for (const item of this.returns()) {
      map.set(
        item.allocation.investment.investor.id,
        item.allocation.investment.investor.name,
      );
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  readonly filteredReturns = computed(() => {
    const query = this.normalize(this.search());
    return this.returns().filter((item) => {
      const investor = item.allocation.investment.investor;
      const destination = item.allocation.development?.name ?? 'Caixa geral';
      if (this.investorFilter() && investor.id !== this.investorFilter()) {
        return false;
      }
      if (this.statusFilter() && item.status !== this.statusFilter()) {
        return false;
      }
      if (
        this.destinationFilter() === 'DEVELOPMENT' &&
        !item.allocation.development
      ) {
        return false;
      }
      if (
        this.destinationFilter() === 'GENERAL' &&
        item.allocation.development
      ) {
        return false;
      }
      return (
        !query ||
        this.normalize(investor.name).includes(query) ||
        this.normalize(destination).includes(query)
      );
    });
  });

  readonly expectedTotal = computed(() =>
    this.returns().reduce((sum, item) => sum + item.expectedAmount, 0),
  );
  readonly paidTotal = computed(() =>
    this.returns()
      .filter((item) => item.status === 'PAGO')
      .reduce((sum, item) => sum + (item.realizedAmount ?? 0), 0),
  );
  readonly pendingTotal = computed(() =>
    this.returns()
      .filter((item) => item.status === 'PENDENTE')
      .reduce((sum, item) => sum + item.expectedAmount, 0),
  );
  readonly overdueTotal = computed(() =>
    this.returns()
      .filter((item) => item.status === 'ATRASADO')
      .reduce((sum, item) => sum + item.expectedAmount, 0),
  );

  readonly allocationOptions = computed<ReturnAllocationOption[]>(() => {
    const investors = new Map(
      this.investments().map((item) => [item.id, item.investor.name]),
    );
    return this.allocations()
      .map((allocation) => ({
        id: allocation.id,
        label: `${investors.get(allocation.investmentId) ?? 'Investidor'} — ${
          allocation.development?.name ?? 'Caixa geral'
        } — ${formatBrl(allocation.amount)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  });

  ngOnInit(): void {
    this.loadReturns();
    if (this.canWrite) this.loadOptions();
  }

  loadReturns(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.returnService.list().subscribe({
      next: (returns) => {
        if (sequence !== this.loadSequence) return;
        this.returns.set(returns);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar os retornos.'),
        );
      },
    });
  }

  loadOptions(): void {
    if (!this.canWrite || this.optionsLoading()) return;
    this.optionsLoading.set(true);
    this.optionsError.set('');
    forkJoin({
      allocations: this.allocationService.list(),
      investments: this.investmentService.list(),
    }).subscribe({
      next: ({ allocations, investments }) => {
        this.allocations.set(allocations);
        this.investments.set(investments);
        this.optionsLoading.set(false);
      },
      error: (error: unknown) => {
        this.optionsLoading.set(false);
        this.optionsError.set(
          extractError(
            error,
            'Não foi possível carregar as alocações disponíveis.',
          ),
        );
      },
    });
  }

  resetFilters(): void {
    this.search.set('');
    this.investorFilter.set('');
    this.statusFilter.set('');
    this.destinationFilter.set('');
  }

  openCreate(): void {
    if (
      !this.canWrite ||
      this.optionsLoading() ||
      !!this.optionsError() ||
      this.allocationOptions().length === 0
    ) {
      return;
    }
    this.selectedReturn.set(null);
    this.formMode.set('create');
    this.formOpen.set(true);
  }

  openEdit(item: ReturnListItem): void {
    if (!this.canWrite) return;
    this.selectedReturn.set(item);
    this.formMode.set('edit');
    this.formOpen.set(true);
  }

  openPayment(item: ReturnListItem): void {
    if (!this.canFinanceWrite || item.status === 'PAGO') return;
    void this.router.navigate(['/finance/payables'], {
      queryParams: { search: item.allocation.investment.investor.name },
    });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.selectedReturn.set(null);
  }

  onSaved(_: Return): void {
    const mode = this.formMode();
    this.closeForm();
    this.feedback.set(
      mode === 'pay'
        ? 'Pagamento registrado com sucesso.'
        : mode === 'create'
          ? 'Retorno programado com sucesso.'
          : 'Retorno atualizado com sucesso.',
    );
    this.loadReturns();
  }

  onStale(): void {
    this.closeForm();
    this.feedback.set('O retorno não existe mais. A lista foi atualizada.');
    this.loadReturns();
  }

  requestDelete(item: ReturnListItem): void {
    if (!this.canWrite) return;
    this.selectedReturn.set(item);
    this.deleteError.set('');
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteOpen.set(false);
    this.deleteError.set('');
    this.selectedReturn.set(null);
  }

  confirmDelete(): void {
    const item = this.selectedReturn();
    if (!this.canWrite || !item || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.returnService.remove(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.selectedReturn.set(null);
        this.feedback.set('Retorno excluído com sucesso.');
        this.loadReturns();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.deleteOpen.set(false);
          this.selectedReturn.set(null);
          this.feedback.set(
            'O retorno não existe mais. A lista foi atualizada.',
          );
          this.loadReturns();
          return;
        }
        this.deleteError.set(
          extractError(error, 'Não foi possível excluir o retorno.'),
        );
      },
    });
  }

  destination(item: ReturnListItem): string {
    return item.allocation.development?.name ?? 'Caixa geral';
  }

  statusLabel(status: ReturnStatus): string {
    return (
      this.statusOptions.find((option) => option.value === status)?.label ??
      status
    );
  }

  statusBadge(status: ReturnStatus): string {
    if (status === 'PAGO') return 'bg-green-100 text-green-800';
    if (status === 'ATRASADO') return 'bg-red-100 text-red-800';
    return 'bg-amber-100 text-amber-900';
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }
}
