import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CashFlowResult,
  CostCenter,
  FinanceFilters,
  FinanceSummary,
  FinancialCategory,
  FinancialCategoryType,
} from '../models/finance.model';
import { ApiService } from './api.service';
import {
  BankStatementEntry,
  ImportStatementInput,
  ImportStatementResult,
  ReconciliationCandidate,
  ReconciliationFilters,
  ReconciliationListResult,
} from '../models/bank-reconciliation.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly api = inject(ApiService);

  summary(filters: FinanceFilters = {}): Observable<FinanceSummary> {
    return this.api.get<FinanceSummary>(
      '/finance/summary',
      this.params(filters),
    );
  }

  cashFlow(filters: FinanceFilters = {}): Observable<CashFlowResult> {
    return this.api.get<CashFlowResult>(
      '/finance/cash-flow',
      this.params(filters),
    );
  }

  categories(type?: FinancialCategoryType): Observable<FinancialCategory[]> {
    const params = type ? new HttpParams().set('type', type) : undefined;
    return this.api.get<FinancialCategory[]>('/finance/categories', params);
  }

  costCenters(): Observable<CostCenter[]> {
    return this.api.get<CostCenter[]>('/finance/cost-centers');
  }

  markCommissionDue(id: string): Observable<unknown> {
    return this.api.post(`/finance/commissions/${id}/mark-due`, {});
  }

  reconciliation(
    filters: ReconciliationFilters = {},
  ): Observable<ReconciliationListResult> {
    return this.api.get<ReconciliationListResult>(
      '/finance/reconciliation',
      this.params(filters),
    );
  }

  importStatement(
    input: ImportStatementInput,
  ): Observable<ImportStatementResult> {
    return this.api.post<ImportStatementResult>(
      '/finance/reconciliation/import',
      input,
    );
  }

  reconciliationCandidates(id: string): Observable<ReconciliationCandidate[]> {
    return this.api.get<ReconciliationCandidate[]>(
      `/finance/reconciliation/${id}/candidates`,
    );
  }

  matchReconciliation(
    id: string,
    transactionId: string,
  ): Observable<BankStatementEntry> {
    return this.api.post<BankStatementEntry>(
      `/finance/reconciliation/${id}/match`,
      { transactionId },
    );
  }

  unmatchReconciliation(id: string): Observable<BankStatementEntry> {
    return this.api.post<BankStatementEntry>(
      `/finance/reconciliation/${id}/unmatch`,
      {},
    );
  }

  ignoreReconciliation(id: string): Observable<BankStatementEntry> {
    return this.api.post<BankStatementEntry>(
      `/finance/reconciliation/${id}/ignore`,
      {},
    );
  }

  restoreReconciliation(id: string): Observable<BankStatementEntry> {
    return this.api.post<BankStatementEntry>(
      `/finance/reconciliation/${id}/restore`,
      {},
    );
  }

  private params(filters: FinanceFilters | ReconciliationFilters): HttpParams {
    return Object.entries(filters).reduce(
      (params, [key, value]) =>
        value === undefined || value === null || value === ''
          ? params
          : params.set(key, String(value)),
      new HttpParams(),
    );
  }
}
