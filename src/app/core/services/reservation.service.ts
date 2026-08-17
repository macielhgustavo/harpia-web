import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CancelReservationInput,
  CreateReservationInput,
  ReservationFilters,
  ReservationPage,
  UnitReservation,
} from '../models/reservation.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly api = inject(ApiService);

  list(filters: ReservationFilters = {}): Observable<ReservationPage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) =>
        value === undefined || value === null || value === ''
          ? current
          : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<ReservationPage>('/reservations', params);
  }

  getById(id: string): Observable<UnitReservation> {
    return this.api.get<UnitReservation>(`/reservations/${id}`);
  }

  create(data: CreateReservationInput): Observable<UnitReservation> {
    return this.api.post<UnitReservation>('/reservations', data);
  }

  cancel(
    id: string,
    data: CancelReservationInput,
  ): Observable<UnitReservation> {
    return this.api.post<UnitReservation>(`/reservations/${id}/cancel`, data);
  }

  convert(id: string): Observable<UnitReservation> {
    return this.api.post<UnitReservation>(`/reservations/${id}/convert`, null);
  }
}
