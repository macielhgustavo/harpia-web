import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  Opportunity,
  OpportunityFilters,
  OpportunityPage,
  SalesVisit,
  SalesVisitPage,
} from '../../core/models/crm.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UserManagementService } from '../../core/services/user-management.service';
import {
  CrmVisitsComponent,
  OPPORTUNITY_LOOKUP_DEBOUNCE,
  OPPORTUNITY_LOOKUP_SIZE,
} from './crm-visits.component';

const opportunity = (id: string, name: string): Opportunity =>
  ({
    id,
    stageId: 'stage-1',
    pipelineId: 'pipeline-1',
    person: { id: `person-${id}`, name },
    development: null,
    unit: null,
  }) as unknown as Opportunity;

const opportunityPage = (
  rows: Opportunity[],
  total = rows.length,
): OpportunityPage => ({
  data: rows,
  pagination: {
    page: 1,
    pageSize: OPPORTUNITY_LOOKUP_SIZE,
    total,
    totalPages: 1,
  },
});

const visitPage: SalesVisitPage = {
  data: [],
  pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
};

const visit = (id: string, status: SalesVisit['status']): SalesVisit =>
  ({
    id,
    status,
    opportunityId: 'o-1',
    person: { id: 'person-1', name: 'João Silva' },
    scheduledAt: '2026-09-18T17:00:00.000Z',
    durationMinutes: 60,
    outcome: null,
    development: null,
    unit: null,
    assignedUser: null,
    location: null,
    result: null,
    cancellationReason: null,
  }) as SalesVisit;

describe('CrmVisitsComponent', () => {
  let fixture: ComponentFixture<CrmVisitsComponent>;
  let component: CrmVisitsComponent;
  let crm: jasmine.SpyObj<CrmService>;

  beforeEach(async () => {
    crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'listOpportunities',
      'listVisits',
      'createVisit',
      'updateVisit',
    ]);
    crm.listOpportunities.and.returnValue(
      of(opportunityPage([opportunity('o-1', 'João Silva')], 4200)),
    );
    crm.listVisits.and.returnValue(of(visitPage));

    const users = jasmine.createSpyObj<UserManagementService>(
      'UserManagementService',
      ['list'],
    );
    users.list.and.returnValue(of([]));
    const authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [CrmVisitsComponent],
      providers: [
        provideRouter([]),
        { provide: CrmService, useValue: crm },
        { provide: UserManagementService, useValue: users },
        { provide: AuthorizationService, useValue: authorization },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrmVisitsComponent);
    component = fixture.componentInstance;
  });

  it('offers a bounded first page instead of an arbitrary large one', () => {
    fixture.detectChanges();

    const filters = crm.listOpportunities.calls.mostRecent()
      .args[0] as OpportunityFilters;
    expect(filters.pageSize).toBe(OPPORTUNITY_LOOKUP_SIZE);
    expect(component.opportunityTotal()).toBe(4200);
  });

  it('tells the user how many records the lookup is not showing', () => {
    fixture.detectChanges();

    expect(component.opportunityOverflow).toBe(4199);
  });

  it('searches on the server after the debounce window', fakeAsync(() => {
    fixture.detectChanges();
    crm.listOpportunities.calls.reset();

    component.searchOpportunities('Mariana');
    expect(crm.listOpportunities).not.toHaveBeenCalled();

    tick(OPPORTUNITY_LOOKUP_DEBOUNCE);

    const filters = crm.listOpportunities.calls.mostRecent()
      .args[0] as OpportunityFilters;
    expect(filters.search).toBe('Mariana');
    expect(filters.pageSize).toBe(OPPORTUNITY_LOOKUP_SIZE);
  }));

  it('issues a single request for a burst of keystrokes', fakeAsync(() => {
    fixture.detectChanges();
    crm.listOpportunities.calls.reset();

    component.searchOpportunities('M');
    tick(100);
    component.searchOpportunities('Ma');
    tick(100);
    component.searchOpportunities('Mar');
    tick(OPPORTUNITY_LOOKUP_DEBOUNCE);

    expect(crm.listOpportunities).toHaveBeenCalledTimes(1);
    const filters = crm.listOpportunities.calls.mostRecent()
      .args[0] as OpportunityFilters;
    expect(filters.search).toBe('Mar');
  }));

  it('finds an opportunity that never fitted the first page', fakeAsync(() => {
    fixture.detectChanges();
    const far = opportunity('o-4200', 'Zuleica Andrade');
    crm.listOpportunities.and.returnValue(of(opportunityPage([far], 1)));

    component.createOpen.set(true);
    component.searchOpportunities('Zuleica');
    tick(OPPORTUNITY_LOOKUP_DEBOUNCE);
    fixture.detectChanges();

    expect(component.opportunities().map((item) => item.id)).toEqual([
      'o-4200',
    ]);
    expect(component.opportunityOverflow).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Zuleica Andrade');
  }));

  it('ignores a repeated term instead of querying again', fakeAsync(() => {
    fixture.detectChanges();
    crm.listOpportunities.calls.reset();

    component.searchOpportunities('Ana');
    tick(OPPORTUNITY_LOOKUP_DEBOUNCE);
    component.searchOpportunities('Ana');
    tick(OPPORTUNITY_LOOKUP_DEBOUNCE);

    expect(crm.listOpportunities).toHaveBeenCalledTimes(1);
  }));

  it('reports an empty lookup result', fakeAsync(() => {
    fixture.detectChanges();
    crm.listOpportunities.and.returnValue(of(opportunityPage([], 0)));

    component.searchOpportunities('inexistente');
    tick(OPPORTUNITY_LOOKUP_DEBOUNCE);
    fixture.detectChanges();

    expect(component.opportunities()).toEqual([]);
  }));

  it('only offers completion actions for scheduled visits', () => {
    const scheduled = visit('visit-1', 'AGENDADA');
    const cancelled = visit('visit-2', 'CANCELADA');
    crm.listVisits.and.returnValue(
      of({
        data: [scheduled, cancelled],
        pagination: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
      }),
    );
    fixture.detectChanges();

    component.markNoShow(cancelled);
    expect(crm.updateVisit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Cancelada');
  });

  it('refreshes a stale list after a transition conflict and preserves the error', () => {
    const scheduled = visit('visit-1', 'AGENDADA');
    crm.listVisits.and.returnValue(
      of({
        data: [scheduled],
        pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      }),
    );
    fixture.detectChanges();
    const calls = crm.listVisits.calls.count();
    crm.updateVisit.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Visita já finalizada' },
          }),
      ),
    );

    component.markNoShow(scheduled);
    fixture.detectChanges();

    expect(crm.listVisits.calls.count()).toBe(calls + 1);
    expect(component.actionError()).toContain('Visita já finalizada');
    expect(fixture.nativeElement.textContent).toContain('Visita já finalizada');
  });
});
