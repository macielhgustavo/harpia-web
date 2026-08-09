import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  CreateUnitTypeInput,
  UnitType,
  UnitTypeDetail,
  UnitTypeListItem,
  UpdateUnitTypeInput,
} from '../models/unit-type.model';
import { ApiService } from './api.service';
import { UnitTypeService } from './unit-type.service';

describe('UnitTypeService', () => {
  let service: UnitTypeService;
  let api: jasmine.SpyObj<ApiService>;

  const unitType: UnitType = {
    id: 'type-1',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Dois quartos',
    bedrooms: 2,
    suites: 1,
    standardArea: 55.5,
    createdAt: '2026-08-09T12:00:00.000Z',
    updatedAt: '2026-08-09T12:00:00.000Z',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(unitType));
    api.patch.and.returnValue(of(unitType));
    api.delete.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [UnitTypeService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(UnitTypeService);
  });

  it('lista tipologias por empreendimento usando HttpParams', () => {
    const developmentId = 'development 1&phase';

    service.list(developmentId).subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/unit-types');
    expect(params?.get('developmentId')).toBe(developmentId);
    expect(params?.toString()).toBe('developmentId=development%201%26phase');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('consulta o detalhe com as unidades resumidas', () => {
    const detail: UnitTypeDetail = {
      ...unitType,
      units: [{ id: 'unit-1', identifier: '101' }],
    };
    api.get.and.returnValue(of(detail));

    service.getById('type-1').subscribe((response) => {
      expect(response).toEqual(detail);
    });

    expect(api.get).toHaveBeenCalledOnceWith('/unit-types/type-1');
  });

  it('cria uma tipologia preservando valores zero e sem organizationId', () => {
    const data: CreateUnitTypeInput = {
      developmentId: 'development-1',
      name: 'Studio',
      bedrooms: 0,
      suites: 0,
      standardArea: 0,
    };

    service.create(data).subscribe();

    expect(api.post).toHaveBeenCalledOnceWith('/unit-types', data);
    expect(data).not.toEqual(
      jasmine.objectContaining({ organizationId: jasmine.anything() }),
    );
  });

  it('atualiza sem developmentId e preserva null para limpar campos', () => {
    const data: UpdateUnitTypeInput = {
      name: 'Studio atualizado',
      bedrooms: 0,
      suites: null,
      standardArea: null,
    };

    service.update('type-1', data).subscribe();

    expect(api.patch).toHaveBeenCalledOnceWith('/unit-types/type-1', data);
    expect(data).not.toEqual(
      jasmine.objectContaining({ developmentId: jasmine.anything() }),
    );
    expect(data).not.toEqual(
      jasmine.objectContaining({ organizationId: jasmine.anything() }),
    );
  });

  it('remove uma tipologia pelo id', () => {
    service.remove('type-1').subscribe();

    expect(api.delete).toHaveBeenCalledOnceWith('/unit-types/type-1');
  });

  it('tipa a resposta de lista com a contagem de unidades', () => {
    const listItem: UnitTypeListItem = {
      ...unitType,
      _count: { units: 3 },
    };
    api.get.and.returnValue(of([listItem]));

    service.list('development-1').subscribe((response) => {
      expect(response[0]._count.units).toBe(3);
    });
  });
});
