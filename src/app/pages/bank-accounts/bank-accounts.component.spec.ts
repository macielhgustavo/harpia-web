import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { BankAccountListItem } from '../../core/models/bank-account.model';
import { CompanyListItem } from '../../core/models/company.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { BankAccountService } from '../../core/services/bank-account.service';
import { CompanyService } from '../../core/services/company.service';
import { BankAccountsComponent } from './bank-accounts.component';

describe('BankAccountsComponent', () => {
  let fixture: ComponentFixture<BankAccountsComponent>;
  let component: BankAccountsComponent;
  let service: jasmine.SpyObj<BankAccountService>;
  let companyService: jasmine.SpyObj<CompanyService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  const company: CompanyListItem = {
    id: 'company-1',
    organizationId: 'organization-1',
    name: 'Aurora SPE',
    cnpj: '12.345.678/0001-90',
    type: 'SPE',
    notes: null,
    developments: [],
    _count: { developments: 0, bankAccounts: 1 },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  const linked: BankAccountListItem = {
    id: 'account-1',
    organizationId: 'organization-1',
    bank: 'Banco Verde',
    agency: '0001',
    account: '12345-6',
    companyId: company.id,
    company: { id: company.id, name: company.name, type: company.type },
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };
  const unlinked: BankAccountListItem = {
    ...linked,
    id: 'account-2',
    bank: 'Banco Azul',
    account: '90000-1',
    companyId: null,
    company: null,
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<BankAccountService>('BankAccountService', [
      'list',
      'remove',
    ]);
    companyService = jasmine.createSpyObj<CompanyService>('CompanyService', [
      'list',
    ]);
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    service.list.and.returnValue(of([linked, unlinked]));
    service.remove.and.returnValue(of(linked));
    companyService.list.and.returnValue(of([company]));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [BankAccountsComponent],
      providers: [
        { provide: BankAccountService, useValue: service },
        { provide: CompanyService, useValue: companyService },
        { provide: AuthorizationService, useValue: authorization },
      ],
    });
  });

  function render(): void {
    fixture = TestBed.createComponent(BankAccountsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('carrega contas, empresas e indicadores', () => {
    render();
    expect(service.list).toHaveBeenCalledOnceWith();
    expect(companyService.list).toHaveBeenCalledOnceWith();
    expect(component.accounts().length).toBe(2);
    expect(component.linkedCompaniesCount()).toBe(1);
    expect(component.unlinkedCount()).toBe(1);
  });

  it('filtra por empresa, caixa geral e conteúdo', () => {
    render();
    component.companyFilter.set(company.id);
    expect(component.filteredAccounts()).toEqual([linked]);
    component.companyFilter.set('UNLINKED');
    component.search.set('azul');
    expect(component.filteredAccounts()).toEqual([unlinked]);
    component.resetFilters();
    expect(component.filteredAccounts().length).toBe(2);
  });

  it('oculta e bloqueia mutações sem permissão financeira de escrita', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    component.openCreate();
    component.openEdit(linked);
    component.requestDelete(linked);
    expect(component.formOpen()).toBeFalse();
    expect(component.deleteOpen()).toBeFalse();
    expect(companyService.list).not.toHaveBeenCalled();
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.BANK_ACCOUNTS_WRITE,
    );
  });

  it('bloqueia exclusão duplicada e reconcilia o sucesso', () => {
    const request = new Subject<BankAccountListItem>();
    service.remove.and.returnValue(request);
    render();
    component.requestDelete(linked);
    component.confirmDelete();
    component.confirmDelete();
    expect(service.remove).toHaveBeenCalledTimes(1);
    request.next(linked);
    request.complete();
    expect(component.feedback()).toContain('excluída');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('recarrega quando a conta já foi removida e preserva outros erros', () => {
    service.remove.and.returnValue(throwError(() => ({ status: 404 })));
    render();
    component.requestDelete(linked);
    component.confirmDelete();
    expect(component.feedback()).toContain('não existe mais');
    expect(service.list).toHaveBeenCalledTimes(2);

    service.remove.and.returnValue(
      throwError(() => ({ status: 403, error: { message: 'Sem permissão' } })),
    );
    component.requestDelete(linked);
    component.confirmDelete();
    expect(component.deleteError()).toBe('Sem permissão');
  });

  it('ignora resposta antiga de recarga', () => {
    const oldRequest = new Subject<BankAccountListItem[]>();
    service.list.and.returnValues(oldRequest, of([unlinked]));
    render();
    component.loadAccounts();
    oldRequest.next([linked]);
    expect(component.accounts()).toEqual([unlinked]);
  });
});
