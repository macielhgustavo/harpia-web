import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SaleDetail, SalePage } from '../models/sale.model';
import { ApiService } from './api.service';
import { SaleService } from './sale.service';

describe('SaleService', () => {
  let api: jasmine.SpyObj<ApiService>;
  let service: SaleService;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
    ]);
    api.get.and.returnValue(
      of({ data: [], pagination: {} } as unknown as SalePage),
    );
    api.post.and.returnValue(of({ id: 'sale-1' } as unknown as SaleDetail));
    api.patch.and.returnValue(of({ id: 'sale-1' } as unknown as SaleDetail));
    TestBed.configureTestingModule({
      providers: [SaleService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(SaleService);
  });

  it('serializes only defined list filters, including page and dates', () => {
    service
      .list({
        developmentId: 'development-1',
        status: 'ATIVA',
        buyerId: '',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        page: 2,
        pageSize: 25,
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/sales');
    expect(params?.get('developmentId')).toBe('development-1');
    expect(params?.get('status')).toBe('ATIVA');
    expect(params?.has('buyerId')).toBeFalse();
    expect(params?.get('startDate')).toBe('2026-08-01');
    expect(params?.get('endDate')).toBe('2026-08-31');
    expect(params?.get('page')).toBe('2');
  });

  it('uses the exact detail, conversion, update and commission routes', () => {
    service.getById('sale-1').subscribe();
    service
      .convertProposal('proposal-1', {
        buyers: [{ personId: 'person-1', isPrimary: true }],
      })
      .subscribe();
    service.update('sale-1', { notes: 'Contrato assinado' }).subscribe();
    service
      .addCommission('sale-1', {
        personId: 'broker-1',
        amount: '5000.00',
      })
      .subscribe();

    expect(api.get).toHaveBeenCalledWith('/sales/sale-1');
    expect(api.post.calls.argsFor(0)[0]).toBe(
      '/proposals/proposal-1/convert-to-sale',
    );
    expect(api.patch).toHaveBeenCalledWith('/sales/sale-1', {
      notes: 'Contrato assinado',
    });
    expect(api.post.calls.argsFor(1)[0]).toBe('/sales/sale-1/commissions');
  });
});
