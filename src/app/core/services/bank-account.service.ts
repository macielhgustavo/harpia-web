import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BankAccount,
  BankAccountListItem,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../models/bank-account.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BankAccountService {
  private readonly api = inject(ApiService);

  list(companyId?: string): Observable<BankAccountListItem[]> {
    let params = new HttpParams();
    if (companyId?.trim()) {
      params = params.set('companyId', companyId.trim());
    }
    return this.api.get<BankAccountListItem[]>('/bank-accounts', params);
  }

  getById(id: string): Observable<BankAccountListItem> {
    return this.api.get<BankAccountListItem>(`/bank-accounts/${id}`);
  }

  create(data: CreateBankAccountInput): Observable<BankAccount> {
    return this.api.post<BankAccount>('/bank-accounts', data);
  }

  update(id: string, data: UpdateBankAccountInput): Observable<BankAccount> {
    return this.api.patch<BankAccount>(`/bank-accounts/${id}`, data);
  }

  remove(id: string): Observable<BankAccount> {
    return this.api.delete<BankAccount>(`/bank-accounts/${id}`);
  }
}
