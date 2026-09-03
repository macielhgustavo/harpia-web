import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.returnValue(of({}));
    api.post.and.returnValue(of({}));
    TestBed.configureTestingModule({
      providers: [FinanceService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(FinanceService);
  });

  it('loads the income statement with its management filters', () => {
    service
      .incomeStatement({
        basis: 'COMPETENCIA',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        companyId: 'company-1',
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/finance/income-statement');
    expect(params?.get('basis')).toBe('COMPETENCIA');
    expect(params?.get('startDate')).toBe('2026-09-01');
    expect(params?.get('endDate')).toBe('2026-09-30');
    expect(params?.get('companyId')).toBe('company-1');
  });

  it('lists reconciliation entries without leaking empty filters', () => {
    service
      .reconciliation({
        page: 2,
        status: 'PENDENTE',
        bankAccountId: '',
        search: '',
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/finance/reconciliation');
    expect(params?.get('page')).toBe('2');
    expect(params?.get('status')).toBe('PENDENTE');
    expect(params?.has('bankAccountId')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('uses the real import and matching endpoints', () => {
    const input = {
      bankAccountId: 'account-1',
      entries: [
        {
          date: '2026-09-02',
          description: 'Recebimento',
          type: 'CREDITO' as const,
          amount: '100.00',
        },
      ],
    };
    service.importStatement(input).subscribe();
    service.matchReconciliation('entry-1', 'transaction-1').subscribe();
    service.unmatchReconciliation('entry-1').subscribe();
    service.ignoreReconciliation('entry-1').subscribe();
    service.restoreReconciliation('entry-1').subscribe();

    expect(api.post.calls.allArgs()).toEqual([
      ['/finance/reconciliation/import', input],
      [
        '/finance/reconciliation/entry-1/match',
        { transactionId: 'transaction-1' },
      ],
      ['/finance/reconciliation/entry-1/unmatch', {}],
      ['/finance/reconciliation/entry-1/ignore', {}],
      ['/finance/reconciliation/entry-1/restore', {}],
    ]);
  });
});
