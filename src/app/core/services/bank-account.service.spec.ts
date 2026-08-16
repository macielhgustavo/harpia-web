import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BankAccount } from '../models/bank-account.model';
import { ApiService } from './api.service';
import { BankAccountService } from './bank-account.service';

describe('BankAccountService', () => {
  let service: BankAccountService;
  let api: jasmine.SpyObj<ApiService>;

  const account: BankAccount = {
    id: 'account-1',
    organizationId: 'organization-1',
    bank: 'Banco Verde',
    agency: '0001',
    account: '12345-6',
    companyId: null,
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
    api.post.and.returnValue(of(account));
    api.patch.and.returnValue(of(account));
    api.delete.and.returnValue(of(account));
    TestBed.configureTestingModule({
      providers: [BankAccountService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(BankAccountService);
  });

  it('lista sem filtros vazios nem tenant', () => {
    service.list('  ').subscribe();
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/bank-accounts');
    expect(params?.toString()).toBe('');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('envia companyId normalizado no filtro', () => {
    service.list(' company-1 ').subscribe();
    expect(api.get.calls.mostRecent().args[1]?.get('companyId')).toBe(
      'company-1',
    );
  });

  it('usa os endpoints e payloads reais', () => {
    const create = { bank: 'Banco Verde', agency: '0001', account: '12345-6' };
    const update = { companyId: null };
    service.create(create).subscribe();
    service.update('account-1', update).subscribe();
    service.remove('account-1').subscribe();
    expect(api.post).toHaveBeenCalledWith('/bank-accounts', create);
    expect(api.patch).toHaveBeenCalledWith('/bank-accounts/account-1', update);
    expect(api.delete).toHaveBeenCalledWith('/bank-accounts/account-1');
  });
});
