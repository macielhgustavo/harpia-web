import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { Opportunity, OpportunityPropertyInterest } from '../../core/models/crm.model';
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
    fixture.componentRef.setInput('developments', [DEVELOPMENT, OTHER_DEVELOPMENT]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    crm = jasmine.createSpyObj<CrmService>('CrmService', [
      'getPropertyInterest',
      'upsertPropertyInterest',
      'removePropertyInterest',
    ]);
    crm.getPropertyInterest.and.returnValue(of(null));
    crm.upsertPropertyInterest.and.returnValue(of(PROFILE));
    crm.removePropertyInterest.and.returnValue(of(PROFILE));
    unitTypes = jasmine.createSpyObj<UnitTypeService>('UnitTypeService', ['list']);
    unitTypes.list.and.returnValue(of([UNIT_TYPE]));
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);
    await TestBed.configureTestingModule({
      imports: [PropertyInterestSectionComponent],
      providers: [
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
});
