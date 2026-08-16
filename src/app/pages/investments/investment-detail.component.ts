import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Allocation,
  AllocationDetail,
  AllocationWithDevelopment,
} from '../../core/models/allocation.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import {
  Investment,
  InvestmentDetail,
} from '../../core/models/investment.model';
import { Return } from '../../core/models/return.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { AllocationService } from '../../core/services/allocation.service';
import { DevelopmentService } from '../../core/services/development.service';
import { InvestmentService } from '../../core/services/investment.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { formatDate } from '../../shared/utils/development';
import {
  investmentTypeLabel,
  isReturnOverdue,
} from '../../shared/utils/investment';
import { extractError } from '../../shared/utils/http-error';
import { InvestmentFormModalComponent } from './investment-form-modal.component';
import { AllocationFormModalComponent } from './allocation-form-modal.component';

@Component({
  selector: 'app-investment-detail',
  standalone: true,
  imports: [
    DialogFocusDirective,
    AllocationFormModalComponent,
    InvestmentFormModalComponent,
    LucideAngularModule,
    RouterLink,
  ],
  templateUrl: './investment-detail.component.html',
})
export class InvestmentDetailComponent implements OnInit {
  private readonly investmentService = inject(InvestmentService);
  private readonly allocationService = inject(AllocationService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private loadSequence = 0;
  private investmentId = '';
  private focusAllocationsAfterLoad = false;

  @ViewChild('allocationsHeading')
  private allocationsHeading?: ElementRef<HTMLElement>;

  readonly investment = signal<InvestmentDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly formOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly developmentsLoading = signal(false);
  readonly developmentsError = signal('');
  readonly allocationFormOpen = signal(false);
  readonly selectedAllocation = signal<AllocationDetail | null>(null);
  readonly allocationDeleteOpen = signal(false);
  readonly allocationDeleting = signal(false);
  readonly allocationDeleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.INVESTMENTS_WRITE,
  );
  readonly formatCurrency = formatBrl;
  readonly formatDate = formatDate;
  readonly typeLabel = investmentTypeLabel;

  readonly BackIcon = ArrowLeft;
  readonly EditIcon = Pencil;
  readonly AddIcon = Plus;
  readonly DeleteIcon = Trash2;
  readonly MoneyIcon = CircleDollarSign;
  readonly WalletIcon = WalletCards;
  readonly DateIcon = CalendarDays;
  readonly InvestorIcon = UserRound;
  readonly WarningIcon = AlertTriangle;
  readonly RetryIcon = RefreshCw;
  readonly CloseIcon = X;

  readonly returns = computed(() =>
    (this.investment()?.allocations ?? []).flatMap(
      (allocation) => allocation.returns,
    ),
  );
  readonly expectedReturns = computed(() =>
    this.returns().reduce((sum, item) => sum + item.expectedAmount, 0),
  );
  readonly realizedReturns = computed(() =>
    this.returns().reduce((sum, item) => sum + (item.realizedAmount ?? 0), 0),
  );
  readonly allocatedTotal = computed(() =>
    (this.investment()?.allocations ?? []).reduce(
      (sum, allocation) => sum + allocation.amount,
      0,
    ),
  );
  readonly availableAmount = computed(() =>
    Math.max(0, (this.investment()?.amount ?? 0) - this.allocatedTotal()),
  );

  ngOnInit(): void {
    this.investmentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.investmentId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadInvestment();
    if (this.canWrite) this.loadDevelopments();
  }

