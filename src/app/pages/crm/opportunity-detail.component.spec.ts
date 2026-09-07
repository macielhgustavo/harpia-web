import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import {
  CreateSalesVisitInput,
  Opportunity,
  SalesActivityPage,
  SalesPipeline,
  SalesStage,
  SalesVisit,
  SalesVisitPage,
  UpdateSalesVisitInput,
} from '../../core/models/crm.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { ProposalPage } from '../../core/models/proposal.model';
import { ReservationPage } from '../../core/models/reservation.model';
import { UnitListItem } from '../../core/models/unit.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { ProposalService } from '../../core/services/proposal.service';
import { ReservationService } from '../../core/services/reservation.service';
import { UnitService } from '../../core/services/unit.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { OpportunityDetailComponent } from './opportunity-detail.component';
import { VISITS_PAGE_SIZE } from './visits-section.component';

const OPPORTUNITY_ID = 'opportunity-1';

const STAGE = {
  id: 'stage-visit',
  name: 'Visita',
  code: 'VISITA',
  position: 3,
  colorKey: 'slate',
  defaultProbability: 50,
  isWon: false,
  isLost: false,
} as SalesStage;

const PIPELINE = {
  id: 'pipeline-1',
  name: 'Pipeline comercial',
  isDefault: true,
  isActive: true,
  stages: [STAGE],
} as unknown as SalesPipeline;

const AURORA = {
  id: 'development-1',
  name: 'Residencial Aurora',
} as unknown as DevelopmentListItem;

const UNIT_305 = {
  id: 'unit-305',
  developmentId: 'development-1',
  identifier: '305',
  prices: [],
} as unknown as UnitListItem;

const LUCAS = {
  id: 'user-lucas',
  name: 'Lucas',
  email: 'lucas@harpia.test',
  isActive: true,
} as unknown as ManagedUser;

const opportunityWith = (overrides: Partial<Opportunity> = {}): Opportunity =>
  ({
    id: OPPORTUNITY_ID,
    organizationId: 'org-a',
    personId: 'person-1',
    pipelineId: PIPELINE.id,
    stageId: STAGE.id,
    assignedUserId: LUCAS.id,
    developmentId: AURORA.id,
    unitId: UNIT_305.id,
    source: 'Instagram',
    estimatedValue: '489000.00',
    probability: 50,
    nextContactAt: null,
    expectedCloseDate: null,
    lostReason: null,
    notes: null,
    stageEnteredAt: '2026-09-01T12:00:00.000Z',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    person: {
      id: 'person-1',
      name: 'João Silva',
      email: null,
      phone: null,
      roles: [],
    },
    pipeline: { id: PIPELINE.id, name: PIPELINE.name },
    stage: STAGE,
    assignedUser: { id: LUCAS.id, name: 'Lucas', email: LUCAS.email },
    development: { id: AURORA.id, name: AURORA.name },
    unit: { id: UNIT_305.id, identifier: '305', developmentId: AURORA.id },
    _count: { activities: 0, stageHistory: 1 },
    ...overrides,
  }) as Opportunity;

const visitWith = (overrides: Partial<SalesVisit> = {}): SalesVisit =>
  ({
    id: 'visit-1',
    organizationId: 'org-a',
    opportunityId: OPPORTUNITY_ID,
    personId: 'person-1',
    assignedUserId: LUCAS.id,
    developmentId: AURORA.id,
    unitId: UNIT_305.id,
    scheduledAt: '2026-09-18T17:00:00.000Z',
    durationMinutes: 60,
    status: 'AGENDADA',
    outcome: null,
    location: null,
    result: null,
    notes: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
    opportunity: { id: OPPORTUNITY_ID, stageId: STAGE.id },
    person: { id: 'person-1', name: 'João Silva', email: null, phone: null },
    assignedUser: { id: LUCAS.id, name: 'Lucas', email: LUCAS.email },
    createdByUser: { id: LUCAS.id, name: 'Lucas' },
    development: { id: AURORA.id, name: AURORA.name },
    unit: { id: UNIT_305.id, identifier: '305', developmentId: AURORA.id },
    ...overrides,
  }) as SalesVisit;

