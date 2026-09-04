import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateOpportunityInput,
  CreateSalesVisitInput,
  CreateSalesActivityInput,
  MoveOpportunityInput,
  Opportunity,
  OpportunityFilters,
  OpportunityPage,
  OpportunityStageHistory,
  OpportunityTimelineEvent,
  SalesActivity,
  SalesActivityFilters,
  SalesActivityPage,
  SalesPipeline,
  SalesVisit,
  SalesVisitFilters,
  SalesVisitPage,
  UpdateOpportunityInput,
  UpdateSalesActivityInput,
  UpdateSalesVisitInput,
} from '../models/crm.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly api = inject(ApiService);

  listPipelines(): Observable<SalesPipeline[]> {
    return this.api.get<SalesPipeline[]>('/crm/pipelines');
  }

  listOpportunities(
    filters: OpportunityFilters = {},
  ): Observable<OpportunityPage> {
    return this.api.get<OpportunityPage>(
      '/crm/opportunities',
      this.params(filters),
    );
  }

  getOpportunity(id: string): Observable<Opportunity> {
    return this.api.get<Opportunity>(`/crm/opportunities/${id}`);
  }

  createOpportunity(data: CreateOpportunityInput): Observable<Opportunity> {
    return this.api.post<Opportunity>('/crm/opportunities', data);
  }

  updateOpportunity(
    id: string,
    data: UpdateOpportunityInput,
  ): Observable<Opportunity> {
    return this.api.patch<Opportunity>(`/crm/opportunities/${id}`, data);
  }

  removeOpportunity(id: string): Observable<Opportunity> {
    return this.api.delete<Opportunity>(`/crm/opportunities/${id}`);
  }

  moveOpportunity(
    id: string,
    data: MoveOpportunityInput,
  ): Observable<Opportunity> {
    return this.api.post<Opportunity>(`/crm/opportunities/${id}/move`, data);
  }

  getHistory(id: string): Observable<OpportunityStageHistory[]> {
    return this.api.get<OpportunityStageHistory[]>(
      `/crm/opportunities/${id}/history`,
    );
  }

  getTimeline(id: string): Observable<OpportunityTimelineEvent[]> {
    return this.api.get<OpportunityTimelineEvent[]>(
      `/crm/opportunities/${id}/timeline`,
    );
  }

  listActivities(
    filters: SalesActivityFilters = {},
  ): Observable<SalesActivityPage> {
    return this.api.get<SalesActivityPage>(
      '/crm/activities',
      this.params(filters),
    );
  }

  createActivity(data: CreateSalesActivityInput): Observable<SalesActivity> {
    return this.api.post<SalesActivity>('/crm/activities', data);
  }

  updateActivity(
    id: string,
    data: UpdateSalesActivityInput,
  ): Observable<SalesActivity> {
    return this.api.patch<SalesActivity>(`/crm/activities/${id}`, data);
  }

  removeActivity(id: string): Observable<SalesActivity> {
    return this.api.delete<SalesActivity>(`/crm/activities/${id}`);
  }

  listVisits(filters: SalesVisitFilters = {}): Observable<SalesVisitPage> {
    return this.api.get<SalesVisitPage>('/crm/visits', this.params(filters));
  }

  createVisit(data: CreateSalesVisitInput): Observable<SalesVisit> {
    return this.api.post<SalesVisit>('/crm/visits', data);
  }

  updateVisit(id: string, data: UpdateSalesVisitInput): Observable<SalesVisit> {
    return this.api.patch<SalesVisit>(`/crm/visits/${id}`, data);
  }

  private params(filters: object): HttpParams {
    return Object.entries(filters).reduce((params, [key, value]) => {
      if (value === undefined || value === null || value === '') return params;
      const normalized = typeof value === 'string' ? value.trim() : value;
      return normalized === '' ? params : params.set(key, String(normalized));
    }, new HttpParams());
  }
}
