import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import {
  Opportunity,
  OpportunityPropertyInterest,
  UnitMatch,
  UnitMatchesPage,
} from '../../core/models/crm.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { UnitTypeListItem } from '../../core/models/unit-type.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { PropertyInterestSectionComponent } from './property-interest-section.component';

const DEVELOPMENT = {
  id: 'development-1',
  name: 'Residencial Aurora',
} as DevelopmentListItem;
const OTHER_DEVELOPMENT = {
  id: 'development-2',
  name: 'Parque Central',
} as DevelopmentListItem;
const UNIT_TYPE = {
  id: 'type-1',
  developmentId: DEVELOPMENT.id,
  name: 'Apartamento 2 dormitórios',
} as UnitTypeListItem;
const OPPORTUNITY = {
  id: 'opportunity-1',
  developmentId: DEVELOPMENT.id,
  unitId: null,
  unit: null,
} as Opportunity;
const PROFILE: OpportunityPropertyInterest = {
  id: 'interest-1',
  organizationId: 'org-a',
  opportunityId: OPPORTUNITY.id,
  developmentId: DEVELOPMENT.id,
  unitTypeId: UNIT_TYPE.id,
  minBedrooms: 2,
  maxBedrooms: 3,
  minArea: 70,
  maxArea: 90,
  minPrice: '300000.00',
  maxPrice: '500000.00',
  availableDownPayment: '80000.00',
  purpose: 'MORADIA',
  notes: 'Perto do metrô',
  createdAt: '2026-09-21T12:00:00.000Z',
  updatedAt: '2026-09-21T12:00:00.000Z',
  development: { id: DEVELOPMENT.id, name: DEVELOPMENT.name },
  unitType: {
    id: UNIT_TYPE.id,
    name: UNIT_TYPE.name,
    developmentId: DEVELOPMENT.id,
    bedrooms: 2,
    standardArea: 78,
  },
};
const MATCH = {
  unit: {
    id: 'unit-1',
    identifier: 'A-101',
    status: 'DISPONIVEL',
    isSelected: false,
  },
  development: { id: DEVELOPMENT.id, name: DEVELOPMENT.name },
  unitType: { id: UNIT_TYPE.id, name: UNIT_TYPE.name },
  features: { bedrooms: 2, area: '78.00' },
  price: { value: '450000.00', priceTable: { id: 'table-1', name: 'Vigente' } },
  compatibility: { matched: 3, evaluated: 3, mismatched: 0, notEvaluated: 0 },
  compatibilityScore: 100,
  compatibilityLevel: 'EXCELENTE',
  evaluatedWeight: 100,
  scoreFactors: [
    {
      criterion: 'PRICE',
      weight: 50,
      criterionScore: 100,
      contribution: '50.00',
      maximumContribution: 50,
      status: 'MATCH',
      explanation: 'Dentro do orçamento',
    },
    {
      criterion: 'AREA',
      weight: 25,
      criterionScore: 100,
      contribution: '25.00',
      maximumContribution: 25,
      status: 'MATCH',
      explanation: 'Área dentro da faixa',
    },
    {
      criterion: 'BEDROOMS',
      weight: 25,
      criterionScore: 100,
      contribution: '25.00',
      maximumContribution: 25,
      status: 'MATCH',
      explanation: 'Quartos dentro da faixa',
    },
  ],
  ranking: {
    priceWithinRange: true,
    matchedSoft: 3,
    mismatchedSoft: 0,
    priceDeviation: '0.00',
  },
  criteria: [
    {
      code: 'PRICE',
      kind: 'SOFT',
      status: 'MATCH',
      message: 'R$ 450.000,00 dentro da faixa',
      actual: '450000.00',
    },
  ],
} as UnitMatch;
const matchesPage = (
  data: UnitMatch[],
  page: number,
  total: number,
): UnitMatchesPage => ({
  data,
  reason: null,
  pagination: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) },
});

