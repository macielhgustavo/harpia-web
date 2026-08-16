import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Allocation,
  AllocationFullDetail,
  AllocationListItem,
  AllocationWithDevelopment,
  CreateAllocationInput,
  UpdateAllocationInput,
} from '../models/allocation.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AllocationService {
  private readonly api = inject(ApiService);

  list(
    investmentId?: string,
    developmentId?: string,
  ): Observable<AllocationListItem[]> {
    let params = new HttpParams();
    if (investmentId?.trim()) {
      params = params.set('investmentId', investmentId.trim());
    }
    if (developmentId?.trim()) {
      params = params.set('developmentId', developmentId.trim());
    }
    return this.api.get<AllocationListItem[]>('/allocations', params);
  }

  getById(id: string): Observable<AllocationFullDetail> {
    return this.api.get<AllocationFullDetail>(`/allocations/${id}`);
  }

  create(data: CreateAllocationInput): Observable<AllocationWithDevelopment> {
    return this.api.post<AllocationWithDevelopment>('/allocations', data);
  }

  update(
    id: string,
    data: UpdateAllocationInput,
  ): Observable<AllocationWithDevelopment> {
    return this.api.patch<AllocationWithDevelopment>(
      `/allocations/${id}`,
      data,
    );
  }

  remove(id: string): Observable<Allocation> {
    return this.api.delete<Allocation>(`/allocations/${id}`);
  }
}
