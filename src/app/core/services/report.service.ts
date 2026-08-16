import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ReportFilters,
  ReportFormat,
  ReportType,
} from '../models/report.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  generate(
    type: ReportType,
    format: ReportFormat,
    filters: ReportFilters = {},
  ): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', format);
    for (const [key, value] of Object.entries(
      this.relevantFilters(type, filters),
    )) {
      if (value?.trim()) params = params.set(key, value.trim());
    }
    return this.api.getBlob(`/reports/${type}`, params);
  }

  private relevantFilters(
    type: ReportType,
    filters: ReportFilters,
  ): Record<string, string | undefined> {
    const references = {
      developmentId: filters.developmentId,
      investorId: filters.investorId,
    };
    if (type === 'captations') {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...references,
      };
    }
    if (type === 'returns') {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...references,
        status: filters.status || undefined,
      };
    }
    if (type === 'overdue-returns') {
      return { asOfDate: filters.asOfDate, ...references };
    }
    return references;
  }
}
