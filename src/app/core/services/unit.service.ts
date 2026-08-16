import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateUnitInput,
  Unit,
  UnitDetail,
  UnitListFilters,
  UnitListItem,
  UpdateUnitInput,
} from '../models/unit.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private readonly api = inject(ApiService);

  list(filters: UnitListFilters): Observable<UnitListItem[]> {
    let params = new HttpParams().set('developmentId', filters.developmentId);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.grouping?.trim()) {
      params = params.set('grouping', filters.grouping.trim());
    }
    return this.api.get<UnitListItem[]>('/units', params);
  }

  getById(id: string): Observable<UnitDetail> {
    return this.api.get<UnitDetail>(`/units/${id}`);
  }

  create(data: CreateUnitInput): Observable<Unit> {
    return this.api.post<Unit>('/units', data);
  }

  update(id: string, data: UpdateUnitInput): Observable<Unit> {
    return this.api.patch<Unit>(`/units/${id}`, data);
  }

  remove(id: string): Observable<Unit> {
    return this.api.delete<Unit>(`/units/${id}`);
  }
}
