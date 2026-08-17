import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Person } from '../../core/models/person.model';
import {
  ReservationPage,
  UnitReservation,
} from '../../core/models/reservation.model';
import { UnitListItem } from '../../core/models/unit.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { PersonService } from '../../core/services/person.service';
import { ReservationService } from '../../core/services/reservation.service';
import { UnitService } from '../../core/services/unit.service';
import { ReservationsSectionComponent } from './reservations-section.component';

const page: ReservationPage = {
  data: [],
  pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
};
const unit = {
  id: 'unit-1',
  developmentId: 'development-1',
  identifier: '101',
  status: 'DISPONIVEL',
  prices: [],
} as unknown as UnitListItem;
const person = {
  id: 'person-1',
  name: 'Cliente Teste',
  roles: [],
} as unknown as Person;
const reservation = {
  id: 'reservation-1',
  status: 'ATIVA',
  unit: {
    id: 'unit-1',
    identifier: '101',
    status: 'RESERVADA',
    development: { id: 'development-1', name: 'Residencial' },
  },
  person: { id: 'person-1', name: 'Cliente', email: null, phone: null },
  createdByUser: { id: 'user-1', name: 'Responsável' },
  opportunity: null,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
} as UnitReservation;

describe('ReservationsSectionComponent', () => {
  let fixture: ComponentFixture<ReservationsSectionComponent>;
  let component: ReservationsSectionComponent;
  let reservationService: jasmine.SpyObj<ReservationService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  beforeEach(async () => {
    reservationService = jasmine.createSpyObj<ReservationService>(
      'ReservationService',
      ['list', 'create', 'cancel'],
    );
    reservationService.list.and.returnValue(of(page));
    reservationService.create.and.returnValue(of(reservation));
    reservationService.cancel.and.returnValue(of(reservation));
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);
    const units = jasmine.createSpyObj<UnitService>('UnitService', ['list']);
    units.list.and.returnValue(of([unit]));
    const people = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    people.list.and.returnValue(of([person]));
    const crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'listOpportunities',
    ]);
    crm.listOpportunities.and.returnValue(
      of({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ReservationsSectionComponent],
      providers: [
        { provide: ReservationService, useValue: reservationService },
        { provide: UnitService, useValue: units },
        { provide: PersonService, useValue: people },
        { provide: CrmService, useValue: crm },
        { provide: AuthorizationService, useValue: authorization },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReservationsSectionComponent);
    component = fixture.componentInstance;
  });

  it('loads reservations scoped to the development', () => {
    fixture.componentRef.setInput('developmentId', 'development-1');
    fixture.detectChanges();

    expect(reservationService.list).toHaveBeenCalledWith({
      developmentId: 'development-1',
      pageSize: 100,
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma reserva registrada',
    );
  });

  it('prefills opportunity context and sends an ISO expiration', () => {
    fixture.componentRef.setInput('developmentId', 'development-1');
    fixture.componentRef.setInput('opportunityId', 'opportunity-1');
    fixture.componentRef.setInput('personId', 'person-1');
    fixture.componentRef.setInput('unitId', 'unit-1');
    fixture.detectChanges();
    component.openCreate();
    const future = new Date(Date.now() + 72 * 60 * 60 * 1000);
    future.setMinutes(future.getMinutes() - future.getTimezoneOffset());
    component.formExpiresAt = future.toISOString().slice(0, 16);
    component.formNotes = '  Visita confirmada  ';

    component.save();

    expect(reservationService.create).toHaveBeenCalledWith({
      unitId: 'unit-1',
      personId: 'person-1',
      opportunityId: 'opportunity-1',
      expiresAt: new Date(component.formExpiresAt).toISOString(),
      notes: 'Visita confirmada',
    });
  });

  it('requires a cancellation reason and then invokes the exact action', () => {
    component.requestCancel(reservation);
    component.confirmCancel();
    expect(reservationService.cancel).not.toHaveBeenCalled();
    expect(component.cancelError()).toContain('motivo');

    component.cancellationReason = '  Cliente desistiu  ';
    component.confirmCancel();
    expect(reservationService.cancel).toHaveBeenCalledOnceWith(
      'reservation-1',
      { reason: 'Cliente desistiu' },
    );
  });

  it('shows status and remaining-time semantics for active records', () => {
    expect(component.statusLabel('ATIVA')).toBe('Ativa');
    expect(component.statusLabel('CONVERTIDA')).toBe('Convertida');
    expect(component.remaining(reservation)).toContain('restantes');
  });
});