const visitPage = (
  data: SalesVisit[],
  total = data.length,
): SalesVisitPage => ({
  data,
  pagination: {
    page: 1,
    pageSize: VISITS_PAGE_SIZE,
    total,
    totalPages: total ? 1 : 0,
  },
});

const emptyActivities: SalesActivityPage = {
  data: [],
  pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
};

describe('OpportunityDetailComponent — visits', () => {
  let fixture: ComponentFixture<OpportunityDetailComponent>;
  let component: OpportunityDetailComponent;
  let crm: jasmine.SpyObj<CrmService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;
  let units: jasmine.SpyObj<UnitService>;

  const section = () => component.visitsSection()!;
  const text = () => fixture.nativeElement.textContent as string;

  const build = (opportunity = opportunityWith()) => {
    crm.getOpportunity.and.returnValue(of(opportunity));
    fixture = TestBed.createComponent(OpportunityDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'getOpportunity',
      'listPipelines',
      'listActivities',
      'getHistory',
      'getTimeline',
      'listVisits',
      'createVisit',
      'updateVisit',
      'createActivity',
      'removeActivity',
      'moveOpportunity',
      'removeOpportunity',
      'listOpportunities',
    ]);
    crm.getOpportunity.and.returnValue(of(opportunityWith()));
    crm.listPipelines.and.returnValue(of([PIPELINE]));
    crm.listActivities.and.returnValue(of(emptyActivities));
    crm.getHistory.and.returnValue(of([]));
    crm.getTimeline.and.returnValue(of([]));
    crm.listVisits.and.returnValue(of(visitPage([visitWith()])));
    crm.createVisit.and.returnValue(of(visitWith()));
    crm.updateVisit.and.returnValue(of(visitWith()));
    crm.listOpportunities.and.returnValue(
      of({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
    );

    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);

    units = jasmine.createSpyObj<UnitService>('UnitService', ['list']);
    units.list.and.returnValue(of([UNIT_305]));

    const people = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    people.list.and.returnValue(of([]));
    const users = jasmine.createSpyObj<UserManagementService>(
      'UserManagementService',
      ['list'],
    );
    users.list.and.returnValue(of([LUCAS]));
    const developments = jasmine.createSpyObj<DevelopmentService>(
      'DevelopmentService',
      ['list'],
    );
    developments.list.and.returnValue(of([AURORA]));
    const reservations = jasmine.createSpyObj<ReservationService>(
      'ReservationService',
      ['list'],
    );
    reservations.list.and.returnValue(
      of({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      } as ReservationPage),
    );
    const proposals = jasmine.createSpyObj<ProposalService>('ProposalService', [
      'list',
    ]);
    proposals.list.and.returnValue(
      of({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      } as ProposalPage),
    );

    await TestBed.configureTestingModule({
      imports: [OpportunityDetailComponent],
      providers: [
        provideRouter([]),
        { provide: CrmService, useValue: crm },
        { provide: AuthorizationService, useValue: authorization },
        { provide: UnitService, useValue: units },
        { provide: PersonService, useValue: people },
        { provide: UserManagementService, useValue: users },
        { provide: DevelopmentService, useValue: developments },
        { provide: ReservationService, useValue: reservations },
        { provide: ProposalService, useValue: proposals },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: OPPORTUNITY_ID })),
          },
        },
      ],
    }).compileComponents();
  });

  describe('section presence and content', () => {
    it('renders a visits section of its own inside the opportunity', () => {
      build();

      expect(section()).toBeTruthy();
      expect(text()).toContain('Visitas');
    });

    it('asks only for the visits of this opportunity', () => {
      build();

      expect(crm.listVisits).toHaveBeenCalledWith({
        opportunityId: OPPORTUNITY_ID,
        pageSize: VISITS_PAGE_SIZE,
      });
    });

    it('shows date, place, unit, owner and status of a scheduled visit', () => {
      build();

      expect(text()).toContain('Residencial Aurora');
      expect(text()).toContain('Unidade 305');
      expect(text()).toContain('Lucas');
      expect(text()).toContain('Agendada');
      expect(text()).toContain('Próximas visitas');
    });

    it('shows the outcome of a visit already carried out', () => {
      crm.listVisits.and.returnValue(
        of(
          visitPage([
            visitWith({
              id: 'visit-done',
              status: 'REALIZADA',
              outcome: 'INTERESSE_ALTO',
              completedAt: '2026-09-12T17:00:00.000Z',
            }),
          ]),
        ),
      );
      build();

      expect(text()).toContain('Histórico');
      expect(text()).toContain('Realizada');
      expect(text()).toContain('Interesse alto');
    });

    it('puts open visits before history and sorts each side by time', () => {
      crm.listVisits.and.returnValue(
        of(
          visitPage([
            visitWith({
              id: 'later',
              scheduledAt: '2026-09-25T17:00:00.000Z',
            }),
            visitWith({
              id: 'sooner',
              scheduledAt: '2026-09-18T17:00:00.000Z',
            }),
            visitWith({
              id: 'old',
              status: 'REALIZADA',
              scheduledAt: '2026-09-01T17:00:00.000Z',
            }),
            visitWith({
              id: 'recent',
              status: 'CANCELADA',
              scheduledAt: '2026-09-10T17:00:00.000Z',
              cancellationReason: 'Cliente adiou',
            }),
          ]),
        ),
      );
      build();

      expect(
        section()
          .scheduled()
          .map((visit) => visit.id),
      ).toEqual(['sooner', 'later']);
      expect(
        section()
          .history()
          .map((visit) => visit.id),
      ).toEqual(['recent', 'old']);
    });

    it('never renders a visit that belongs to another opportunity', () => {
      crm.listVisits.and.returnValue(
        of(
          visitPage([
            visitWith(),
            visitWith({
              id: 'visit-other',
              opportunityId: 'opportunity-2',
              development: { id: 'development-9', name: 'Outro Residencial' },
            }),
          ]),
        ),
      );
      build();

      expect(
        section()
          .page()
          .data.map((visit) => visit.id),
      ).toEqual(['visit-1']);
      expect(text()).not.toContain('Outro Residencial');
    });
  });

  describe('loading, empty and error states', () => {
    it('shows an empty state with a call to action when there is no visit', () => {
      crm.listVisits.and.returnValue(of(visitPage([])));
      build();

      expect(text()).toContain('Nenhuma visita agendada.');
      expect(text()).toContain(
        'Agende uma visita para avançar esta oportunidade.',
      );
    });

    it('has a loading state of its own that does not block the page', () => {
      crm.listVisits.and.returnValue(NEVER);
      build();

      expect(section().loading()).toBeTrue();
      expect(text()).toContain('Carregando visitas...');
      // The rest of the opportunity is already usable.
      expect(text()).toContain('Resumo comercial');
      expect(component.loadError()).toBe('');
    });

    it('keeps the opportunity usable when the visits fail to load', () => {
      crm.listVisits.and.returnValue(
        throwError(() => new Error('network down')),
      );
      build();

      expect(section().loadError()).toContain('visitas');
      expect(text()).toContain('Resumo comercial');
      expect(text()).toContain('Linha do tempo comercial');
      expect(component.loadError()).toBe('');
    });

    it('retries loading the visits without reloading the page', () => {
      crm.listVisits.and.returnValue(
        throwError(() => new Error('network down')),
      );
      build();
      const detailCalls = crm.getOpportunity.calls.count();

      crm.listVisits.and.returnValue(of(visitPage([visitWith()])));
      section().load();
      fixture.detectChanges();

      expect(section().loadError()).toBe('');
      expect(text()).toContain('Residencial Aurora');
      expect(crm.getOpportunity.calls.count()).toBe(detailCalls);
    });
  });

  describe('scheduling a visit', () => {
    it('offers the quick action in the opportunity header', () => {
      build();

      // No intermediate navigation: the action lives next to the other ones.
      const header: HTMLElement = fixture.nativeElement.querySelector('header');
      expect(header.textContent).toContain('Agendar visita');

      component.scheduleVisit();
      fixture.detectChanges();

      expect(section().createOpen()).toBeTrue();
    });

    it('prefills the form with the context of the opportunity', () => {
      build();
      component.scheduleVisit();

      expect(section().formDevelopmentId).toBe(AURORA.id);
      expect(section().formUnitId).toBe(UNIT_305.id);
      expect(section().formAssignedUserId).toBe(LUCAS.id);
    });

    it('creates the visit bound to the opportunity', () => {
      build();
      component.scheduleVisit();
      section().formScheduledAt = '2026-09-18T14:00';
      section().createVisit();

      const payload = crm.createVisit.calls.mostRecent()
        .args[0] as CreateSalesVisitInput;
      expect(payload.opportunityId).toBe(OPPORTUNITY_ID);
      expect(payload.developmentId).toBe(AURORA.id);
      expect(payload.unitId).toBe(UNIT_305.id);
      expect(payload.assignedUserId).toBe(LUCAS.id);
      expect(payload.scheduledAt).toBe(
        new Date('2026-09-18T14:00').toISOString(),
      );
    });

    it('refuses to submit without a date and keeps the form open', () => {
      build();
      component.scheduleVisit();
      section().createVisit();
      fixture.detectChanges();

      expect(crm.createVisit).not.toHaveBeenCalled();
      expect(section().createOpen()).toBeTrue();
      expect(section().formError()).toContain('data');
    });

    it('schedules a visit to the development when there is no unit', () => {
      build(opportunityWith({ unitId: null, unit: null }));
      component.scheduleVisit();

      expect(section().formDevelopmentId).toBe(AURORA.id);
      expect(section().formUnitId).toBe('');

      section().formScheduledAt = '2026-09-18T14:00';
      section().createVisit();

      const payload = crm.createVisit.calls.mostRecent()
        .args[0] as CreateSalesVisitInput;
      expect(payload.developmentId).toBe(AURORA.id);
      expect('unitId' in payload).toBeFalse();
    });

    it('lets the user choose a development when the opportunity has none', () => {
      build(
        opportunityWith({
          developmentId: null,
          development: null,
          unitId: null,
          unit: null,
        }),
      );
      component.scheduleVisit();

      expect(section().formDevelopmentId).toBe('');

      section().onFormDevelopmentChange(AURORA.id);
      fixture.detectChanges();

      expect(units.list).toHaveBeenCalledWith({ developmentId: AURORA.id });
      expect(section().units()).toEqual([UNIT_305]);
      // A stale unit from another development can never survive the change.
      expect(section().formUnitId).toBe('');
    });

    it('clears the selected unit when the development changes', () => {
      build();
      component.scheduleVisit();
      section().formUnitId = UNIT_305.id;

      section().onFormDevelopmentChange('development-2');

      expect(section().formUnitId).toBe('');
    });
  });

  describe('visit lifecycle', () => {
    it('reschedules the visit in place, without touching its status', () => {
      build();
      section().openReschedule(section().scheduled()[0]);
      section().formScheduledAt = '2026-09-20T15:30';
      section().reschedule();

      const [id, payload] = crm.updateVisit.calls.mostRecent().args as [
        string,
        UpdateSalesVisitInput,
      ];
      expect(id).toBe('visit-1');
      expect(payload.scheduledAt).toBe(
        new Date('2026-09-20T15:30').toISOString(),
      );
      expect(payload.status).toBeUndefined();
    });

    it('prefills the reschedule form with the current visit', () => {
      build();
      section().openReschedule(section().scheduled()[0]);

      expect(section().formDurationMinutes).toBe(60);
      expect(section().formAssignedUserId).toBe(LUCAS.id);
      expect(section().formScheduledAt).toBeTruthy();
    });

    it('marks the visit as carried out with a structured outcome', () => {
      build();
      section().openComplete(section().scheduled()[0]);
      section().formOutcome = 'INTERESSE_MEDIO';
      section().formResult = 'Gostou da planta';
      section().completeVisit();

      const [id, payload] = crm.updateVisit.calls.mostRecent().args as [
        string,
        UpdateSalesVisitInput,
      ];
      expect(id).toBe('visit-1');
      expect(payload.status).toBe('REALIZADA');
      expect(payload.outcome).toBe('INTERESSE_MEDIO');
      expect(payload.result).toBe('Gostou da planta');
    });

    it('offers only the outcomes the backend accepts', () => {
      build();

      expect(section().outcomes.map((option) => option.value)).toEqual([
        'INTERESSE_ALTO',
        'INTERESSE_MEDIO',
        'INTERESSE_BAIXO',
        'SEM_INTERESSE',
        'REAGENDAR',
      ]);
    });

    it('records a no show without moving the scheduled time', () => {
      build();
      section().markNoShow(section().scheduled()[0]);

      const [id, payload] = crm.updateVisit.calls.mostRecent().args as [
        string,
        UpdateSalesVisitInput,
      ];
      expect(id).toBe('visit-1');
      expect(payload).toEqual({ status: 'NAO_COMPARECEU' });
    });

    it('cancels the visit with the reason the backend requires', () => {
      build();
      section().openCancel(section().scheduled()[0]);
      section().formCancellationReason = 'Cliente adiou';
      section().cancelVisit();

      const [, payload] = crm.updateVisit.calls.mostRecent().args as [
        string,
        UpdateSalesVisitInput,
      ];
      expect(payload.status).toBe('CANCELADA');
      expect(payload.cancellationReason).toBe('Cliente adiou');
    });

    it('does not call the API to cancel without a reason', () => {
      build();
      section().openCancel(section().scheduled()[0]);
      section().formCancellationReason = '   ';
      section().cancelVisit();
      fixture.detectChanges();

      expect(crm.updateVisit).not.toHaveBeenCalled();
      expect(section().formError()).toContain('motivo');
      expect(section().cancelTarget()).toBeTruthy();
    });
  });

  describe('after an action', () => {
    it('reloads the section and lets the backend rebuild the timeline', () => {
      build();
      const listCalls = crm.listVisits.calls.count();
      const timelineCalls = crm.getTimeline.calls.count();

      section().markNoShow(section().scheduled()[0]);
      fixture.detectChanges();

      expect(crm.listVisits.calls.count()).toBe(listCalls + 1);
      expect(crm.getTimeline.calls.count()).toBe(timelineCalls + 1);
      expect(text()).toContain('Não comparecimento registrado.');
    });

    it('keeps the page alive when an action fails', () => {
      build();
      crm.updateVisit.and.returnValue(throwError(() => new Error('conflict')));

      section().markNoShow(section().scheduled()[0]);
      fixture.detectChanges();

      expect(section().actionError()).toBeTruthy();
      expect(text()).toContain('Resumo comercial');
      expect(text()).toContain('Residencial Aurora');
      expect(component.loadError()).toBe('');
      expect(section().loadError()).toBe('');
    });
  });

  describe('permissions', () => {
    it('hides every mutation when the user has no CRM_WRITE', () => {
      authorization.hasPermission.and.callFake(
        (permission: string) => permission !== 'CRM_WRITE',
      );
      crm.listVisits.and.returnValue(of(visitPage([visitWith()])));
      build();

      expect(section().canWrite).toBeFalse();
      expect(text()).toContain('Residencial Aurora');
      expect(text()).not.toContain('Agendar visita');
      expect(text()).not.toContain('Reagendar');
      expect(text()).not.toContain('Marcar como realizada');
      expect(text()).not.toContain('Não compareceu');
    });

    it('refuses the mutations even if they are invoked directly', () => {
      authorization.hasPermission.and.callFake(
        (permission: string) => permission !== 'CRM_WRITE',
      );
      build();

      component.scheduleVisit();
      section().openCreate();
      section().markNoShow(visitWith());

      expect(section().createOpen()).toBeFalse();
      expect(crm.updateVisit).not.toHaveBeenCalled();
      expect(crm.createVisit).not.toHaveBeenCalled();
    });

    it('does not read the visits without CRM_READ', () => {
      authorization.hasPermission.and.callFake(
        (permission: string) => permission !== 'CRM_READ',
      );
      build();

      expect(crm.listVisits).not.toHaveBeenCalled();
      expect(text()).not.toContain('Carregando visitas...');
    });
  });
});
