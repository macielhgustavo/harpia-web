import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CancelReceivableInput,
  Receivable,
  ReceivableFilters,
  ReceivablePage,
  RecordReceivablePaymentInput,
  ReverseReceivablePaymentInput,
} from '../models/receivable.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReceivableService {
  private readonly api = inject(ApiService);

  list(filters: ReceivableFilters = {}): Observable<ReceivablePage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) =>
        value === undefined || value === null || value === ''
          ? current
          : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<ReceivablePage>('/receivables', params);
  }

  getById(id: string): Observable<Receivable> {
    return this.api.get<Receivable>(`/receivables/${id}`);
  }

  recordPayment(
    id: string,
    input: RecordReceivablePaymentInput,
  ): Observable<Receivable> {
    return this.api.post<Receivable>(`/receivables/${id}/payments`, input);
  }

  reversePayment(
    id: string,
    paymentId: string,
    input: ReverseReceivablePaymentInput,
  ): Observable<Receivable> {
    return this.api.post<Receivable>(
      `/receivables/${id}/payments/${paymentId}/reverse`,
      input,
    );
  }

  cancel(id: string, input: CancelReceivableInput): Observable<Receivable> {
    return this.api.post<Receivable>(`/receivables/${id}/cancel`, input);
  }
}
