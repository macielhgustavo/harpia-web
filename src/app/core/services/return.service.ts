import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateReturnInput,
  Return,
  ReturnFilters,
  ReturnListItem,
  UpdateReturnInput,
} from '../models/return.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReturnService {
  private readonly api = inject(ApiService);

  list(filters: ReturnFilters = {}): Observable<ReturnListItem[]> {
    let params = new HttpParams();
    if (filters.allocationId?.trim()) {
      params = params.set('allocationId', filters.allocationId.trim());
    }
    if (filters.investmentId?.trim()) {
      params = params.set('investmentId', filters.investmentId.trim());
    }
    if (filters.developmentId?.trim()) {
      params = params.set('developmentId', filters.developmentId.trim());
    }
    if (filters.status) params = params.set('status', filters.status);
    return this.api.get<ReturnListItem[]>('/returns', params);
  }

  getById(id: string): Observable<ReturnListItem> {
    return this.api.get<ReturnListItem>(`/returns/${id}`);
  }

  create(data: CreateReturnInput): Observable<Return> {
    return this.api.post<Return>('/returns', data);
  }

  update(id: string, data: UpdateReturnInput): Observable<Return> {
    return this.api.patch<Return>(`/returns/${id}`, data);
  }

  remove(id: string): Observable<Return> {
    return this.api.delete<Return>(`/returns/${id}`);
  }
}
