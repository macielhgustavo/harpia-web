import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LucideAngularModule,
  RefreshCw,
  Search,
  Users,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { DevelopmentListItem } from '../../core/models/development.model';
import { Person } from '../../core/models/person.model';
import { Sale, SalePage, SaleStatus } from '../../core/models/sale.model';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { SaleService } from '../../core/services/sale.service';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_PAGE: SalePage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

const STATUS_LABELS: Record<SaleStatus, string> = {
  ATIVA: 'Ativa',
  QUITADA: 'Quitada',
  CANCELADA: 'Cancelada',
  DISTRATADA: 'Distratada',
};

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './sales.component.html',
})
export class SalesComponent implements OnInit {
  private readonly salesService = inject(SaleService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly personService = inject(PersonService);
  private readonly router = inject(Router);
  private loadSequence = 0;

  readonly result = signal<SalePage>(EMPTY_PAGE);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly buyers = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly optionsLoading = signal(true);
  readonly error = signal('');
  readonly optionsError = signal('');
  readonly search = signal('');
  readonly developmentId = signal('');
  readonly status = signal<SaleStatus | ''>('');
  readonly buyerId = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly statusOptions = Object.entries(STATUS_LABELS).map(
    ([value, label]) => ({
      value: value as SaleStatus,
      label,
    }),
  );

  readonly totalValue = computed(() =>
    this.result().data.reduce((sum, sale) => sum + Number(sale.netAmount), 0),
  );
  readonly totalBalance = computed(() =>
    this.result().data.reduce(
      (sum, sale) => sum + Number(sale.outstandingBalance),
      0,
    ),
  );

  readonly SearchIcon = Search;
  readonly MoneyIcon = CircleDollarSign;
  readonly BuyersIcon = Users;
  readonly DateIcon = CalendarDays;
  readonly RetryIcon = RefreshCw;
  readonly PreviousIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;

  ngOnInit(): void {
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
    this.salesService
      .list({
        search: this.search().trim(),
        developmentId: this.developmentId(),
        status: this.status() || undefined,
        buyerId: this.buyerId(),
        startDate: this.startDate(),
        endDate: this.endDate(),
        page,
        pageSize: 20,
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
            extractError(error, 'Não foi possível carregar as vendas.'),
          );
        },
      });
  }

  loadOptions(): void {
    this.optionsLoading.set(true);
    this.optionsError.set('');
    forkJoin({
      developments: this.developmentService.list(),
      buyers: this.personService.list('CLIENTE'),
    }).subscribe({
      next: ({ developments, buyers }) => {
        this.developments.set(developments);
        this.buyers.set(buyers);
        this.optionsLoading.set(false);
      },
      error: (error: unknown) => {
        this.optionsLoading.set(false);
        this.optionsError.set(
          extractError(
            error,
            'Os filtros auxiliares não puderam ser carregados.',
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
    this.developmentId.set('');
    this.status.set('');
    this.buyerId.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.load(1);
  }

  open(sale: Sale): void {
    void this.router.navigate(['/sales', sale.id]);
  }

  statusLabel(status: SaleStatus): string {
    return STATUS_LABELS[status];
  }

  statusClass(status: SaleStatus): string {
    if (status === 'ATIVA') return 'bg-emerald-50 text-emerald-800';
    if (status === 'QUITADA') return 'bg-blue-50 text-blue-800';
    return 'bg-red-50 text-red-700';
  }

  primaryBuyer(sale: Sale): string {
    return (
      sale.buyers.find(({ isPrimary }) => isPrimary)?.person.name ??
      'Não informado'
    );
  }

  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
      new Date(value),
    );
  }
}
