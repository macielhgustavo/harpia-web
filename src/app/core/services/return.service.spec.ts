import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Return } from '../models/return.model';
import { ApiService } from './api.service';
import { ReturnService } from './return.service';

describe('ReturnService', () => {
  let service: ReturnService;
  let api: jasmine.SpyObj<ApiService>;
  const item: Return = {
    id: 'return-1',
    organizationId: 'organization-1',
    allocationId: 'allocation-1',
    expectedAmount: 25000,
    expectedDate: '2026-09-20T00:00:00.000Z',
    realizedAmount: null,
    realizedDate: null,
    status: 'PENDENTE',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(item));
    api.patch.and.returnValue(of(item));
    api.delete.and.returnValue(of(item));
    TestBed.configureTestingModule({
      providers: [ReturnService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ReturnService);
  });

  it('lista somente com filtros definidos, incluindo ATRASADO', () => {
    service
      .list({ investmentId: ' investment-1 ', status: 'ATRASADO' })
      .subscribe();
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/returns');
    expect(params?.get('investmentId')).toBe('investment-1');
    expect(params?.get('status')).toBe('ATRASADO');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('consulta detalhe', () => {
    service.getById('return-1').subscribe();
    expect(api.get).toHaveBeenCalledOnceWith('/returns/return-1');
  });

  it('cria previsão sem persistir ATRASADO', () => {
    const payload = {
      allocationId: 'allocation-1',
      expectedAmount: 25000,
      expectedDate: '2026-09-20',
    };
    service.create(payload).subscribe();
    expect(api.post).toHaveBeenCalledOnceWith('/returns', payload);
  });

  it('marca pagamento com dados realizados', () => {
    const payload = {
      status: 'PAGO' as const,
      realizedAmount: 25000,
      realizedDate: '2026-09-20',
    };
    service.update('return-1', payload).subscribe();
    expect(api.patch).toHaveBeenCalledOnceWith('/returns/return-1', payload);
  });

  it('remove pelo endpoint correto', () => {
    service.remove('return-1').subscribe();
    expect(api.delete).toHaveBeenCalledOnceWith('/returns/return-1');
  });
});
