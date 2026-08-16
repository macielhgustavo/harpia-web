import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateInvestmentInput,
  Investment,
  InvestmentDetail,
  InvestmentListItem,
  UpdateInvestmentInput,
} from '../models/investment.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private readonly api = inject(ApiService);

  list(investorId?: string): Observable<InvestmentListItem[]> {
    let params = new HttpParams();
    if (investorId?.trim()) {
      params = params.set('investorId', investorId.trim());
    }
    return this.api.get<InvestmentListItem[]>('/investments', params);
  }

  getById(id: string): Observable<InvestmentDetail> {
    return this.api.get<InvestmentDetail>(`/investments/${id}`);
  }

  create(data: CreateInvestmentInput): Observable<Investment> {
    return this.api.post<Investment>('/investments', data);
  }

  update(id: string, data: UpdateInvestmentInput): Observable<Investment> {
    return this.api.patch<Investment>(`/investments/${id}`, data);
  }

  remove(id: string): Observable<Investment> {
    return this.api.delete<Investment>(`/investments/${id}`);
  }
}
