import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProposalPage, SalesProposal } from '../models/proposal.model';
import { ApiService } from './api.service';
import { ProposalService } from './proposal.service';

describe('ProposalService', () => {
  let service: ProposalService;
  let api: jasmine.SpyObj<ApiService>;
  const proposal = { id: 'proposal-1' } as SalesProposal;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.returnValue(of(proposal));
    api.post.and.returnValue(of(proposal));
    TestBed.configureTestingModule({
      providers: [ProposalService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ProposalService);
  });

  it('lists with only defined filters', () => {
    api.get.and.returnValue(
      of({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      } as ProposalPage),
    );
    service
      .list({
        opportunityId: 'opportunity-1',
        status: undefined,
        pageSize: 100,
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/proposals');
    expect(params?.get('opportunityId')).toBe('opportunity-1');
    expect(params?.get('pageSize')).toBe('100');
    expect(params?.has('status')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('requests a price preview without tenant data', () => {
    service.pricePreview('unit-1').subscribe();
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/proposals/price-preview');
    expect(params?.get('unitId')).toBe('unit-1');
  });

  it('creates a proposal and an immutable next version on exact routes', () => {
    const conditions = [{ type: 'SALDO_CHAVES' as const, amount: '900.00' }];
    service
      .create({
        personId: 'person-1',
        unitId: 'unit-1',
        discount: '100.00',
        conditions,
      })
      .subscribe();
    service
      .createVersion('proposal-1', {
        discount: '100.00',
        conditions,
      })
      .subscribe();

    expect(api.post.calls.argsFor(0)[0]).toBe('/proposals');
    expect(api.post.calls.argsFor(1)).toEqual([
      '/proposals/proposal-1/versions',
      { discount: '100.00', conditions },
    ]);
  });

  it('uses explicit POST transition endpoints', () => {
    service.send('proposal-1').subscribe();
    service.accept('proposal-1').subscribe();
    service.reject('proposal-1', 'Condição recusada').subscribe();
    expect(api.post.calls.allArgs()).toEqual([
      ['/proposals/proposal-1/send', null],
      ['/proposals/proposal-1/accept', null],
      ['/proposals/proposal-1/reject', { reason: 'Condição recusada' }],
    ]);
  });
});
