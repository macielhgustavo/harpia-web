import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  Landmark,
  LucideAngularModule,
  RefreshCw,
  Scale,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { CompanyListItem } from '../../core/models/company.model';
import {
  CashFlowResult,
  FinanceSummary,
} from '../../core/models/finance.model';
import { CompanyService } from '../../core/services/company.service';
import { FinanceService } from '../../core/services/finance.service';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_SUMMARY: FinanceSummary = {
  cashBalance: '0',
  receivablesPending: '0',
  receivablesOverdue: '0',
  payablesPending: '0',
  payablesOverdue: '0',
  expectedInflows30d: '0',
  expectedOutflows30d: '0',
  projected30d: '0',
  positionByCompany: [],
  upcoming: [],
};

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './finance-dashboard.component.html',
})
export class FinanceDashboardComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly companiesService = inject(CompanyService);

  readonly summary = signal<FinanceSummary>(EMPTY_SUMMARY);
  readonly flow = signal<CashFlowResult | null>(null);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly companyId = signal('');
  readonly loading = signal(true);
  readonly error = signal('');

  readonly BalanceIcon = Landmark;
  readonly ReceivableIcon = ArrowUpRight;
  readonly PayableIcon = ArrowDownRight;
  readonly OverdueIcon = CalendarClock;
  readonly ProjectionIcon = Scale;
  readonly CompanyIcon = Building2;
  readonly MoneyIcon = CircleDollarSign;
  readonly HandCoinsIcon = HandCoins;
  readonly RetryIcon = RefreshCw;

  ngOnInit(): void {
    this.companiesService.list().subscribe({
      next: (companies) => this.companies.set(companies),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const filters = { companyId: this.companyId(), days: 30 };
    forkJoin({
      summary: this.finance.summary(filters),
      flow: this.finance.cashFlow({
        ...filters,
        mode: 'PROJETADO',
        groupBy: 'SEMANA',
      }),
    }).subscribe({
      next: ({ summary, flow }) => {
        this.summary.set(summary);
        this.flow.set(flow);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar o financeiro.'),
        );
      },
    });
  }

  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
      new Date(`${value.slice(0, 10)}T12:00:00`),
    );
  }

  projectionClass(value: string): string {
    return Number(value) >= 0 ? 'text-emerald-800' : 'text-red-800';
  }

  barWidth(value: string, counterpart: string): number {
    const current = Math.abs(Number(value));
    const maximum = Math.max(current, Math.abs(Number(counterpart)), 1);
    return Math.max(4, Math.round((current / maximum) * 100));
  }
}
