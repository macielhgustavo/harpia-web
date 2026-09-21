import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Board,
  BoardFilters,
  CreateOpportunityInput,
  CreateSalesVisitInput,
  CreateSalesActivityInput,
  MoveOpportunityInput,
  Opportunity,
  OpportunityFilters,
  OpportunityHistoryPage,
  OpportunityPage,
  OpportunityPropertyInterest,
  OpportunityTimelinePage,
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
  UpsertOpportunityPropertyInterestInput,
} from '../models/crm.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly api = inject(ApiService);

  listPipelines(): Observable<SalesPipeline[]> {
    return this.api.get<SalesPipeline[]>('/crm/pipelines');
  }

  getBoard(filters: BoardFilters = {}): Observable<Board> {
    return this.api.get<Board>('/crm/board', this.params(filters));
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

  getHistory(
    id: string,
    page = 1,
    pageSize = 20,
  ): Observable<OpportunityHistoryPage> {
    return this.api.get<OpportunityHistoryPage>(
      `/crm/opportunities/${id}/history`,
      this.params({ page, pageSize }),
    );
  }

  getTimeline(
    id: string,
    limit = 20,
    cursor?: string,
  ): Observable<OpportunityTimelinePage> {
    return this.api.get<OpportunityTimelinePage>(
      `/crm/opportunities/${id}/timeline`,
      this.params({ limit, cursor }),
    );
  }

  getPropertyInterest(
    opportunityId: string,
  ): Observable<OpportunityPropertyInterest | null> {
    return this.api.get<OpportunityPropertyInterest | null>(
      `/crm/opportunities/${opportunityId}/interest`,
    );
  }

  upsertPropertyInterest(
    opportunityId: string,
    data: UpsertOpportunityPropertyInterestInput,
  ): Observable<OpportunityPropertyInterest> {
    return this.api.put<OpportunityPropertyInterest>(
      `/crm/opportunities/${opportunityId}/interest`,
      data,
    );
  }

  removePropertyInterest(
    opportunityId: string,
  ): Observable<OpportunityPropertyInterest> {
    return this.api.delete<OpportunityPropertyInterest>(
      `/crm/opportunities/${opportunityId}/interest`,
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
