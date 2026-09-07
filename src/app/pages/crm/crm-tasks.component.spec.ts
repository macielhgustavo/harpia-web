import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import {
  SalesActivity,
  SalesActivityFilters,
  SalesActivityPage,
} from '../../core/models/crm.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UserManagementService } from '../../core/services/user-management.service';
import {
  AGENDA_VIEWS,
  AgendaView,
  CrmTasksComponent,
  agendaViewFilters,
} from './crm-tasks.component';

/** Fixed local instant: 15 Sep 2026, 15:30. Never the machine clock. */
const NOW = new Date(2026, 8, 15, 15, 30, 0, 0).getTime();
const START_OF_TODAY = new Date(2026, 8, 15, 0, 0, 0, 0);
const START_OF_TOMORROW = new Date(2026, 8, 16, 0, 0, 0, 0);

const TODAY_MORNING = new Date(2026, 8, 15, 9, 0, 0, 0);
const TODAY_LAST_MOMENT = new Date(2026, 8, 15, 23, 59, 59, 999);
const YESTERDAY_EVENING = new Date(2026, 8, 14, 22, 0, 0, 0);
const TOMORROW_FIRST_MOMENT = new Date(2026, 8, 16, 0, 0, 0, 0);

const activity = (
  overrides: Partial<SalesActivity> = {},
): SalesActivity =>
  ({
    id: 'activity-1',
    opportunityId: 'opportunity-1',
    type: 'LIGACAO',
    status: 'PENDENTE',
    priority: 'NORMAL',
    scheduledAt: TODAY_MORNING.toISOString(),
    completedAt: null,
    summary: 'Ligar para o cliente',
    person: { id: 'person-1', name: 'João Silva' },
    assignedUser: { id: 'user-1', name: 'Lucas' },
    ...overrides,
  }) as unknown as SalesActivity;

const pageWith = (rows: SalesActivity[], total = rows.length): SalesActivityPage => ({
  data: rows,
  pagination: { page: 1, pageSize: 100, total, totalPages: 1 },
});

const emptyPage = (): SalesActivityPage => pageWith([]);

/** Which of the three open views would accept an activity at `when`. */
function openViewsMatching(when: Date): AgendaView[] {
  return (['TODAY', 'OVERDUE', 'UPCOMING'] as AgendaView[]).filter((view) => {
    const filters = agendaViewFilters(view, NOW);
    const from = filters.scheduledFrom
      ? new Date(filters.scheduledFrom).getTime()
      : Number.NEGATIVE_INFINITY;
    const to = filters.scheduledTo
      ? new Date(filters.scheduledTo).getTime()
      : Number.POSITIVE_INFINITY;
    return when.getTime() >= from && when.getTime() <= to;
  });
}

