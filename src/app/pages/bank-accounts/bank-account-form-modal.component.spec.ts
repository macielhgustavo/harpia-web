import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { BankAccountListItem } from '../../core/models/bank-account.model';
import { CompanyListItem } from '../../core/models/company.model';
import { BankAccountService } from '../../core/services/bank-account.service';
import { BankAccountFormModalComponent } from './bank-account-form-modal.component';

describe('BankAccountFormModalComponent', () => {
  let fixture: ComponentFixture<BankAccountFormModalComponent>;
  let component: BankAccountFormModalComponent;
  let service: jasmine.SpyObj<BankAccountService>;

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
  const account: BankAccountListItem = {
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

  beforeEach(() => {
    service = jasmine.createSpyObj<BankAccountService>('BankAccountService', [
      'create',
      'update',
    ]);
    service.create.and.returnValue(of(account));
    service.update.and.returnValue(of(account));
    TestBed.configureTestingModule({
      imports: [BankAccountFormModalComponent],
      providers: [{ provide: BankAccountService, useValue: service }],
    });
  });

  function render(editing = false): void {
    fixture = TestBed.createComponent(BankAccountFormModalComponent);
    component = fixture.componentInstance;
    component.companies = [company];
    component.bankAccount = editing ? account : null;
    fixture.detectChanges();
  }

  it('cria com campos normalizados e omite vínculo vazio', () => {
    render();
    component.form = {
      bank: '  Banco Verde  ',
      agency: ' 0001 ',
      account: ' 12345-6 ',
      companyId: '',
    };
    component.save();
    expect(service.create).toHaveBeenCalledOnceWith({
      bank: 'Banco Verde',
      agency: '0001',
      account: '12345-6',
    });
  });

  it('edita e envia null para desvincular a empresa', () => {
    render(true);
    component.form.companyId = '';
    component.save();
    expect(service.update).toHaveBeenCalledOnceWith('account-1', {
      bank: 'Banco Verde',
      agency: '0001',
      account: '12345-6',
      companyId: null,
    });
  });

  it('rejeita campos obrigatórios em branco', () => {
    render();
    component.form.bank = '   ';
    component.save();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('bloqueia clique duplicado', () => {
    const request = new Subject<BankAccountListItem>();
    service.create.and.returnValue(request);
    render();
    component.form = {
      bank: 'Banco Verde',
      agency: '0001',
      account: '12345-6',
      companyId: '',
    };
    component.save();
    component.save();
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it('preserva erro real e sinaliza registro removido', () => {
    service.update.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'Dados inválidos' },
      })),
    );
    render(true);
    component.save();
    expect(component.error()).toBe('Dados inválidos');

    service.update.and.returnValue(throwError(() => ({ status: 404 })));
    spyOn(component.stale, 'emit');
    component.save();
    expect(component.stale.emit).toHaveBeenCalled();
  });
});
