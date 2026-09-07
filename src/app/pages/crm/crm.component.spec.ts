import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  Board,
  BoardFilters,
  Opportunity,
  OpportunityFilters,
  OpportunityPage,
  SalesPipeline,
  SalesStage,
} from '../../core/models/crm.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { UnitService } from '../../core/services/unit.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { CrmComponent, STAGE_PAGE_SIZE } from './crm.component';

const stage = (id: string, name: string, extra: Partial<SalesStage> = {}) =>
  ({
    id,
    name,
    code: id.toUpperCase(),
    position: 0,
    colorKey: 'slate',
    defaultProbability: 50,
    isWon: false,
    isLost: false,
    ...extra,
  }) as SalesStage;

const NEGOTIATION = stage('stage-negotiation', 'Negociação');
const WON = stage('stage-won', 'Ganho', { isWon: true, position: 1 });

const opportunity = (id: string, stageId = NEGOTIATION.id): Opportunity =>
  ({
    id,
    stageId,
    pipelineId: 'pipeline-1',
    estimatedValue: '1000.00',
    probability: 50,
    stageEnteredAt: new Date().toISOString(),
    nextContactAt: null,
    person: { id: 'person-1', name: 'João Silva' },
    stage: stageId === WON.id ? WON : NEGOTIATION,
    development: null,
    unit: null,
    assignedUser: null,
  }) as unknown as Opportunity;

const boardWith = (overrides: Partial<Board> = {}): Board => ({
  pipeline: { id: 'pipeline-1', name: 'Pipeline comercial', isDefault: true },
  stages: [
    {
      stage: NEGOTIATION,
      summary: {
        total: 87,
        loaded: 2,
        hasMore: true,
        estimatedValue: '14350000.00',
        weightedValue: '9680000.00',
      },
      opportunities: [opportunity('o-1'), opportunity('o-2')],
      pagination: { page: 1, pageSize: 20, total: 87, totalPages: 5 },
    },
    {
      stage: WON,
      summary: {
        total: 0,
        loaded: 0,
        hasMore: false,
        estimatedValue: '0.00',
        weightedValue: '0.00',
      },
      opportunities: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    },
  ],
  summary: {
    total: 87,
    estimatedValue: '14350000.00',
    weightedValue: '9680000.00',
  },
  ...overrides,
});

const pipeline: SalesPipeline = {
  id: 'pipeline-1',
  name: 'Pipeline comercial',
  isDefault: true,
  isActive: true,
  organizationId: 'org-a',
  stages: [NEGOTIATION, WON],
  createdAt: '',
  updatedAt: '',
} as unknown as SalesPipeline;

const emptyList: OpportunityPage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

