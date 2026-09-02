import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RecordReceivablePaymentInput,
  ReverseReceivablePaymentInput,
} from '../models/receivable.model';
import {
  Payable,
  PayableFilters,
  PayablePage,
  SavePayableInput,
} from '../models/payable.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PayableService {
  private readonly api = inject(ApiService);

  list(filters: PayableFilters = {}): Observable<PayablePage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) =>
        value === undefined || value === null || value === ''
          ? current
          : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<PayablePage>('/payables', params);
  }

  create(input: SavePayableInput): Observable<Payable> {
    return this.api.post<Payable>('/payables', input);
  }

  update(id: string, input: Partial<SavePayableInput>): Observable<Payable> {
    return this.api.patch<Payable>(`/payables/${id}`, input);
  }

  recordPayment(
    id: string,
    input: RecordReceivablePaymentInput,
  ): Observable<Payable> {
    return this.api.post<Payable>(`/payables/${id}/payments`, input);
  }

  reversePayment(
    id: string,
    paymentId: string,
    input: ReverseReceivablePaymentInput,
  ): Observable<Payable> {
    return this.api.post<Payable>(
      `/payables/${id}/payments/${paymentId}/reverse`,
      input,
    );
  }

  cancel(id: string, reason: string): Observable<Payable> {
    return this.api.post<Payable>(`/payables/${id}/cancel`, { reason });
  }
}
