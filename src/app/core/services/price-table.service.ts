import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreatePriceTableInput,
  PriceTable,
  PriceTableDetail,
  PriceTableListItem,
  SetUnitPriceInput,
  UnitPrice,
  UpdatePriceTableInput,
  UpdateUnitPriceInput,
} from '../models/price-table.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PriceTableService {
  private readonly api = inject(ApiService);

  list(developmentId: string): Observable<PriceTableListItem[]> {
    const params = new HttpParams().set('developmentId', developmentId);
    return this.api.get<PriceTableListItem[]>('/price-tables', params);
  }

  getById(id: string): Observable<PriceTableDetail> {
    return this.api.get<PriceTableDetail>(`/price-tables/${id}`);
  }

  create(data: CreatePriceTableInput): Observable<PriceTable> {
    return this.api.post<PriceTable>('/price-tables', data);
  }

  update(id: string, data: UpdatePriceTableInput): Observable<PriceTable> {
    return this.api.patch<PriceTable>(`/price-tables/${id}`, data);
  }

  remove(id: string): Observable<PriceTable> {
    return this.api.delete<PriceTable>(`/price-tables/${id}`);
  }

  setPrice(tableId: string, data: SetUnitPriceInput): Observable<UnitPrice> {
    return this.api.post<UnitPrice>(`/price-tables/${tableId}/prices`, data);
  }

  updatePrice(id: string, data: UpdateUnitPriceInput): Observable<UnitPrice> {
    return this.api.patch<UnitPrice>(`/unit-prices/${id}`, data);
  }

  removePrice(id: string): Observable<UnitPrice> {
    return this.api.delete<UnitPrice>(`/unit-prices/${id}`);
  }
}
