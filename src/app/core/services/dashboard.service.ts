import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardOverview } from '../models/dashboard.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getOverview(): Observable<DashboardOverview> {
    return this.api.get<DashboardOverview>('/dashboard');
  }
}
