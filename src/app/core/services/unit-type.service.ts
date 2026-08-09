import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateUnitTypeInput,
  UnitType,
  UnitTypeDetail,
  UnitTypeListItem,
  UpdateUnitTypeInput,
} from '../models/unit-type.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UnitTypeService {
  private readonly api = inject(ApiService);

  list(developmentId: string): Observable<UnitTypeListItem[]> {
    const params = new HttpParams().set('developmentId', developmentId);
    return this.api.get<UnitTypeListItem[]>('/unit-types', params);
  }

  getById(id: string): Observable<UnitTypeDetail> {
    return this.api.get<UnitTypeDetail>(`/unit-types/${id}`);
  }

  create(data: CreateUnitTypeInput): Observable<UnitType> {
    return this.api.post<UnitType>('/unit-types', data);
  }

  update(id: string, data: UpdateUnitTypeInput): Observable<UnitType> {
    return this.api.patch<UnitType>(`/unit-types/${id}`, data);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/unit-types/${id}`);
  }
}
