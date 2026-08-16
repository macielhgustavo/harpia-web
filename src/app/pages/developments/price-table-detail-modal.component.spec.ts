import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  PriceTableDetail,
  UnitPriceRecord,
} from '../../core/models/price-table.model';
import { UnitListItem } from '../../core/models/unit.model';
import { PriceTableService } from '../../core/services/price-table.service';
import { PriceTableDetailModalComponent } from './price-table-detail-modal.component';

class PriceTableServiceMock {
  readonly getById = jasmine.createSpy();
  readonly setPrice = jasmine.createSpy();
  readonly updatePrice = jasmine.createSpy();
  readonly removePrice = jasmine.createSpy();
}

describe('PriceTableDetailModalComponent', () => {
  let fixture: ComponentFixture<PriceTableDetailModalComponent>;
  let component: PriceTableDetailModalComponent;
  let service: PriceTableServiceMock;

  const units: UnitListItem[] = [
    {
      id: 'unit-1',
      organizationId: 'organization-1',
      developmentId: 'development-1',
      identifier: 'Apto 101',
      unitTypeId: 'type-1',
      category: 'APARTAMENTO',
      grouping: 'Torre A',
      landArea: null,
      builtArea: 55,
      parkingSpots: 1,
      status: 'DISPONIVEL',
      notes: null,
      createdAt: '2026-08-16T12:00:00.000Z',
      updatedAt: '2026-08-16T12:00:00.000Z',
      unitType: { id: 'type-1', name: '2Q' },
      prices: [],
    },
    {
      id: 'unit-2',
      organizationId: 'organization-1',
      developmentId: 'development-1',
      identifier: 'Apto 201',
      unitTypeId: null,
      category: 'APARTAMENTO',
      grouping: 'Torre B',
      landArea: null,
      builtArea: 75,
      parkingSpots: 1,
      status: 'RESERVADA',
      notes: null,
      createdAt: '2026-08-16T12:00:00.000Z',
      updatedAt: '2026-08-16T12:00:00.000Z',
      unitType: null,
      prices: [],
    },
  ];
  const existingPrice: UnitPriceRecord = {
    id: 'price-1',
    organizationId: 'organization-1',
    unitId: 'unit-1',
    priceTableId: 'table-1',
    value: 400000,
    createdAt: units[0].createdAt,
    updatedAt: units[0].updatedAt,
    unit: { id: 'unit-1', identifier: 'Apto 101' },
  };
  const detail: PriceTableDetail = {
    id: 'table-1',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Tabela vigente',
    phase: 'LANÇAMENTO',
    active: true,
    createdAt: units[0].createdAt,
    updatedAt: units[0].updatedAt,
    unitPrices: [existingPrice],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceTableDetailModalComponent],
      providers: [
        { provide: PriceTableService, useClass: PriceTableServiceMock },
      ],
    }).compileComponents();
    service = TestBed.inject(
      PriceTableService,
    ) as unknown as PriceTableServiceMock;
    service.getById.and.returnValue(of(detail));
    service.updatePrice.and.returnValue(of(existingPrice));
    service.setPrice.and.returnValue(of(existingPrice));
    service.removePrice.and.returnValue(of(existingPrice));
    fixture = TestBed.createComponent(PriceTableDetailModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('priceTable', detail);
    fixture.componentRef.setInput('units', units);
    fixture.componentRef.setInput('canWrite', true);
    fixture.detectChanges();
  });

  it('inclui unidades com e sem preço e calcula somente valores reais', () => {
    expect(component.pricedCount()).toBe(1);
    expect(component.unpricedCount()).toBe(1);
    expect(component.minPrice()).toBe(400000);
    expect(component.averagePrice()).toBe(400000);
    expect(fixture.nativeElement.textContent).toContain('Apto 101');
    expect(fixture.nativeElement.textContent).toContain('Apto 201');
  });

  it('filtra explicitamente unidades sem preço', () => {
    component.priceFilter = 'UNPRICED';
    expect(component.filteredUnits().map((unit) => unit.id)).toEqual([
      'unit-2',
    ]);
  });

  it('atualiza preço existente pelo UnitPrice id', () => {
    component.draftValues['unit-1'] = 410000;
    component.draftChanged();
    service.getById.and.returnValue(
      of({ ...detail, unitPrices: [{ ...existingPrice, value: 410000 }] }),
    );
    component.saveChanges('unit-1');

    expect(service.updatePrice).toHaveBeenCalledOnceWith('price-1', {
      value: 410000,
    });
  });

  it('usa upsert individual para unidade ainda sem preço', () => {
    component.draftValues['unit-2'] = 520000;
    component.draftChanged();
    component.saveChanges('unit-2');

    expect(service.setPrice).toHaveBeenCalledOnceWith('table-1', {
      unitId: 'unit-2',
      value: 520000,
    });
  });

  it('remove apenas o preço, preservando a unidade', () => {
    component.clearPrice('unit-1');
    component.saveChanges('unit-1');

    expect(service.removePrice).toHaveBeenCalledOnceWith('price-1');
  });

  it('continua o lote após falha e preserva a edição que não foi salva', () => {
    service.updatePrice.and.returnValue(throwError(() => new Error('falhou')));
    component.draftValues['unit-1'] = 410000;
    component.draftValues['unit-2'] = 520000;
    component.draftChanged();
    component.saveChanges();

    expect(service.updatePrice).toHaveBeenCalled();
    expect(service.setPrice).toHaveBeenCalled();
    expect(component.draftValues['unit-1']).toBe(410000);
    expect(component.error()).toContain('não foram salvas');
  });

  it('bloqueia preço zero antes de chamar a API', () => {
    component.draftValues['unit-2'] = 0;
    component.draftChanged();
    component.saveChanges('unit-2');

    expect(service.setPrice).not.toHaveBeenCalled();
    expect(component.error()).toContain('maior que zero');
  });
});