describe('CrmComponent', () => {
  let fixture: ComponentFixture<CrmComponent>;
  let component: CrmComponent;
  let crm: jasmine.SpyObj<CrmService>;

  beforeEach(async () => {
    crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'listPipelines',
      'getBoard',
      'listOpportunities',
      'moveOpportunity',
    ]);
    crm.listPipelines.and.returnValue(of([pipeline]));
    crm.getBoard.and.returnValue(of(boardWith()));
    crm.listOpportunities.and.returnValue(of(emptyList));
    crm.moveOpportunity.and.returnValue(of(opportunity('o-1', WON.id)));

    const people = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    people.list.and.returnValue(of([]));
    const users = jasmine.createSpyObj<UserManagementService>(
      'UserManagementService',
      ['list'],
    );
    users.list.and.returnValue(of([]));
    const developments = jasmine.createSpyObj<DevelopmentService>(
      'DevelopmentService',
      ['list'],
    );
    developments.list.and.returnValue(of([]));
    const units = jasmine.createSpyObj<UnitService>('UnitService', ['list']);
    units.list.and.returnValue(of([]));
    const authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [CrmComponent],
      providers: [
        provideRouter([]),
        { provide: CrmService, useValue: crm },
        { provide: PersonService, useValue: people },
        { provide: UserManagementService, useValue: users },
        { provide: DevelopmentService, useValue: developments },
        { provide: UnitService, useValue: units },
        { provide: AuthorizationService, useValue: authorization },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrmComponent);
    component = fixture.componentInstance;
  });

  describe('server side totals', () => {
    it('shows the stage count from the server, not the loaded page length', () => {
      fixture.detectChanges();

      const column = component.columns()[0];
      expect(column.summary.total).toBe(87);
      expect(column.opportunities.length).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('87');
    });

    it('shows the stage money aggregated over every record', () => {
      fixture.detectChanges();

      // 14.350.000,00 formatted in pt-BR, from the server aggregate.
      expect(fixture.nativeElement.textContent).toContain('14.350.000,00');
      expect(fixture.nativeElement.textContent).toContain('9.680.000,00');
    });

    it('asks the board for a bounded page per stage', () => {
      fixture.detectChanges();

      const filters = crm.getBoard.calls.mostRecent().args[0] as BoardFilters;
      expect(filters.stageLimit).toBe(STAGE_PAGE_SIZE);
    });

    it('offers to load the records the column is not showing', () => {
      fixture.detectChanges();

      expect(component.remaining(component.columns()[0])).toBe(85);
      expect(fixture.nativeElement.textContent).toContain('Carregar mais 85');
    });

    it('does not offer to load more for a complete column', () => {
      fixture.detectChanges();

      expect(component.columns()[1].summary.hasMore).toBeFalse();
    });
  });

  describe('load more', () => {
    it('appends a page to one column without touching the others', () => {
      fixture.detectChanges();
      const untouched = component.columns()[1];
      crm.listOpportunities.and.returnValue(
        of({
          data: [opportunity('o-3')],
          pagination: { page: 2, pageSize: 20, total: 87, totalPages: 5 },
        }),
      );

      component.loadMore(NEGOTIATION.id);

      const filters = crm.listOpportunities.calls.mostRecent()
        .args[0] as OpportunityFilters;
      expect(filters.stageId).toBe(NEGOTIATION.id);
      expect(filters.page).toBe(2);
      expect(component.columns()[0].opportunities.map((item) => item.id)).toEqual(
        ['o-1', 'o-2', 'o-3'],
      );
      expect(component.columns()[1]).toEqual(untouched);
    });

    it('never lists the same opportunity twice across pages', () => {
      fixture.detectChanges();
      crm.listOpportunities.and.returnValue(
        of({
          data: [opportunity('o-2'), opportunity('o-3')],
          pagination: { page: 2, pageSize: 20, total: 87, totalPages: 5 },
        }),
      );

      component.loadMore(NEGOTIATION.id);

      expect(component.columns()[0].opportunities.map((item) => item.id)).toEqual(
        ['o-1', 'o-2', 'o-3'],
      );
    });

    it('keeps the server total after appending a page', () => {
      fixture.detectChanges();
      crm.listOpportunities.and.returnValue(
        of({
          data: [opportunity('o-3')],
          pagination: { page: 2, pageSize: 20, total: 90, totalPages: 5 },
        }),
      );

      component.loadMore(NEGOTIATION.id);

      expect(component.columns()[0].summary.total).toBe(90);
      expect(component.columns()[0].summary.loaded).toBe(3);
    });
  });

  describe('drag and drop', () => {
    function startMove() {
      fixture.detectChanges();
      component.requestMove(component.columns()[0].opportunities[0], WON.id);
    }

    it('moves the card between columns and refreshes the summaries', () => {
      startMove();
      crm.getBoard.and.returnValue(
        of(
          boardWith({
            stages: [
              {
                ...boardWith().stages[0],
                summary: {
                  total: 86,
                  loaded: 0,
                  hasMore: true,
                  estimatedValue: '14349000.00',
                  weightedValue: '9679500.00',
                },
                opportunities: [],
              },
              {
                ...boardWith().stages[1],
                summary: {
                  total: 1,
                  loaded: 0,
                  hasMore: true,
                  estimatedValue: '1000.00',
                  weightedValue: '1000.00',
                },
              },
            ],
          }),
        ),
      );

      component.confirmMove();

      expect(component.columns()[0].opportunities.map((i) => i.id)).toEqual([
        'o-2',
      ]);
      expect(component.columns()[1].opportunities.map((i) => i.id)).toEqual([
        'o-1',
      ]);
      expect(component.columns()[0].summary.total).toBe(86);
      expect(component.columns()[1].summary.total).toBe(1);
      expect(component.columns()[1].summary.estimatedValue).toBe('1000.00');
    });

    it('refreshes summaries without reloading any column list', () => {
      startMove();
      crm.getBoard.calls.reset();

      component.confirmMove();

      const filters = crm.getBoard.calls.mostRecent().args[0] as BoardFilters;
      expect(filters.stageLimit).toBe(0);
    });

    it('restores both columns and their summaries when the move fails', () => {
      fixture.detectChanges();
      const before = component.columns();
      component.requestMove(before[0].opportunities[0], WON.id);
      crm.moveOpportunity.and.returnValue(throwError(() => new Error('nope')));

      component.confirmMove();

      expect(component.columns()).toEqual(before);
      expect(component.columns()[0].summary.total).toBe(87);
      expect(component.columns()[1].summary.total).toBe(0);
      expect(component.actionError()).toBeTruthy();
    });
  });

  describe('filters', () => {
    it('reloads the board with the active filters', () => {
      fixture.detectChanges();
      crm.getBoard.calls.reset();

      component.search.set('Ana');
      component.assignedUserId.set('user-1');
      component.developmentId.set('development-1');
      component.applyFilters();

      const filters = crm.getBoard.calls.mostRecent().args[0] as BoardFilters;
      expect(filters).toEqual(
        jasmine.objectContaining({
          search: 'Ana',
          assignedUserId: 'user-1',
          developmentId: 'development-1',
          pipelineId: 'pipeline-1',
        }),
      );
    });

    it('sends the same filters when loading more of a column', () => {
      fixture.detectChanges();
      component.search.set('Ana');

      component.loadMore(NEGOTIATION.id);

      const filters = crm.listOpportunities.calls.mostRecent()
        .args[0] as OpportunityFilters;
      expect(filters.search).toBe('Ana');
      expect(filters.stageId).toBe(NEGOTIATION.id);
    });

    it('switches to the list view with server pagination', () => {
      fixture.detectChanges();
      crm.listOpportunities.and.returnValue(
        of({
          data: [opportunity('o-1')],
          pagination: { page: 1, pageSize: 20, total: 42, totalPages: 3 },
        }),
      );

      component.setView('list');

      expect(component.total).toBe(42);
      expect(crm.listOpportunities).toHaveBeenCalled();
    });
  });
});