describe('CrmTasksComponent', () => {
  let fixture: ComponentFixture<CrmTasksComponent>;
  let component: CrmTasksComponent;
  let crm: jasmine.SpyObj<CrmService>;
  let users: jasmine.SpyObj<UserManagementService>;

  /** Resolves each view's request with its own page, keyed by the filters sent. */
  function respondPerView(pages: Partial<Record<AgendaView, SalesActivityPage>>) {
    crm.listActivities.and.callFake((filters: SalesActivityFilters = {}) => {
      const view = AGENDA_VIEWS.find((candidate) => {
        const expected = agendaViewFilters(candidate, NOW);
        return (
          expected.openOnly === filters.openOnly &&
          expected.status === filters.status &&
          expected.scheduledFrom === filters.scheduledFrom &&
          expected.scheduledTo === filters.scheduledTo
        );
      });
      return of((view && pages[view]) || emptyPage());
    });
  }

  function filtersFor(view: AgendaView): SalesActivityFilters {
    const expected = agendaViewFilters(view, NOW);
    const calls = crm.listActivities.calls
      .allArgs()
      .map(([filters]) => filters as SalesActivityFilters);
    const match = calls.find(
      (filters) =>
        expected.openOnly === filters.openOnly &&
        expected.status === filters.status &&
        expected.scheduledFrom === filters.scheduledFrom &&
        expected.scheduledTo === filters.scheduledTo,
    );
    if (!match) throw new Error(`No request issued for view ${view}`);
    return match;
  }

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(NOW);

    crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'listActivities',
      'updateActivity',
    ]);
    crm.listActivities.and.returnValue(of(emptyPage()));
    crm.updateActivity.and.returnValue(of(activity()));

    users = jasmine.createSpyObj<UserManagementService>(
      'UserManagementService',
      ['list'],
    );
    users.list.and.returnValue(
      of([{ id: 'user-1', name: 'Lucas' } as unknown as ManagedUser]),
    );

    const authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);

    const session = jasmine.createSpyObj<AuthSessionService>(
      'AuthSessionService',
      ['getClaims'],
    );
    session.getClaims.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [CrmTasksComponent],
      providers: [
        provideRouter([]),
        { provide: CrmService, useValue: crm },
        { provide: UserManagementService, useValue: users },
        { provide: AuthorizationService, useValue: authorization },
        { provide: AuthSessionService, useValue: session },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrmTasksComponent);
    component = fixture.componentInstance;
  });

  describe('view filters', () => {
    it('asks the backend for open activities scheduled today', () => {
      fixture.detectChanges();

      expect(filtersFor('TODAY')).toEqual(
        jasmine.objectContaining({
          openOnly: true,
          scheduledFrom: START_OF_TODAY.toISOString(),
          scheduledTo: new Date(
            START_OF_TOMORROW.getTime() - 1,
          ).toISOString(),
        }),
      );
      expect(filtersFor('TODAY').status).toBeUndefined();
    });

    it('asks the backend for open activities scheduled before today', () => {
      fixture.detectChanges();

      expect(filtersFor('OVERDUE')).toEqual(
        jasmine.objectContaining({
          openOnly: true,
          scheduledTo: new Date(START_OF_TODAY.getTime() - 1).toISOString(),
        }),
      );
      expect(filtersFor('OVERDUE').scheduledFrom).toBeUndefined();
    });

    it('asks the backend for open activities scheduled after today', () => {
      fixture.detectChanges();

      expect(filtersFor('UPCOMING')).toEqual(
        jasmine.objectContaining({
          openOnly: true,
          scheduledFrom: START_OF_TOMORROW.toISOString(),
        }),
      );
      expect(filtersFor('UPCOMING').scheduledTo).toBeUndefined();
    });

    it('asks the backend for completed activities without openOnly', () => {
      fixture.detectChanges();

      const filters = filtersFor('COMPLETED');
      expect(filters.status).toBe('CONCLUIDA');
      expect(filters.openOnly).toBeUndefined();
      expect(filters.scheduledFrom).toBeUndefined();
      expect(filters.scheduledTo).toBeUndefined();
    });

    it('keeps every open view restricted to open activities', () => {
      fixture.detectChanges();

      for (const view of ['TODAY', 'OVERDUE', 'UPCOMING', 'ALL'] as AgendaView[]) {
        expect(filtersFor(view).openOnly).toBeTrue();
        expect(filtersFor(view).status).toBeUndefined();
      }
    });
  });

  describe('mutual exclusivity', () => {
    it('keeps an activity scheduled earlier today only in Hoje', () => {
      expect(openViewsMatching(TODAY_MORNING)).toEqual(['TODAY']);
    });

    it('keeps the last moment of today only in Hoje', () => {
      expect(openViewsMatching(TODAY_LAST_MOMENT)).toEqual(['TODAY']);
    });

    it('keeps yesterday only in Atrasadas', () => {
      expect(openViewsMatching(YESTERDAY_EVENING)).toEqual(['OVERDUE']);
    });

    it('keeps the first moment of tomorrow only in Próximas', () => {
      expect(openViewsMatching(TOMORROW_FIRST_MOMENT)).toEqual(['UPCOMING']);
    });

    it('leaves no gap between the three open views', () => {
      const boundaries = [
        new Date(START_OF_TODAY.getTime() - 1),
        START_OF_TODAY,
        TODAY_MORNING,
        TODAY_LAST_MOMENT,
        START_OF_TOMORROW,
      ];
      for (const moment of boundaries) {
        expect(openViewsMatching(moment).length).toBe(1);
      }
    });
  });

  describe('lists and badges', () => {
    it('shows the rows and the badge produced by the very same query', () => {
      respondPerView({
        TODAY: pageWith([activity({ id: 'today-1' })], 1),
        OVERDUE: pageWith(
          [activity({ id: 'late-1', scheduledAt: YESTERDAY_EVENING.toISOString() })],
          7,
        ),
      });
      fixture.detectChanges();

      expect(component.todayCount()).toBe(1);
      expect(component.overdueCount()).toBe(7);
      expect(component.visibleActivities().map((item) => item.id)).toEqual([
        'today-1',
      ]);

      component.select('OVERDUE');
      fixture.detectChanges();

      expect(component.visibleActivities().map((item) => item.id)).toEqual([
        'late-1',
      ]);
    });

    it('lists completed activities in the Concluídas view only', () => {
      respondPerView({
        COMPLETED: pageWith([
          activity({
            id: 'done-1',
            status: 'CONCLUIDA',
            completedAt: TODAY_MORNING.toISOString(),
          }),
        ]),
      });
      fixture.detectChanges();

      expect(component.visibleActivities()).toEqual([]);
      expect(component.completedCount()).toBe(1);

      component.select('COMPLETED');
      fixture.detectChanges();

      expect(component.visibleActivities().map((item) => item.id)).toEqual([
        'done-1',
      ]);
      expect(fixture.nativeElement.textContent).toContain('Concluída');
    });

    it('never flags an activity of today as late', () => {
      fixture.detectChanges();

      expect(component.isLate(activity())).toBeFalse();
      expect(
        component.isLate(
          activity({ scheduledAt: YESTERDAY_EVENING.toISOString() }),
        ),
      ).toBeTrue();
      expect(
        component.isLate(
          activity({
            status: 'CONCLUIDA',
            scheduledAt: YESTERDAY_EVENING.toISOString(),
          }),
        ),
      ).toBeFalse();
    });

    it('warns when the view holds more activities than the page shows', () => {
      respondPerView({ TODAY: pageWith([activity()], 250) });
      fixture.detectChanges();

      expect(component.truncated()).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain(
        'Mostrando as primeiras 1 de 250',
      );
    });
  });

  describe('tab switching', () => {
    it('loads every view once and switches without new requests', () => {
      fixture.detectChanges();
      const afterLoad = crm.listActivities.calls.count();

      component.select('OVERDUE');
      fixture.detectChanges();
      component.select('COMPLETED');
      fixture.detectChanges();

      expect(afterLoad).toBe(AGENDA_VIEWS.length);
      expect(crm.listActivities.calls.count()).toBe(afterLoad);
      expect(component.view()).toBe('COMPLETED');
    });

    it('ignores a stale response that resolves after a newer load', () => {
      fixture.detectChanges();
      respondPerView({ TODAY: pageWith([activity({ id: 'stale' })], 99) });
      component.load();
      respondPerView({ TODAY: pageWith([activity({ id: 'fresh' })], 3) });
      component.load();

      expect(component.todayCount()).toBe(3);
      expect(component.visibleActivities().map((item) => item.id)).toEqual([
        'fresh',
      ]);
    });
  });

  describe('filters', () => {
    it('preserves the priority filter across every view', () => {
      fixture.detectChanges();
      crm.listActivities.calls.reset();

      component.priority.set('URGENTE');
      component.load();

      for (const view of AGENDA_VIEWS) {
        expect(filtersFor(view).priority).toBe('URGENTE');
      }
    });

    it('preserves the assigned user filter across every view', () => {
      fixture.detectChanges();
      crm.listActivities.calls.reset();

      component.assignedUserId.set('user-9');
      component.load();

      for (const view of AGENDA_VIEWS) {
        expect(filtersFor(view).assignedUserId).toBe('user-9');
      }
    });

    it('omits an empty assigned user instead of sending a blank value', () => {
      fixture.detectChanges();

      expect(filtersFor('TODAY').assignedUserId).toBeUndefined();
    });
  });

  describe('empty states', () => {
    const messages: Record<AgendaView, string> = {
      TODAY: 'Nenhuma atividade para hoje.',
      OVERDUE: 'Nenhuma atividade atrasada.',
      UPCOMING: 'Nenhuma atividade futura.',
      COMPLETED: 'Nenhuma atividade concluída.',
      ALL: 'Nenhuma atividade aberta.',
    };

    for (const view of AGENDA_VIEWS) {
      it(`explains the empty ${view} view`, () => {
        fixture.detectChanges();
        component.select(view);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain(messages[view]);
      });
    }
  });

  describe('loading and error', () => {
    it('starts loading and clears it once every view answers', () => {
      expect(component.loading()).toBeTrue();

      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
      expect(fixture.nativeElement.textContent).not.toContain(
        'Carregando agenda',
      );
    });

    it('shows the loading placeholder while the requests are pending', () => {
      crm.listActivities.and.returnValue(NEVER);

      fixture.detectChanges();

      expect(component.loading()).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Carregando agenda');
    });

    it('surfaces a load failure and retries on demand', () => {
      crm.listActivities.and.returnValue(
        throwError(() => new Error('offline')),
      );
      fixture.detectChanges();

      expect(component.loadError()).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Tentar novamente');

      crm.listActivities.and.returnValue(of(pageWith([activity()])));
      component.load();
      fixture.detectChanges();

      expect(component.loadError()).toBe('');
      expect(component.visibleActivities().length).toBe(1);
    });

    it('keeps an action failure out of the blocking error state', () => {
      respondPerView({ TODAY: pageWith([activity()]) });
      fixture.detectChanges();
      crm.updateActivity.and.returnValue(
        throwError(() => new Error('conflict')),
      );

      component.complete(activity());

      expect(component.actionError()).toBeTruthy();
      expect(component.loadError()).toBe('');
      expect(component.visibleActivities().length).toBe(1);
    });
  });
});
