import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuditLog,
  AuditLogFilters,
  AuditLogPage,
} from '../models/audit-log.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly api = inject(ApiService);

  list(filters: AuditLogFilters = {}): Observable<AuditLogPage> {
    let params = new HttpParams();
    params = this.setTrimmed(params, 'action', filters.action);
    params = this.setTrimmed(params, 'entityType', filters.entityType);
    params = this.setTrimmed(params, 'entityId', filters.entityId);
    params = this.setTrimmed(params, 'actorUserId', filters.actorUserId);
    params = this.setTrimmed(params, 'startDate', filters.startDate);
    params = this.setTrimmed(params, 'endDate', filters.endDate);

    if (filters.page !== undefined) {
      params = params.set('page', String(filters.page));
    }
    if (filters.pageSize !== undefined) {
      params = params.set('pageSize', String(filters.pageSize));
    }

    return this.api.get<AuditLogPage>('/audit-logs', params);
  }

  getById(id: string): Observable<AuditLog> {
    return this.api.get<AuditLog>(`/audit-logs/${id}`);
  }

  private setTrimmed(
    params: HttpParams,
    key: string,
    value?: string,
  ): HttpParams {
    const trimmed = value?.trim();
    return trimmed ? params.set(key, trimmed) : params;
  }
}
