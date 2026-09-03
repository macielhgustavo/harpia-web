import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CollectionDispatch,
  CollectionDispatchFilters,
  CollectionDispatchPage,
  CollectionRule,
  CollectionRuleInput,
  CollectionRunResult,
} from '../models/collection.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly api = inject(ApiService);

  rules(): Observable<CollectionRule[]> {
    return this.api.get<CollectionRule[]>('/collections/rules');
  }

  dispatches(
    filters: CollectionDispatchFilters = {},
  ): Observable<CollectionDispatchPage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) =>
        value === undefined || value === null || value === ''
          ? current
          : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<CollectionDispatchPage>(
      '/collections/dispatches',
      params,
    );
  }

  createRule(input: CollectionRuleInput): Observable<CollectionRule> {
    return this.api.post<CollectionRule>('/collections/rules', input);
  }

  updateRule(
    id: string,
    input: Partial<CollectionRuleInput>,
  ): Observable<CollectionRule> {
    return this.api.patch<CollectionRule>(`/collections/rules/${id}`, input);
  }

  run(): Observable<CollectionRunResult> {
    return this.api.post<CollectionRunResult>('/collections/run', {});
  }

  retry(id: string): Observable<CollectionDispatch> {
    return this.api.post<CollectionDispatch>(
      `/collections/dispatches/${id}/retry`,
      {},
    );
  }

  cancel(id: string): Observable<CollectionDispatch> {
    return this.api.post<CollectionDispatch>(
      `/collections/dispatches/${id}/cancel`,
      {},
    );
  }
}
