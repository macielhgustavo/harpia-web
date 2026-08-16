import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  CreateInvestmentInput,
  Investment,
  InvestmentDetail,
  UpdateInvestmentInput,
} from '../models/investment.model';
import { ApiService } from './api.service';
import { InvestmentService } from './investment.service';

describe('InvestmentService', () => {
  let service: InvestmentService;
  let api: jasmine.SpyObj<ApiService>;

  const investment: Investment = {
    id: 'investment-1',
    organizationId: 'organization-1',
    investorId: 'person-1',
    amount: 500000,
    date: '2026-08-16T00:00:00.000Z',
    type: 'FINANCEIRO',
    notes: null,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(investment));
    api.patch.and.returnValue(of(investment));
    api.delete.and.returnValue(of(investment));
    TestBed.configureTestingModule({
      providers: [InvestmentService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(InvestmentService);
  });

  it('lista sem enviar parâmetros vazios ou organizationId', () => {
    service.list('  ').subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/investments');
    expect(params?.toString()).toBe('');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('filtra pelo investidor real da API', () => {
    service.list(' person-1 ').subscribe();

    const [, params] = api.get.calls.mostRecent().args;
    expect(params?.get('investorId')).toBe('person-1');
  });

  it('consulta detalhe com alocações e retornos', () => {
    const detail: InvestmentDetail = {
      ...investment,
      investor: { id: 'person-1', name: 'Ana Investidora' },
      allocations: [],
      allocatedAmount: 0,
      unallocatedAmount: 500000,
    };
    api.get.and.returnValue(of(detail));

    service.getById('investment-1').subscribe((response) => {
      expect(response).toEqual(detail);
    });

    expect(api.get).toHaveBeenCalledOnceWith('/investments/investment-1');
  });

  it('cria com payload exato e sem tenant', () => {
    const data: CreateInvestmentInput = {
      investorId: 'person-1',
      amount: 500000,
      date: '2026-08-16',
      type: 'FINANCEIRO',
      notes: 'Aporte inicial',
    };

    service.create(data).subscribe();

    expect(api.post).toHaveBeenCalledOnceWith('/investments', data);
    expect(data).not.toEqual(
      jasmine.objectContaining({ organizationId: jasmine.anything() }),
    );
  });

  it('atualiza sem permitir trocar o investidor', () => {
    const data: UpdateInvestmentInput = {
      amount: 600000,
      notes: 'Complemento',
    };

    service.update('investment-1', data).subscribe();

    expect(api.patch).toHaveBeenCalledOnceWith(
      '/investments/investment-1',
      data,
    );
    expect(data).not.toEqual(
      jasmine.objectContaining({ investorId: jasmine.anything() }),
    );
  });

  it('remove pelo endpoint correto', () => {
    service.remove('investment-1').subscribe();
    expect(api.delete).toHaveBeenCalledOnceWith('/investments/investment-1');
  });
});
