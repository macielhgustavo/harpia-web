import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReservationPage, UnitReservation } from '../models/reservation.model';
import { ApiService } from './api.service';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let api: jasmine.SpyObj<ApiService>;
  const reservation = { id: 'reservation-1' } as UnitReservation;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.returnValue(
      of({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      } as ReservationPage),
    );
    api.post.and.returnValue(of(reservation));
    TestBed.configureTestingModule({
      providers: [ReservationService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ReservationService);
  });

  it('lists with only defined filters, preserving pagination', () => {
    service
      .list({
        developmentId: 'development-1',
        opportunityId: '',
        status: 'ATIVA',
        page: 2,
        pageSize: 50,
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/reservations');
    expect(params?.get('developmentId')).toBe('development-1');
    expect(params?.get('status')).toBe('ATIVA');
    expect(params?.get('page')).toBe('2');
    expect(params?.has('opportunityId')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('gets a tenant-scoped reservation through the backend route', () => {
    api.get.and.returnValue(of(reservation));
    service.getById('reservation-1').subscribe();
    expect(api.get).toHaveBeenCalledOnceWith('/reservations/reservation-1');
  });

  it('creates using the exact public payload', () => {
    const data = {
      unitId: 'unit-1',
      personId: 'person-1',
      opportunityId: 'opportunity-1',
      expiresAt: '2026-08-20T12:00:00.000Z',
      notes: 'Visita agendada',
    };
    service.create(data).subscribe();
    expect(api.post).toHaveBeenCalledOnceWith('/reservations', data);
  });

  it('uses POST for cancellation and conversion', () => {
    service.cancel('reservation-1', { reason: 'Desistência' }).subscribe();
    service.convert('reservation-1').subscribe();
    expect(api.post.calls.argsFor(0)).toEqual([
      '/reservations/reservation-1/cancel',
      { reason: 'Desistência' },
    ]);
    expect(api.post.calls.argsFor(1)).toEqual([
      '/reservations/reservation-1/convert',
      null,
    ]);
  });
});
