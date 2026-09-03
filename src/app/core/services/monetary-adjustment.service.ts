import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class MonetaryAdjustmentService {
  private api = inject(ApiService);

  // MonetaryIndex
  getMonetaryIndices(): Observable<any> {
    return this.api.get('monetary-indices');
  }

  createMonetaryIndex(dto: any): Observable<any> {
    return this.api.post('monetary-indices', dto);
  }

  updateMonetaryIndex(id: string, dto: any): Observable<any> {
    return this.api.patch(`monetary-indices/${id}`, dto);
  }

  // MonetaryIndexValue
  getMonetaryIndexValues(monetaryIndexId: string): Observable<any> {
    return this.api.get(`monetary-indices/${monetaryIndexId}/values`);
  }

  createMonetaryIndexValue(monetaryIndexId: string, dto: any): Observable<any> {
    return this.api.post(`monetary-indices/${monetaryIndexId}/values`, dto);
  }

  updateMonetaryIndexValue(monetaryIndexId: string, id: string, dto: any): Observable<any> {
    return this.api.patch(`monetary-indices/${monetaryIndexId}/values/${id}`, dto);
  }

  // ReceivableAdjustmentPolicy
  getReceivableAdjustmentPolicies(receivableId: string): Observable<any> {
    return this.api.get(`receivables/${receivableId}/adjustment-policies`);
  }

  createReceivableAdjustmentPolicy(dto: any): Observable<any> {
    return this.api.post('receivable-adjustment-policies', dto);
  }

  updateReceivableAdjustmentPolicy(id: string, dto: any): Observable<any> {
    return this.api.patch(`receivable-adjustment-policies/${id}`, dto);
  }

  deleteReceivableAdjustmentPolicy(id: string): Observable<any> {
    return this.api.delete(`receivable-adjustment-policies/${id}`);
  }

  // ReceivableAdjustment
  previewReceivableAdjustment(
    receivableId: string,
    dto: { startCompetence: string; endCompetence: string; indexValues: Record<string, number> },
  ): Observable<any> {
    return this.api.post(`receivables/${receivableId}/adjustments/preview`, dto);
  }

  createReceivableAdjustment(
    receivableId: string,
    dto: { startCompetence: string; endCompetence: string; indexValues: Record<string, number> },
    userId: string,
  ): Observable<any> {
    return this.api.post(`receivables/${receivableId}/adjustments`, {
      ...dto,
      appliedById: userId,
    });
  }

  updateReceivableAdjustment(id: string, dto: any): Observable<any> {
    return this.api.patch(`receivable-adjustments/${id}`, dto);
  }

  deleteReceivableAdjustment(id: string): Observable<any> {
    return this.api.delete(`receivable-adjustments/${id}`);
  }

  getReceivableAdjustments(receivableId: string): Observable<any> {
    return this.api.get(`receivables/${receivableId}/adjustments`);
  }
}