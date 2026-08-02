import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DEVELOPMENT_FIXTURES } from '../../pages/developments/development.fixtures';
import { ApiService } from './api.service';
import { DevelopmentService } from './development.service';

describe('DevelopmentService', () => {
  let service: DevelopmentService;
  let api: { get: jasmine.Spy; post: jasmine.Spy; patch: jasmine.Spy; delete: jasmine.Spy };

  beforeEach(() => {
    api = {
      get: jasmine.createSpy().and.returnValue(of(DEVELOPMENT_FIXTURES)),
      post: jasmine.createSpy().and.returnValue(of(DEVELOPMENT_FIXTURES[0])),
      patch: jasmine.createSpy().and.returnValue(of(DEVELOPMENT_FIXTURES[0])),
      delete: jasmine.createSpy().and.returnValue(of(DEVELOPMENT_FIXTURES[0])),
    };
    TestBed.configureTestingModule({
      providers: [DevelopmentService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(DevelopmentService);
  });

  it('monta filtros combinados com HttpParams', () => {
    service
      .list({ status: 'EM_OBRA', type: 'PREDIO', companyId: 'company-spe' })
      .subscribe();
    const params = api.get.calls.mostRecent().args[1];
    expect(api.get.calls.mostRecent().args[0]).toBe('/developments');
    expect(params.get('status')).toBe('EM_OBRA');
    expect(params.get('type')).toBe('PREDIO');
    expect(params.get('companyId')).toBe('company-spe');
  });

  it('centraliza os endpoints de detalhe e CRUD', () => {
    service.getById('dev-1').subscribe();
    service.create({ name: 'Novo', type: 'PREDIO' }).subscribe();
    service.update('dev-1', { name: 'Editado' }).subscribe();
    service.remove('dev-1').subscribe();
    expect(api.get).toHaveBeenCalledWith('/developments/dev-1');
    expect(api.post).toHaveBeenCalledWith('/developments', { name: 'Novo', type: 'PREDIO' });
    expect(api.patch).toHaveBeenCalledWith('/developments/dev-1', { name: 'Editado' });
    expect(api.delete).toHaveBeenCalledWith('/developments/dev-1');
  });
});