  loadInvestment(silent = false): void {
    const sequence = ++this.loadSequence;
    if (!silent) {
      this.loading.set(true);
      this.error.set('');
      this.notFound.set(false);
    }
    this.investmentService.getById(this.investmentId).subscribe({
      next: (investment) => {
        if (sequence !== this.loadSequence) return;
        this.investment.set(investment);
        this.loading.set(false);
        this.restoreAllocationFocus();
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        if (silent) {
          this.feedback.set(
            extractError(
              error,
              'A alteração foi concluída, mas não foi possível atualizar o resumo.',
            ),
          );
          this.restoreAllocationFocus();
          return;
        }
        this.loading.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.notFound.set(true);
          this.investment.set(null);
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível carregar o investimento.'),
        );
      },
    });
  }

  loadDevelopments(): void {
    if (!this.canWrite || this.developmentsLoading()) return;
    this.developmentsLoading.set(true);
    this.developmentsError.set('');
    this.developmentService.list().subscribe({
      next: (developments) => {
        this.developments.set(developments);
        this.developmentsLoading.set(false);
      },
      error: (error: unknown) => {
        this.developmentsLoading.set(false);
        this.developmentsError.set(
          extractError(
            error,
            'Não foi possível carregar os empreendimentos disponíveis.',
          ),
        );
      },
    });
  }

  openEdit(): void {
    if (!this.canWrite || !this.investment()) return;
    this.feedback.set('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onSaved(_: Investment): void {
    this.closeForm();
    this.feedback.set('Investimento atualizado com sucesso.');
    this.loadInvestment();
  }

  onStale(): void {
    this.closeForm();
    this.notFound.set(true);
    this.investment.set(null);
  }

  openCreateAllocation(): void {
    if (
      !this.canWrite ||
      !this.investment() ||
      this.developmentsLoading() ||
      !!this.developmentsError() ||
      this.availableAmount() <= 0
    ) {
      return;
    }
    this.selectedAllocation.set(null);
    this.allocationFormOpen.set(true);
  }

  openEditAllocation(allocation: AllocationDetail): void {
    if (
      !this.canWrite ||
      this.developmentsLoading() ||
      !!this.developmentsError()
    ) {
      return;
    }
    this.selectedAllocation.set(allocation);
    this.allocationFormOpen.set(true);
  }

  closeAllocationForm(): void {
    this.allocationFormOpen.set(false);
    this.selectedAllocation.set(null);
  }

  onAllocationSaved(_: AllocationWithDevelopment): void {
    const wasEditing = !!this.selectedAllocation();
    this.closeAllocationForm();
    this.feedback.set(
      wasEditing
        ? 'Alocação atualizada com sucesso.'
        : 'Alocação criada com sucesso.',
    );
    this.refreshAfterAllocationChange();
  }

  onAllocationStale(): void {
    this.closeAllocationForm();
    this.feedback.set(
      'A alocação não existe mais. Os dados serão atualizados.',
    );
    this.refreshAfterAllocationChange();
  }

  requestAllocationDelete(allocation: AllocationDetail): void {
    if (!this.canWrite || this.allocationDeleting()) return;
    this.selectedAllocation.set(allocation);
    this.allocationDeleteError.set('');
    this.allocationDeleteOpen.set(true);
  }

  closeAllocationDelete(): void {
    if (this.allocationDeleting()) return;
    this.allocationDeleteOpen.set(false);
    this.allocationDeleteError.set('');
    this.selectedAllocation.set(null);
  }

  confirmAllocationDelete(): void {
    const allocation = this.selectedAllocation();
    if (
      !this.canWrite ||
      !allocation ||
      !this.allocationDeleteOpen() ||
      this.allocationDeleting()
    ) {
      return;
    }
    this.allocationDeleting.set(true);
    this.allocationDeleteError.set('');
    this.allocationService.remove(allocation.id).subscribe({
      next: (_: Allocation) => {
        this.allocationDeleting.set(false);
        this.allocationDeleteOpen.set(false);
        this.selectedAllocation.set(null);
        this.feedback.set('Alocação excluída com sucesso.');
        this.refreshAfterAllocationChange();
      },
      error: (error: unknown) => {
        this.allocationDeleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.allocationDeleteOpen.set(false);
          this.selectedAllocation.set(null);
          this.feedback.set(
            'A alocação não existe mais. Os dados serão atualizados.',
          );
          this.refreshAfterAllocationChange();
          return;
        }
        this.allocationDeleteError.set(
          extractError(error, 'Não foi possível excluir a alocação.'),
        );
      },
    });
  }

  requestDelete(): void {
    if (!this.canWrite || !this.investment()) return;
    this.deleteError.set('');
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteOpen.set(false);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    if (!this.canWrite || !this.deleteOpen() || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.investmentService.remove(this.investmentId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        void this.router.navigate(['/investments'], {
          queryParams: { feedback: 'removed' },
        });
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.deleteOpen.set(false);
          this.notFound.set(true);
          this.investment.set(null);
          return;
        }
        this.deleteError.set(
          extractError(error, 'Não foi possível remover o investimento.'),
        );
      },
    });
  }

  allocationDestination(allocation: AllocationDetail): string {
    return allocation.development?.name ?? 'Caixa geral';
  }

  allocationPercentage(allocation: AllocationDetail): number {
    const total = this.investment()?.amount ?? 0;
    return total > 0 ? (allocation.amount / total) * 100 : 0;
  }

  distributionClass(index: number): string {
    return ['bg-primary', 'bg-emerald-600', 'bg-amber-500', 'bg-sky-600'][
      index % 4
    ];
  }

  private refreshAfterAllocationChange(): void {
    this.focusAllocationsAfterLoad = true;
    this.loadInvestment(true);
  }

  private restoreAllocationFocus(): void {
    if (!this.focusAllocationsAfterLoad) return;
    this.focusAllocationsAfterLoad = false;
    queueMicrotask(() => this.allocationsHeading?.nativeElement.focus());
  }

  returnStatusLabel(item: Return): string {
    if (item.status === 'PAGO') return 'Pago';
    return isReturnOverdue(item) ? 'Atrasado' : 'Pendente';
  }

  returnStatusBadge(item: Return): string {
    if (item.status === 'PAGO') return 'bg-green-100 text-green-800';
    return isReturnOverdue(item)
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-900';
  }
}
