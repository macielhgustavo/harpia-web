import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CancelSaleInput,
  ConvertProposalToSaleInput,
  Sale,
  SaleCommission,
  SaleCommissionInput,
  SaleDetail,
  SaleFilters,
  SalePage,
  UpdateSaleInput,
} from '../models/sale.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly api = inject(ApiService);

  list(filters: SaleFilters = {}): Observable<SalePage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) =>
        value === undefined || value === null || value === ''
          ? current
          : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<SalePage>('/sales', params);
  }

  getById(id: string): Observable<SaleDetail> {
    return this.api.get<SaleDetail>(`/sales/${id}`);
  }

  convertProposal(
    proposalId: string,
    data: ConvertProposalToSaleInput,
  ): Observable<SaleDetail> {
    return this.api.post<SaleDetail>(
      `/proposals/${proposalId}/convert-to-sale`,
      data,
    );
  }

  update(id: string, data: UpdateSaleInput): Observable<SaleDetail> {
    return this.api.patch<SaleDetail>(`/sales/${id}`, data);
  }

  addCommission(
    id: string,
    data: SaleCommissionInput,
  ): Observable<SaleCommission> {
    return this.api.post<SaleCommission>(`/sales/${id}/commissions`, data);
  }

  cancel(id: string, data: CancelSaleInput): Observable<SaleDetail> {
    return this.api.post<SaleDetail>(`/sales/${id}/cancel`, data);
  }
}
