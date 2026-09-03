import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { CompanyListItem } from '../../core/models/company.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import {
  CostCenter,
  IncomeStatementBasis,
  IncomeStatementResult,
} from '../../core/models/finance.model';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { FinanceService } from '../../core/services/finance.service';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

@Component({
  selector: 'app-income-statement',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './income-statement.component.html',
})
export class IncomeStatementComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly companiesService = inject(CompanyService);
  private readonly developmentsService = inject(DevelopmentService);
  readonly result = signal<IncomeStatementResult | null>(null);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly costCenters = signal<CostCenter[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  basis: IncomeStatementBasis = 'COMPETENCIA';
  startDate = this.monthStart();
  endDate = this.monthEnd();
  companyId = '';
  developmentId = '';
  costCenterId = '';
  readonly UpIcon = TrendingUp;
  readonly DownIcon = TrendingDown;
  readonly RetryIcon = RefreshCw;

  ngOnInit(): void {
    forkJoin({
      companies: this.companiesService.list(),
      developments: this.developmentsService.list(),
      centers: this.finance.costCenters(),
    }).subscribe(({ companies, developments, centers }) => {
      this.companies.set(companies);
      this.developments.set(developments);
      this.costCenters.set(centers);
    });
    this.load();
  }

  load(): void {
    if (this.startDate > this.endDate) {
      this.error.set('A data inicial deve ser anterior à data final.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.finance
      .incomeStatement({
        basis: this.basis,
        startDate: this.startDate,
        endDate: this.endDate,
        companyId: this.companyId,
        developmentId: this.developmentId,
        costCenterId: this.costCenterId,
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(
            extractError(error, 'Não foi possível calcular a DRE.'),
          );
        },
      });
  }

  money(value: string): string {
    return formatBrl(Number(value));
  }

  variation(value: string | null): string {
    return value === null ? 'Novo no período' : `${Number(value).toFixed(1)}%`;
  }

  percent(value: string): string {
    return `${Number(value).toFixed(1)}%`;
  }

  isPositive(value: string): boolean {
    return Number(value) >= 0;
  }

  variationClass(value: string | null, inverse = false): string {
    if (value === null) return 'text-muted';
    const positive = Number(value) >= 0;
    return positive !== inverse ? 'text-emerald-800' : 'text-red-800';
  }

  private monthStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  }

  private monthEnd(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
  }
}
