import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  PriceTableDetail,
  PriceTableListItem,
} from '../../core/models/price-table.model';
import { UnitListItem } from '../../core/models/unit.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { PriceTableService } from '../../core/services/price-table.service';
import { UnitService } from '../../core/services/unit.service';
import { PriceTablesSectionComponent } from './price-tables-section.component';

class PriceTableServiceMock {
  readonly list = jasmine.createSpy();
  readonly getById = jasmine.createSpy();
  readonly remove = jasmine.createSpy();
}

class UnitServiceMock {
  readonly list = jasmine.createSpy();
}

class AuthorizationServiceMock {
  readonly hasPermission = jasmine.createSpy().and.returnValue(true);
}

describe('PriceTablesSectionComponent', () => {
  let fixture: ComponentFixture<PriceTablesSectionComponent>;
  let component: PriceTablesSectionComponent;
  let service: PriceTableServiceMock;
  let unitService: UnitServiceMock;
  let authorization: AuthorizationServiceMock;

  const table: PriceTableListItem = {
    id: 'table-1',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Tabela vigente',
    phase: 'LANÇAMENTO',
    active: true,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
    _count: { unitPrices: 2 },
  };
  const units: UnitListItem[] = [
    {
      id: 'unit-1',
      organizationId: 'organization-1',
      developmentId: 'development-1',
      identifier: 'Apto 101',
      unitTypeId: null,
      category: 'APARTAMENTO',
      grouping: null,
      landArea: null,
      builtArea: 55,
      parkingSpots: 1,
      status: 'DISPONIVEL',
      notes: null,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      unitType: null,
      prices: [],
    },
    {
      id: 'unit-2',
      organizationId: 'organization-1',
      developmentId: 'development-1',
      identifier: 'Apto 102',
      unitTypeId: null,
      category: 'APARTAMENTO',
      grouping: null,
      landArea: null,
      builtArea: 55,
      parkingSpots: 1,
      status: 'DISPONIVEL',
      notes: null,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      unitType: null,
      prices: [],
    },
  ];
  const detail: PriceTableDetail = {
    ...table,
    unitPrices: [
      {
        id: 'price-1',
        organizationId: 'organization-1',
        unitId: 'unit-1',
        priceTableId: 'table-1',
        value: 400000,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        unit: { id: 'unit-1', identifier: 'Apto 101' },
      },
      {
        id: 'price-2',
        organizationId: 'organization-1',
        unitId: 'unit-2',
        priceTableId: 'table-1',
        value: 600000,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        unit: { id: 'unit-2', identifier: 'Apto 102' },
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceTablesSectionComponent],
      providers: [
        { provide: PriceTableService, useClass: PriceTableServiceMock },
        { provide: UnitService, useClass: UnitServiceMock },
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
      ],
    }).compileComponents();
    service = TestBed.inject(
      PriceTableService,
    ) as unknown as PriceTableServiceMock;
    unitService = TestBed.inject(UnitService) as unknown as UnitServiceMock;
    authorization = TestBed.inject(
      AuthorizationService,
    ) as unknown as AuthorizationServiceMock;
    service.list.and.returnValue(of([table]));
    service.getById.and.returnValue(of(detail));
    service.remove.and.returnValue(of(table));
    unitService.list.and.returnValue(of(units));
  });

  function render(): void {
    fixture = TestBed.createComponent(PriceTablesSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('developmentId', 'development-1');
    fixture.detectChanges();
  }

  it('lista tabela e calcula mínimo, máximo e média dos preços individuais', () => {
    render();
    expect(service.list).toHaveBeenCalledWith('development-1');
    expect(unitService.list).toHaveBeenCalledWith({
      developmentId: 'development-1',
    });
    expect(component.minPrice('table-1')).toBe(400000);
    expect(component.maxPrice('table-1')).toBe(600000);
    expect(component.averagePrice('table-1')).toBe(500000);
    expect(fixture.nativeElement.textContent).toContain('2 / 2');
  });

  it('não inventa estatística quando a tabela não possui preço', () => {
    service.getById.and.returnValue(of({ ...detail, unitPrices: [] }));
    render();
    expect(component.averagePrice('table-1')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Não informado');
  });

  it('remove a tabela e informa o pai sobre a atualização', () => {
    render();
    const changed = jasmine.createSpy();
    component.changed.subscribe(changed);
    component.requestDelete(table);
    component.confirmDelete();

    expect(service.remove).toHaveBeenCalledOnceWith('table-1');
    expect(changed).toHaveBeenCalledWith(
      'Tabela “Tabela vigente” removida com sucesso.',
    );
  });

  it('exibe erro de carga com retry', () => {
    service.list.and.returnValue(throwError(() => new Error('offline')));
    render();
    expect(component.error()).toContain('carregar as tabelas');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });

  it('oculta e bloqueia mutações sem PRICES_WRITE', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.PRICES_WRITE,
    );
    expect(fixture.nativeElement.textContent).not.toContain('Nova tabela');
    component.openCreate();
    component.requestDelete(table);
    expect(component.formOpen()).toBeFalse();
    expect(component.deleteTarget()).toBeNull();
  });

  it('ignora atualização antiga dos indicadores após uma edição mais nova', () => {
    render();
    component.openDetail(table);
    const stale = new Subject<PriceTableDetail>();
    const fresh = new Subject<PriceTableDetail>();
    service.getById.and.returnValues(stale, fresh);

    component.onPricesChanged('Primeira alteração.');
    component.onPricesChanged('Segunda alteração.');
    fresh.next({
      ...detail,
      unitPrices: [{ ...detail.unitPrices[0], value: 700000 }],
    });
    stale.next({
      ...detail,
      unitPrices: [{ ...detail.unitPrices[0], value: 100000 }],
    });

    expect(component.minPrice('table-1')).toBe(700000);
    expect(component.feedback()).toBe('Segunda alteração.');
  });
});
