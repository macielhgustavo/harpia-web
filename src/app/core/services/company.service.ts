import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Company,
  CompanyDetail,
  CompanyListItem,
  CompanyType,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../models/company.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = inject(ApiService);

  list(type?: CompanyType | ''): Observable<CompanyListItem[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    return this.api.get<CompanyListItem[]>('/companies', params);
  }

  getById(id: string): Observable<CompanyDetail> {
    return this.api.get<CompanyDetail>(`/companies/${id}`);
  }

  create(data: CreateCompanyInput): Observable<Company> {
    return this.api.post<Company>('/companies', data);
  }

  update(id: string, data: UpdateCompanyInput): Observable<Company> {
    return this.api.patch<Company>(`/companies/${id}`, data);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/companies/${id}`);
  }
}
