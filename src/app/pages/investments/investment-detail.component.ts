import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  LucideAngularModule,
  Pencil,
  RefreshCw,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { AllocationDetail } from '../../core/models/allocation.model';
import {
  Investment,
  InvestmentDetail,
} from '../../core/models/investment.model';
import { Return } from '../../core/models/return.model';
import { AuthorizationService } from '../../core/services/authorization.service';
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

@Component({
  selector: 'app-investment-detail',
  standalone: true,
  imports: [
    DialogFocusDirective,
    InvestmentFormModalComponent,
    LucideAngularModule,
    RouterLink,
  ],
  templateUrl: './investment-detail.component.html',
})
export class InvestmentDetailComponent implements OnInit {
  private readonly investmentService = inject(InvestmentService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private loadSequence = 0;
  private investmentId = '';

  readonly investment = signal<InvestmentDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly formOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.INVESTMENTS_WRITE,
  );
  readonly formatCurrency = formatBrl;
  readonly formatDate = formatDate;
  readonly typeLabel = investmentTypeLabel;

  readonly BackIcon = ArrowLeft;
  readonly EditIcon = Pencil;
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

  ngOnInit(): void {
    this.investmentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.investmentId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadInvestment();
  }

  loadInvestment(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.notFound.set(false);
    this.investmentService.getById(this.investmentId).subscribe({
      next: (investment) => {
        if (sequence !== this.loadSequence) return;
        this.investment.set(investment);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
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
