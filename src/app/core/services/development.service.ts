import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateDevelopmentInput,
  Development,
  DevelopmentDetail,
  DevelopmentListItem,
  DevelopmentStatus,
  DevelopmentType,
  UpdateDevelopmentInput,
} from '../models/development.model';
import { ApiService } from './api.service';

export interface DevelopmentFilters {
  status?: DevelopmentStatus | '';
  type?: DevelopmentType | '';
  companyId?: string;
}

@Injectable({ providedIn: 'root' })
export class DevelopmentService {
  private readonly api = inject(ApiService);

  list(filters: DevelopmentFilters = {}): Observable<DevelopmentListItem[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.companyId) params = params.set('companyId', filters.companyId);
    return this.api.get<DevelopmentListItem[]>('/developments', params);
  }

  getById(id: string): Observable<DevelopmentDetail> {
    return this.api.get<DevelopmentDetail>(`/developments/${id}`);
  }

  create(data: CreateDevelopmentInput): Observable<Development> {
    return this.api.post<Development>('/developments', data);
  }

  update(id: string, data: UpdateDevelopmentInput): Observable<Development> {
    return this.api.patch<Development>(`/developments/${id}`, data);
  }

  remove(id: string): Observable<Development> {
    return this.api.delete<Development>(`/developments/${id}`);
  }
}
