import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ManagedUser,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UserFilters,
} from '../models/user-management.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly api = inject(ApiService);

  list(filters: UserFilters = {}): Observable<ManagedUser[]> {
    let params = new HttpParams();
    const search = filters.search?.trim();

    if (filters.role) {
      params = params.set('role', filters.role);
    }
    if (filters.isActive !== undefined) {
      params = params.set('isActive', String(filters.isActive));
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.api.get<ManagedUser[]>('/users', params);
  }

  getById(id: string): Observable<ManagedUser> {
    return this.api.get<ManagedUser>(`/users/${id}`);
  }

  updateRole(
    id: string,
    request: UpdateUserRoleRequest,
  ): Observable<ManagedUser> {
    return this.api.patch<ManagedUser>(`/users/${id}/role`, request);
  }

  updateStatus(
    id: string,
    request: UpdateUserStatusRequest,
  ): Observable<ManagedUser> {
    return this.api.patch<ManagedUser>(`/users/${id}/status`, request);
  }
}
