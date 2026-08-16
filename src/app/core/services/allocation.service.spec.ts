import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Allocation } from '../models/allocation.model';
import { AllocationService } from './allocation.service';
import { ApiService } from './api.service';

describe('AllocationService', () => {
  let service: AllocationService;
  let api: jasmine.SpyObj<ApiService>;

  const allocation: Allocation = {
    id: 'allocation-1',
    organizationId: 'organization-1',
    investmentId: 'investment-1',
    developmentId: 'development-1',
    amount: 300000,
    date: '2026-08-16T00:00:00.000Z',
    notes: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(allocation));
    api.patch.and.returnValue(of(allocation));
    api.delete.and.returnValue(of(allocation));
    TestBed.configureTestingModule({
      providers: [AllocationService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(AllocationService);
  });

  it('lista apenas com filtros definidos e sem tenant', () => {
    service.list(' investment-1 ', '').subscribe();
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/allocations');
    expect(params?.get('investmentId')).toBe('investment-1');
    expect(params?.has('developmentId')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('consulta o detalhe', () => {
    service.getById('allocation-1').subscribe();
    expect(api.get).toHaveBeenCalledOnceWith('/allocations/allocation-1');
  });

  it('cria com caixa geral representado pela ausência de developmentId', () => {
    const payload = {
      investmentId: 'investment-1',
      amount: 50000,
      date: '2026-08-16',
    };
    service.create(payload).subscribe();
    expect(api.post).toHaveBeenCalledOnceWith('/allocations', payload);
  });

  it('atualiza permitindo mover para caixa geral com null', () => {
    const payload = { developmentId: null, amount: 40000 };
    service.update('allocation-1', payload).subscribe();
    expect(api.patch).toHaveBeenCalledOnceWith(
      '/allocations/allocation-1',
      payload,
    );
  });

  it('remove pelo endpoint correto', () => {
    service.remove('allocation-1').subscribe();
    expect(api.delete).toHaveBeenCalledOnceWith('/allocations/allocation-1');
  });
});
