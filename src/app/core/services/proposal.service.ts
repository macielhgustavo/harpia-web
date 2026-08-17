import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateProposalInput,
  CreateProposalVersionInput,
  ProposalFilters,
  ProposalPage,
  ProposalPricePreview,
  SalesProposal,
} from '../models/proposal.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly api = inject(ApiService);

  list(filters: ProposalFilters = {}): Observable<ProposalPage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) =>
        value === undefined || value === null || value === ''
          ? current
          : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<ProposalPage>('/proposals', params);
  }

  pricePreview(unitId: string): Observable<ProposalPricePreview> {
    return this.api.get<ProposalPricePreview>(
      '/proposals/price-preview',
      new HttpParams().set('unitId', unitId),
    );
  }

  getById(id: string): Observable<SalesProposal> {
    return this.api.get<SalesProposal>(`/proposals/${id}`);
  }

  create(data: CreateProposalInput): Observable<SalesProposal> {
    return this.api.post<SalesProposal>('/proposals', data);
  }

  createVersion(
    id: string,
    data: CreateProposalVersionInput,
  ): Observable<SalesProposal> {
    return this.api.post<SalesProposal>(`/proposals/${id}/versions`, data);
  }

  send(id: string): Observable<SalesProposal> {
    return this.api.post<SalesProposal>(`/proposals/${id}/send`, null);
  }

  accept(id: string): Observable<SalesProposal> {
    return this.api.post<SalesProposal>(`/proposals/${id}/accept`, null);
  }

  reject(id: string, reason: string): Observable<SalesProposal> {
    return this.api.post<SalesProposal>(`/proposals/${id}/reject`, { reason });
  }
}
