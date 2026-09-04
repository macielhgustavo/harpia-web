import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdjustmentPeriodInput,
  AdjustmentPreview,
  MonetaryIndex,
  MonetaryIndexInput,
  MonetaryIndexValue,
  MonetaryIndexValueInput,
  ReceivableAdjustment,
  ReceivableAdjustmentPolicy,
  ReceivableAdjustmentPolicyInput,
} from '../models/monetary-adjustment.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MonetaryAdjustmentService {
  private readonly api = inject(ApiService);

  indices(): Observable<MonetaryIndex[]> {
    return this.api.get<MonetaryIndex[]>('/monetary-indices');
  }

  createIndex(input: MonetaryIndexInput): Observable<MonetaryIndex> {
    return this.api.post<MonetaryIndex>('/monetary-indices', input);
  }

  updateIndex(id: string, input: Partial<MonetaryIndexInput>): Observable<MonetaryIndex> {
    return this.api.patch<MonetaryIndex>(`/monetary-indices/${id}`, input);
  }

  values(indexId: string): Observable<MonetaryIndexValue[]> {
    return this.api.get<MonetaryIndexValue[]>(`/monetary-indices/${indexId}/values`);
  }

  createValue(indexId: string, input: MonetaryIndexValueInput): Observable<MonetaryIndexValue> {
    return this.api.post<MonetaryIndexValue>(`/monetary-indices/${indexId}/values`, input);
  }

  updateValue(
    indexId: string,
    id: string,
    input: Partial<MonetaryIndexValueInput>,
  ): Observable<MonetaryIndexValue> {
    return this.api.patch<MonetaryIndexValue>(`/monetary-indices/${indexId}/values/${id}`, input);
  }

  policies(receivableId: string): Observable<ReceivableAdjustmentPolicy[]> {
    return this.api.get<ReceivableAdjustmentPolicy[]>(`/receivables/${receivableId}/adjustment-policies`);
  }

  createPolicy(
    receivableId: string,
    input: ReceivableAdjustmentPolicyInput,
  ): Observable<ReceivableAdjustmentPolicy> {
    return this.api.post<ReceivableAdjustmentPolicy>(`/receivables/${receivableId}/adjustment-policies`, input);
  }

  updatePolicy(
    receivableId: string,
    id: string,
    input: Partial<ReceivableAdjustmentPolicyInput>,
  ): Observable<ReceivableAdjustmentPolicy> {
    return this.api.patch<ReceivableAdjustmentPolicy>(`/receivables/${receivableId}/adjustment-policies/${id}`, input);
  }

  deletePolicy(receivableId: string, id: string): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(`/receivables/${receivableId}/adjustment-policies/${id}`);
  }

  preview(receivableId: string, input: AdjustmentPeriodInput): Observable<AdjustmentPreview> {
    return this.api.post<AdjustmentPreview>(`/receivables/${receivableId}/adjustments/preview`, input);
  }

  apply(receivableId: string, input: AdjustmentPeriodInput): Observable<ReceivableAdjustment> {
    return this.api.post<ReceivableAdjustment>(`/receivables/${receivableId}/adjustments`, input);
  }

  adjustments(receivableId: string): Observable<ReceivableAdjustment[]> {
    return this.api.get<ReceivableAdjustment[]>(`/receivables/${receivableId}/adjustments`);
  }
}