describe('PropertyInterestSectionComponent', () => {
  let fixture: ComponentFixture<PropertyInterestSectionComponent>;
  let component: PropertyInterestSectionComponent;
  let crm: jasmine.SpyObj<CrmService>;
  let unitTypes: jasmine.SpyObj<UnitTypeService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  const text = () => fixture.nativeElement.textContent as string;

  const build = (opportunity: Opportunity = OPPORTUNITY) => {
    fixture = TestBed.createComponent(PropertyInterestSectionComponent);
    fixture.componentRef.setInput('opportunity', opportunity);
    fixture.componentRef.setInput('developments', [
      DEVELOPMENT,
      OTHER_DEVELOPMENT,
    ]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'getPropertyInterest',
      'upsertPropertyInterest',
      'removePropertyInterest',
      'getUnitMatches',
      'updateOpportunity',
    ]);
    crm.getPropertyInterest.and.returnValue(of(null));
    crm.upsertPropertyInterest.and.returnValue(of(PROFILE));
    crm.removePropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValue(of(matchesPage([MATCH], 1, 1)));
    crm.updateOpportunity.and.returnValue(
      of({
        ...OPPORTUNITY,
        developmentId: DEVELOPMENT.id,
        unitId: MATCH.unit.id,
        unit: {
          id: MATCH.unit.id,
          identifier: MATCH.unit.identifier,
          developmentId: DEVELOPMENT.id,
          unitTypeId: UNIT_TYPE.id,
        },
      }),
    );
    unitTypes = jasmine.createSpyObj<UnitTypeService>('UnitTypeService', [
      'list',
    ]);
    unitTypes.list.and.returnValue(of([UNIT_TYPE]));
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);
    await TestBed.configureTestingModule({
      imports: [PropertyInterestSectionComponent],
      providers: [
        provideRouter([]),
        { provide: CrmService, useValue: crm },
        { provide: UnitTypeService, useValue: unitTypes },
        { provide: AuthorizationService, useValue: authorization },
      ],
    }).compileComponents();
  });

  it('shows the empty state and add action without a profile', () => {
    build();
    expect(crm.getPropertyInterest).toHaveBeenCalledOnceWith(OPPORTUNITY.id);
    expect(text()).toContain('Nenhuma preferência imobiliária registrada');
    expect(text()).toContain('Adicionar preferências');
  });

  it('renders the profile with type, area, price, down payment and purpose', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    expect(text()).toContain('Residencial Aurora');
    expect(text()).toContain('Apartamento 2 dormitórios');
    expect(text()).toContain('2–3 quartos');
    expect(text()).toContain('70–90 m²');
    expect(text().replace(/\u00a0/g, ' ')).toContain('R$ 500.000,00');
    expect(text().replace(/\u00a0/g, ' ')).toContain('R$ 80.000,00');
    expect(text()).toContain('Moradia');
    expect(text()).toContain('Perto do metrô');
  });

  it('distinguishes a selected unit from preferences', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build({
      ...OPPORTUNITY,
      unitId: 'unit-305',
      unit: {
        id: 'unit-305',
        identifier: '305',
        developmentId: DEVELOPMENT.id,
        unitTypeId: UNIT_TYPE.id,
      },
    });
    expect(text()).toContain('Tipologia desejada');
    expect(text()).toContain('Unidade selecionada atualmente');
    expect(text()).toContain('Unidade 305');
  });

  it('does not invent a selected unit when opportunity.unitId is null', () => {
    build();
    expect(text()).not.toContain('Unidade selecionada atualmente');
  });

  it('keeps a local loading state while the profile request is pending', () => {
    const pending = new Subject<OpportunityPropertyInterest | null>();
    crm.getPropertyInterest.and.returnValue(pending.asObservable());
    build();
    expect(text()).toContain('Carregando preferências');
    pending.next(null);
    pending.complete();
    fixture.detectChanges();
    expect(text()).toContain('Nenhuma preferência imobiliária registrada');
  });

  it('shows an error and retries without losing the opportunity context', () => {
    crm.getPropertyInterest.and.returnValues(
      throwError(() => new Error('indisponível')),
      of(PROFILE),
    );
    build();
    expect(text()).toContain('Não foi possível carregar as preferências');
    expect(text()).toContain('Tentar novamente');
    component.load();
    fixture.detectChanges();
    expect(text()).toContain('Apartamento 2 dormitórios');
  });

  it('suggests the opportunity development and unit type only on create', () => {
    build({
      ...OPPORTUNITY,
      unitId: 'unit-305',
      unit: {
        id: 'unit-305',
        identifier: '305',
        developmentId: DEVELOPMENT.id,
        unitTypeId: UNIT_TYPE.id,
      },
    });
    component.openEditor();
    expect(component.form.developmentId).toBe(DEVELOPMENT.id);
    expect(component.form.unitTypeId).toBe(UNIT_TYPE.id);
    expect(unitTypes.list).toHaveBeenCalledWith(DEVELOPMENT.id);
  });

  it('edits the existing profile rather than resuggesting the selected unit', () => {
    crm.getPropertyInterest.and.returnValue(
      of({ ...PROFILE, developmentId: null, unitTypeId: null }),
    );
    build({
      ...OPPORTUNITY,
      unitId: 'unit-305',
      unit: {
        id: 'unit-305',
        identifier: '305',
        developmentId: DEVELOPMENT.id,
        unitTypeId: UNIT_TYPE.id,
      },
    });
    component.openEditor();
    expect(component.form.developmentId).toBe('');
    expect(component.form.unitTypeId).toBe('');
  });

  it('sends canonical decimal strings and never mutates opportunity.unitId', () => {
    build();
    component.openEditor();
    component.form.minBedrooms = '2';
    component.form.minArea = '70,5';
    component.form.maxArea = '90';
    component.form.maxPrice = '500000,25';
    component.form.availableDownPayment = '80000,09';
    component.form.purpose = 'MORADIA';
    component.save();
    const [id, payload] = crm.upsertPropertyInterest.calls.mostRecent().args;
    expect(id).toBe(OPPORTUNITY.id);
    expect(payload).toEqual(
      jasmine.objectContaining({
        minBedrooms: 2,
        minArea: 70.5,
        maxArea: 90,
        maxPrice: '500000.25',
        availableDownPayment: '80000.09',
        purpose: 'MORADIA',
      }),
    );
    expect('unitId' in payload).toBeFalse();
    expect(component.interest()).toBe(PROFILE);
    expect(component.editing()).toBeFalse();
  });

  it('removes only the profile after confirmation', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    component.confirmRemove.set(true);
    component.remove();
    expect(crm.removePropertyInterest).toHaveBeenCalledOnceWith(OPPORTUNITY.id);
    expect(component.interest()).toBeNull();
    fixture.detectChanges();
    expect(text()).toContain('Nenhuma preferência imobiliária registrada');
    expect(text()).toContain('Adicionar preferências');
  });

  it('hides and guards mutations in read-only mode', () => {
    authorization.hasPermission.and.returnValue(false);
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    expect(text()).not.toContain('Editar preferências');
    expect(text()).not.toContain('Remover preferências');
    component.openEditor();
    component.remove();
    expect(component.editing()).toBeFalse();
    expect(crm.removePropertyInterest).not.toHaveBeenCalled();
  });

  it('rejects reversed bedroom, area and price ranges before PUT', () => {
    build();
    component.openEditor();
    component.form.minBedrooms = '3';
    component.form.maxBedrooms = '2';
    expect(component.isValid()).toBeFalse();
    component.form.maxBedrooms = '4';
    component.form.minArea = '90';
    component.form.maxArea = '70';
    expect(component.isValid()).toBeFalse();
    component.form.maxArea = '100';
    component.form.minPrice = '500000,01';
    component.form.maxPrice = '500000,00';
    expect(component.isValid()).toBeFalse();
    component.save();
    expect(crm.upsertPropertyInterest).not.toHaveBeenCalled();
  });

  it('rejects negative and malformed values', () => {
    build();
    component.openEditor();
    component.form.minBedrooms = '-1';
    expect(component.isValid()).toBeFalse();
    component.form.minBedrooms = '';
    component.form.minArea = '-1';
    expect(component.isValid()).toBeFalse();
    component.form.minArea = '';
    component.form.maxPrice = '100,999';
    expect(component.isValid()).toBeFalse();
  });

  it('clears an incompatible type when development changes', () => {
    build();
    component.openEditor();
    component.form.unitTypeId = UNIT_TYPE.id;
    component.form.developmentId = OTHER_DEVELOPMENT.id;
    component.onDevelopmentChange();
    expect(component.form.unitTypeId).toBe('');
    expect(unitTypes.list).toHaveBeenCalledWith(OTHER_DEVELOPMENT.id);
  });

  it('ignores a stale type response after another development is selected', () => {
    const oldRequest = new Subject<UnitTypeListItem[]>();
    unitTypes.list.and.returnValues(oldRequest.asObservable(), of([]));
    build();
    component.openEditor();
    component.form.developmentId = OTHER_DEVELOPMENT.id;
    component.onDevelopmentChange();
    oldRequest.next([UNIT_TYPE]);
    expect(component.unitTypes()).toEqual([]);
    expect(component.form.unitTypeId).toBe('');
  });

  it('keeps the form and supports retry when the type list fails', () => {
    unitTypes.list.and.returnValues(
      throwError(() => new Error('falha')),
      of([UNIT_TYPE]),
    );
    build();
    component.openEditor();
    expect(component.typesError()).toBeTruthy();
    expect(component.editing()).toBeTrue();
    component.loadTypes();
    expect(component.typesError()).toBe('');
    expect(component.unitTypes()).toEqual([UNIT_TYPE]);
  });

  it('preserves the editor and data when saving fails', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.upsertPropertyInterest.and.returnValue(
      throwError(() => new Error('falha')),
    );
    build();
    component.openEditor();
    component.form.notes = 'Atualizar';
    component.save();
    expect(component.editing()).toBeTrue();
    expect(component.form.notes).toBe('Atualizar');
    expect(component.interest()).toBe(PROFILE);
    expect(component.actionError()).toBeTruthy();
  });

  it('preserves the profile when removal fails', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.removePropertyInterest.and.returnValue(
      throwError(() => new Error('falha')),
    );
    build();
    component.remove();
    expect(component.interest()).toBe(PROFILE);
    expect(component.actionError()).toBeTruthy();
  });

  it('shows explainable matches only on request, including read-only users', () => {
    authorization.hasPermission.and.returnValue(false);
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    expect(crm.getUnitMatches).not.toHaveBeenCalled();
    component.showMatches();
    fixture.detectChanges();
    expect(crm.getUnitMatches).toHaveBeenCalledOnceWith(OPPORTUNITY.id, 1);
    expect(text()).toContain('Unidade A-101');
    expect(text()).toContain('R$ 450.000,00');
    expect(text()).toContain('3/3 critérios avaliados atendidos');
    expect(text()).toContain('100% compatível');
    expect(text()).toContain('Excelente');
    expect(text()).toContain('50,00/50 pontos');
    expect(text()).toContain('Dentro do orçamento');
    expect(text()).toContain('dentro da faixa');
  });

  it('shows a textual unevaluated state without inventing a percentage', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValue(
      of(
        matchesPage(
          [
            {
              ...MATCH,
              compatibilityScore: null,
              compatibilityLevel: 'NOT_EVALUATED',
              evaluatedWeight: 0,
              scoreFactors: MATCH.scoreFactors.map((factor) => ({
                ...factor,
                criterionScore: null,
                contribution: null,
                maximumContribution: null,
                status: 'NOT_EVALUATED' as const,
                explanation: 'Preferência não informada',
              })),
            },
          ],
          1,
          1,
        ),
      ),
    );
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(text()).toContain('Compatibilidade não avaliada');
    expect(text()).toContain('Não avaliado');
    expect(text()).not.toContain('% compatível');
  });

  it('explains a partial score and keeps the mismatch visible', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValue(
      of(
        matchesPage(
          [
            {
              ...MATCH,
              compatibilityScore: 90,
              compatibilityLevel: 'EXCELENTE',
              scoreFactors: [
                {
                  ...MATCH.scoreFactors[0],
                  criterionScore: 80,
                  contribution: '40.00',
                  status: 'MISMATCH',
                  explanation: 'R$ 10.000,00 acima do máximo',
                },
                ...MATCH.scoreFactors.slice(1),
              ],
              criteria: [
                {
                  ...MATCH.criteria[0],
                  status: 'MISMATCH',
                  message: 'R$ 10.000,00 acima do máximo',
                },
              ],
            },
          ],
          1,
          1,
        ),
      ),
    );
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(text()).toContain('90% compatível');
    expect(text()).toContain('Excelente');
    expect(text()).toContain('40,00/50 pontos');
    expect(text()).toContain('Fora da faixa');
    expect(text()).toContain('R$ 10.000,00 acima do máximo');
  });

  it('does not offer matching before a profile exists', () => {
    build();
    fixture.detectChanges();
    expect(text()).not.toContain('Ver unidades compatíveis');
    component.showMatches();
    expect(crm.getUnitMatches).not.toHaveBeenCalled();
  });

  it('shows loading, selected-unit indication, and empty state', () => {
    const pending = new Subject<UnitMatchesPage>();
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValues(
      pending.asObservable(),
      of(matchesPage([], 1, 0)),
    );
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(text()).toContain('Buscando unidades...');
    fixture.componentRef.setInput('opportunity', {
      ...OPPORTUNITY,
      unitId: MATCH.unit.id,
      unit: { id: MATCH.unit.id, identifier: MATCH.unit.identifier },
    });
    fixture.detectChanges();
    pending.next(matchesPage([MATCH], 1, 1));
    fixture.detectChanges();
    expect(text()).toContain('Unidade selecionada');
    component.showMatches();
    fixture.detectChanges();
    expect(text()).toContain('Nenhuma unidade disponível');
  });

  it('retries an initial matching load failure', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValues(
      throwError(() => new Error('falha')),
      of(matchesPage([MATCH], 1, 1)),
    );
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(text()).toContain('Tentar novamente');
    component.retryMatches();
    fixture.detectChanges();
    expect(text()).toContain('Unidade A-101');
  });

  it('appends without duplication and hides load-more at the final page', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    const second = {
      ...MATCH,
      unit: { ...MATCH.unit, id: 'unit-2', identifier: 'A-102' },
      compatibilityScore: 80,
      compatibilityLevel: 'ALTA' as const,
    };
    crm.getUnitMatches.and.returnValues(
      of(matchesPage([MATCH], 1, 21)),
      of(matchesPage([MATCH, second], 2, 21)),
    );
    build();
    component.showMatches();
    component.loadMoreMatches();
    fixture.detectChanges();
    expect(component.matches().map((item) => item.unit.id)).toEqual([
      'unit-1',
      'unit-2',
    ]);
    expect(component.matches().map((item) => item.compatibilityScore)).toEqual([
      100, 80,
    ]);
    expect(text()).not.toContain('Carregar mais unidades');
  });

  it('preserves first results on next-page error and retries', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    const second = {
      ...MATCH,
      unit: { ...MATCH.unit, id: 'unit-2', identifier: 'A-102' },
    };
    crm.getUnitMatches.and.returnValues(
      of(matchesPage([MATCH], 1, 21)),
      throwError(() => new Error('falha')),
      of(matchesPage([second], 2, 21)),
    );
    build();
    component.showMatches();
    component.loadMoreMatches();
    expect(component.matches()).toEqual([MATCH]);
    expect(component.matchesError()).toBeTruthy();
    component.retryMatches();
    expect(component.matches().map((item) => item.unit.id)).toEqual([
      'unit-1',
      'unit-2',
    ]);
  });

  it('retries page one after a failed stock refresh while preserving visible matches', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValues(
      of(matchesPage([MATCH], 1, 1)),
      throwError(() => new Error('falha')),
      of(matchesPage([], 1, 0)),
    );
    build();
    component.showMatches();
    component.refreshMatches();
    expect(component.matches()).toEqual([MATCH]);
    expect(component.matchesError()).toBeTruthy();
    component.retryMatches();
    expect(crm.getUnitMatches.calls.mostRecent().args).toEqual([
      OPPORTUNITY.id,
      1,
    ]);
    expect(component.matches()).toEqual([]);
  });

  it('reloads matches from the first page after profile changes and clears them on removal', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    const changed = {
      ...MATCH,
      compatibilityScore: 72,
      compatibilityLevel: 'ALTA' as const,
    };
    crm.getUnitMatches.and.returnValues(
      of(matchesPage([MATCH], 1, 1)),
      of(matchesPage([changed], 1, 1)),
    );
    build();
    component.showMatches();
    component.openEditor();
    component.save();
    expect(component.matchesOpen()).toBeTrue();
    expect(component.matches()).toEqual([changed]);
    expect(crm.getUnitMatches).toHaveBeenCalledTimes(2);
    expect(crm.getUnitMatches.calls.mostRecent().args).toEqual([
      OPPORTUNITY.id,
      1,
    ]);
    component.remove();
    expect(component.matchesOpen()).toBeFalse();
    expect(component.matches()).toEqual([]);
  });

  it('prioritizes at most three actual soft reasons without changing server order or score', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    const lower = {
      ...MATCH,
      unit: { ...MATCH.unit, id: 'unit-2', identifier: 'A-102' },
      compatibilityScore: 42,
      compatibilityLevel: 'BAIXA' as const,
      criteria: [
        {
          code: 'AVAILABILITY',
          kind: 'HARD',
          status: 'MATCH',
          message: 'Disponível',
          actual: 'DISPONIVEL',
        },
        {
          code: 'PRICE',
          kind: 'SOFT',
          status: 'MISMATCH',
          message: 'Acima do orçamento',
          actual: '550000.00',
        },
        {
          code: 'AREA',
          kind: 'SOFT',
          status: 'MISMATCH',
          message: 'Área abaixo do desejado',
          actual: '60',
        },
        {
          code: 'BEDROOMS',
          kind: 'SOFT',
          status: 'MATCH',
          message: 'Quartos compatíveis',
          actual: 2,
        },
        {
          code: 'PURPOSE',
          kind: 'INFORMATIONAL',
          status: 'NOT_EVALUATED',
          message: 'Objetivo sem avaliação',
          actual: null,
        },
      ] as UnitMatch['criteria'],
    };
    crm.getUnitMatches.and.returnValue(of(matchesPage([MATCH, lower], 1, 2)));
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(component.matches().map((match) => match.unit.id)).toEqual([
      'unit-1',
      'unit-2',
    ]);
    expect(component.mainReasons(lower).map((reason) => reason.code)).toEqual([
      'PRICE',
      'AREA',
      'BEDROOMS',
    ]);
    expect(text()).toContain('42% compatível');
    expect(text()).toContain('Acima do orçamento');
    expect(text()).toContain('Área abaixo do desejado');
  });

  it('keeps the calculation inside expandable details and preserves backend factors', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    component.showMatches();
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector(
      'details',
    ) as HTMLDetailsElement;
    expect(details.open).toBeFalse();
    details.open = true;
    fixture.detectChanges();
    expect(details.textContent).toContain('50,00/50 pontos');
    expect(details.textContent).toContain('Dentro do orçamento');
  });

  it('selects an unselected unit through PATCH without changing preferences or reserving', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    const selected = jasmine.createSpy('selected');
    component.unitSelected.subscribe(selected);
    component.showMatches();
    component.requestSelection(MATCH);
    expect(crm.updateOpportunity).toHaveBeenCalledOnceWith(OPPORTUNITY.id, {
      developmentId: DEVELOPMENT.id,
      unitId: MATCH.unit.id,
    });
    expect(crm.upsertPropertyInterest).not.toHaveBeenCalled();
    expect(selected).toHaveBeenCalled();
    expect(component.selectionFeedback()).toContain('selecionada');
  });

  it('asks before replacing an existing unit and allows cancellation', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build({
      ...OPPORTUNITY,
      unitId: 'old-unit',
      unit: { id: 'old-unit', identifier: '305' } as Opportunity['unit'],
    });
    component.showMatches();
    component.requestSelection(MATCH);
    fixture.detectChanges();
    expect(text()).toContain('Substituir unidade selecionada?');
    expect(text()).toContain('Atual: unidade 305');
    expect(crm.updateOpportunity).not.toHaveBeenCalled();
    component.cancelSelection();
    expect(component.pendingSelection()).toBeNull();
    component.requestSelection(MATCH);
    component.confirmSelection();
    expect(crm.updateOpportunity).toHaveBeenCalledTimes(1);
  });

  it('keeps matches and the current unit intact on a selection error', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.updateOpportunity.and.returnValue(throwError(() => new Error('falha')));
    build();
    component.showMatches();
    component.requestSelection(MATCH);
    expect(component.matches()).toEqual([MATCH]);
    expect(component.selectionError()).toBeTruthy();
    expect(component.opportunity.unitId).toBeNull();
  });

  it('refreshes stale stock after a 409 without selecting it', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    crm.getUnitMatches.and.returnValues(
      of(matchesPage([MATCH], 1, 1)),
      of(matchesPage([], 1, 0)),
    );
    crm.updateOpportunity.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    build();
    component.showMatches();
    component.requestSelection(MATCH);
    expect(crm.getUnitMatches).toHaveBeenCalledTimes(2);
    expect(component.matches()).toEqual([]);
    expect(component.selectionError()).toContain('não está mais disponível');
    expect(component.opportunity.unitId).toBeNull();
  });

  it('links to the existing development unit list with a unit search', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    component.showMatches();
    fixture.detectChanges();
    const link = Array.from(
      fixture.nativeElement.querySelectorAll(
        'a',
      ) as NodeListOf<HTMLAnchorElement>,
    ).find((item) => item.textContent?.includes('Ver unidade'));
    expect(link?.getAttribute('href')).toContain(
      '/developments/development-1?unit=A-101#unidades',
    );
  });

  it('keeps read-only matching but hides selection and next commercial actions', () => {
    authorization.hasPermission.and.returnValue(false);
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(text()).toContain('Ver unidade');
    expect(text()).not.toContain('Selecionar unidade');
    component.requestSelection(MATCH);
    expect(crm.updateOpportunity).not.toHaveBeenCalled();
  });

  it('uses a responsive one-column/two-column card layout and exact decimal BRL text', () => {
    crm.getPropertyInterest.and.returnValue(of(PROFILE));
    build();
    component.showMatches();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('ol') as HTMLElement).className,
    ).toContain('xl:grid-cols-2');
    expect(component.formatMoney('1234567890123456.78')).toContain(
      '1.234.567.890.123.456,78',
    );
  });
});
