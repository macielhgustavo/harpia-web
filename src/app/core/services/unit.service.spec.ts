import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  CreateUnitInput,
  Unit,
  UnitDetail,
  UnitListItem,
  UpdateUnitInput,
} from '../models/unit.model';
import { ApiService } from './api.service';
import { UnitService } from './unit.service';

describe('UnitService', () => {
  let service: UnitService;
  let api: jasmine.SpyObj<ApiService>;

  const unit: Unit = {
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
    unitType: { id: 'type-1', name: 'Dois quartos' },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(unit));
    api.patch.and.returnValue(of(unit));
    api.delete.and.returnValue(of(unit));
    TestBed.configureTestingModule({
      providers: [UnitService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(UnitService);
  });

  it('lista por empreendimento e preserva os filtros reais da API', () => {
    service
      .list({
        developmentId: 'development 1&phase',
        status: 'RESERVADA',
        grouping: ' Torre A ',
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/units');
    expect(params?.get('developmentId')).toBe('development 1&phase');
    expect(params?.get('status')).toBe('RESERVADA');
    expect(params?.get('grouping')).toBe('Torre A');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('omite filtros vazios', () => {
    service.list({ developmentId: 'development-1', grouping: ' ' }).subscribe();

    const [, params] = api.get.calls.mostRecent().args;
    expect(params?.toString()).toBe('developmentId=development-1');
  });

  it('consulta detalhe com preços e documentos', () => {
    const detail: UnitDetail = {
      ...unit,
      prices: [],
      documents: [],
    };
    api.get.and.returnValue(of(detail));

    service.getById('unit-1').subscribe((response) => {
      expect(response).toEqual(detail);
    });

    expect(api.get).toHaveBeenCalledOnceWith('/units/unit-1');
  });

  it('cria sem organizationId e preserva zero', () => {
    const data: CreateUnitInput = {
      developmentId: 'development-1',
      identifier: '101',
      category: 'APARTAMENTO',
      parkingSpots: 0,
      builtArea: 0,
      status: 'DISPONIVEL',
    };

    service.create(data).subscribe();

    expect(api.post).toHaveBeenCalledOnceWith('/units', data);
    expect(data).not.toEqual(
      jasmine.objectContaining({ organizationId: jasmine.anything() }),
    );
  });

  it('atualiza sem developmentId e preserva null para limpar campos', () => {
    const data: UpdateUnitInput = {
      grouping: null,
      unitTypeId: null,
      builtArea: null,
      parkingSpots: 0,
    };

    service.update('unit-1', data).subscribe();

    expect(api.patch).toHaveBeenCalledOnceWith('/units/unit-1', data);
    expect(data).not.toEqual(
      jasmine.objectContaining({ developmentId: jasmine.anything() }),
    );
  });

  it('remove e tipa a resposta real', () => {
    service.remove('unit-1').subscribe((response) => {
      expect(response.id).toBe('unit-1');
    });

    expect(api.delete).toHaveBeenCalledOnceWith('/units/unit-1');
  });

  it('tipa a lista com preços individuais', () => {
    const listItem: UnitListItem = {
      ...unit,
      prices: [
        {
          id: 'unit-price-1',
          organizationId: 'organization-1',
          unitId: 'unit-1',
          priceTableId: 'table-1',
          value: 420000,
          createdAt: unit.createdAt,
          updatedAt: unit.updatedAt,
          priceTable: { id: 'table-1', name: 'Tabela vigente' },
        },
      ],
    };
    api.get.and.returnValue(of([listItem]));

    service.list({ developmentId: 'development-1' }).subscribe((response) => {
      expect(response[0].prices[0].value).toBe(420000);
    });
  });
});
