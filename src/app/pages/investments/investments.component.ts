import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Investment,
  InvestmentListItem,
  InvestmentType,
} from '../../core/models/investment.model';
import { Person } from '../../core/models/person.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InvestmentService } from '../../core/services/investment.service';
import { PersonService } from '../../core/services/person.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { formatDate } from '../../shared/utils/development';
import {
  INVESTMENT_TYPE_OPTIONS,
  investmentTypeLabel,
} from '../../shared/utils/investment';
import { extractError } from '../../shared/utils/http-error';
import { InvestmentFormModalComponent } from './investment-form-modal.component';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [
    DialogFocusDirective,
    FormsModule,
    InvestmentFormModalComponent,
    LucideAngularModule,
  ],
  templateUrl: './investments.component.html',
})
export class InvestmentsComponent implements OnInit {
  private readonly investmentService = inject(InvestmentService);
  private readonly personService = inject(PersonService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private investmentLoadSequence = 0;

  readonly investments = signal<InvestmentListItem[]>([]);
  readonly investors = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly investorLoadError = signal('');
  readonly investorsLoading = signal(true);
  readonly actionError = signal('');
  readonly feedback = signal('');
  readonly search = signal('');
  readonly investorFilter = signal('');
  readonly typeFilter = signal<InvestmentType | ''>('');
  readonly formOpen = signal(false);
  readonly editing = signal<InvestmentListItem | null>(null);
  readonly deleteTarget = signal<InvestmentListItem | null>(null);
  readonly deleting = signal(false);

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.INVESTMENTS_WRITE,
  );
  readonly typeOptions = INVESTMENT_TYPE_OPTIONS;
  readonly formatCurrency = formatBrl;
  readonly formatDate = formatDate;
  readonly typeLabel = investmentTypeLabel;

  readonly AddIcon = Plus;
  readonly MoneyIcon = CircleDollarSign;
  readonly WalletIcon = WalletCards;
  readonly InvestorsIcon = UsersRound;
  readonly DateIcon = CalendarDays;
  readonly SearchIcon = Search;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly ChevronIcon = ChevronRight;
  readonly RetryIcon = RefreshCw;
  readonly CloseIcon = X;

  readonly investorOptions = computed(() => {
    const byId = new Map<string, string>();
    for (const investment of this.investments()) {
      byId.set(investment.investor.id, investment.investor.name);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  readonly filteredInvestments = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('pt-BR');
    const investorId = this.investorFilter();
    const type = this.typeFilter();
    return this.investments().filter((investment) => {
      const destinations = investment.allocations
        .map((allocation) => allocation.development?.name ?? 'Caixa geral')
        .join(' ');
      const searchable = [
        investment.investor.name,
        investment.notes ?? '',
        destinations,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return (
        (!search || searchable.includes(search)) &&
        (!investorId || investment.investorId === investorId) &&
        (!type || investment.type === type)
      );
    });
  });

  readonly totalInvested = computed(() =>
    this.investments().reduce((sum, investment) => sum + investment.amount, 0),
  );
  readonly totalAllocated = computed(() =>
    this.investments().reduce(
      (sum, investment) => sum + investment.allocatedAmount,
      0,
    ),
  );
  readonly totalGeneralCash = computed(() =>
    this.investments().reduce(
      (sum, investment) => sum + investment.unallocatedAmount,
      0,
    ),
  );
  readonly investorCount = computed(
    () => new Set(this.investments().map(({ investorId }) => investorId)).size,
  );
  readonly hasFilters = computed(
    () =>
      !!this.search().trim() || !!this.investorFilter() || !!this.typeFilter(),
  );

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('feedback') === 'removed') {
      this.feedback.set('Investimento removido com sucesso.');
    }
    this.loadInvestments();
    this.loadInvestors();
  }

  loadInvestments(): void {
    const sequence = ++this.investmentLoadSequence;
    this.loading.set(true);
    this.loadError.set('');
    this.investmentService.list().subscribe({
      next: (investments) => {
        if (sequence !== this.investmentLoadSequence) return;
        this.investments.set(investments);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.investmentLoadSequence) return;
        this.loadError.set(
          extractError(error, 'Não foi possível carregar os investimentos.'),
        );
        this.loading.set(false);
      },
    });
  }

  loadInvestors(): void {
    if (!this.canWrite) {
      this.investorsLoading.set(false);
      return;
    }
    this.investorsLoading.set(true);
    this.investorLoadError.set('');
    this.personService.list('INVESTIDOR').subscribe({
      next: (investors) => {
        this.investors.set(investors);
        this.investorsLoading.set(false);
      },
      error: (error: unknown) => {
        this.investorsLoading.set(false);
        this.investorLoadError.set(
          extractError(error, 'Não foi possível carregar os investidores.'),
        );
      },
    });
  }

  openCreate(): void {
    if (!this.canWrite || this.investorsLoading() || this.investorLoadError())
      return;
    this.clearMessages();
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(investment: InvestmentListItem, event?: Event): void {
    event?.stopPropagation();
    if (!this.canWrite) return;
    this.clearMessages();
    this.editing.set(investment);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(investment: Investment): void {
    const wasEditing = this.editing() !== null;
    this.closeForm();
    this.feedback.set(
      wasEditing
        ? 'Investimento atualizado com sucesso.'
        : 'Investimento criado com sucesso.',
    );
    this.loadInvestments();
  }

  onStale(): void {
    this.closeForm();
    this.actionError.set(
      'O investimento não existe mais. A lista foi atualizada.',
    );
    this.loadInvestments();
  }

  requestDelete(investment: InvestmentListItem, event?: Event): void {
    event?.stopPropagation();
    if (!this.canWrite) return;
    this.clearMessages();
    this.deleteTarget.set(investment);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
    this.actionError.set('');
  }

  confirmDelete(): void {
    const investment = this.deleteTarget();
    if (!investment || !this.canWrite || this.deleting()) return;
    this.deleting.set(true);
    this.actionError.set('');
    this.investmentService.remove(investment.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.feedback.set('Investimento removido com sucesso.');
        this.loadInvestments();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.deleteTarget.set(null);
          this.actionError.set(
            'O investimento não existe mais. A lista foi atualizada.',
          );
          this.loadInvestments();
          return;
        }
        this.actionError.set(
          extractError(error, 'Não foi possível remover o investimento.'),
        );
      },
    });
  }

  openDetail(id: string): void {
    void this.router.navigate(['/investments', id]);
  }

  resetFilters(): void {
    this.search.set('');
    this.investorFilter.set('');
    this.typeFilter.set('');
  }

  private clearMessages(): void {
    this.feedback.set('');
    this.actionError.set('');
  }
}
