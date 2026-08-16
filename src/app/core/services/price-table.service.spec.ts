import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PriceTable, UnitPriceRecord } from '../models/price-table.model';
import { ApiService } from './api.service';
import { PriceTableService } from './price-table.service';

describe('PriceTableService', () => {
  let service: PriceTableService;
  let api: jasmine.SpyObj<ApiService>;

  const table: PriceTable = {
    id: 'table-1',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Tabela de lançamento',
    phase: 'LANÇAMENTO',
    active: true,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
  };
  const price: UnitPriceRecord = {
    id: 'price-1',
    organizationId: 'organization-1',
    unitId: 'unit-1',
    priceTableId: 'table-1',
    value: 420000,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    unit: { id: 'unit-1', identifier: 'Apto 101' },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(table));
    api.patch.and.returnValue(of(table));
    api.delete.and.returnValue(of(table));
    TestBed.configureTestingModule({
      providers: [PriceTableService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(PriceTableService);
  });

  it('lista tabelas pelo empreendimento sem enviar organizationId', () => {
    service.list('development 1&phase').subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/price-tables');
    expect(params?.get('developmentId')).toBe('development 1&phase');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('consulta o detalhe com os preços individuais', () => {
    api.get.and.returnValue(of({ ...table, unitPrices: [price] }));
    service.getById('table-1').subscribe((response) => {
      expect(response.unitPrices[0].unit.identifier).toBe('Apto 101');
    });
    expect(api.get).toHaveBeenCalledOnceWith('/price-tables/table-1');
  });

  it('cria, atualiza e remove a tabela nos endpoints reais', () => {
    const create = {
      developmentId: 'development-1',
      name: 'Tabela',
      phase: 'CAPTAÇÃO',
      active: false,
    };
    service.create(create).subscribe();
    service.update('table-1', { active: true }).subscribe();
    service.remove('table-1').subscribe();

    expect(api.post).toHaveBeenCalledWith('/price-tables', create);
    expect(api.patch).toHaveBeenCalledWith('/price-tables/table-1', {
      active: true,
    });
    expect(api.delete).toHaveBeenCalledWith('/price-tables/table-1');
  });

  it('usa upsert por unidade sem confundir preço com tipologia', () => {
    api.post.and.returnValue(of(price));
    service
      .setPrice('table-1', { unitId: 'unit-1', value: 420000 })
      .subscribe();

    expect(api.post).toHaveBeenCalledOnceWith('/price-tables/table-1/prices', {
      unitId: 'unit-1',
      value: 420000,
    });
  });

  it('atualiza e remove UnitPrice pelo identificador próprio', () => {
    api.patch.and.returnValue(of(price));
    api.delete.and.returnValue(of(price));
    service.updatePrice('price-1', { value: 430000 }).subscribe();
    service.removePrice('price-1').subscribe();

    expect(api.patch).toHaveBeenCalledWith('/unit-prices/price-1', {
      value: 430000,
    });
    expect(api.delete).toHaveBeenCalledWith('/unit-prices/price-1');
  });
});
