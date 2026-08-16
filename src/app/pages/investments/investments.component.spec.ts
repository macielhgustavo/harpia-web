import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { InvestmentListItem } from '../../core/models/investment.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InvestmentService } from '../../core/services/investment.service';
import { PersonService } from '../../core/services/person.service';
import { InvestmentsComponent } from './investments.component';

describe('InvestmentsComponent', () => {
  let fixture: ComponentFixture<InvestmentsComponent>;
  let component: InvestmentsComponent;
  let service: jasmine.SpyObj<InvestmentService>;
  let people: jasmine.SpyObj<PersonService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  const investments: InvestmentListItem[] = [
    {
      id: 'investment-1',
      organizationId: 'organization-1',
      investorId: 'person-1',
      investor: { id: 'person-1', name: 'Ana Investidora' },
      amount: 500000,
      date: '2026-08-16T00:00:00.000Z',
      type: 'FINANCEIRO',
      notes: 'Aurora',
      allocations: [],
      allocatedAmount: 300000,
      unallocatedAmount: 200000,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
    },
    {
      id: 'investment-2',
      organizationId: 'organization-1',
      investorId: 'person-2',
      investor: { id: 'person-2', name: 'Bruno Investidor' },
      amount: 200000,
      date: '2026-07-10T00:00:00.000Z',
      type: 'PERMUTA',
      notes: null,
      allocations: [],
      allocatedAmount: 0,
      unallocatedAmount: 200000,
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    service = jasmine.createSpyObj<InvestmentService>('InvestmentService', [
      'list',
      'remove',
    ]);
    people = jasmine.createSpyObj<PersonService>('PersonService', ['list']);
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    service.list.and.returnValue(of(investments));
    service.remove.and.returnValue(of(investments[0]));
    people.list.and.returnValue(of([]));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [InvestmentsComponent],
      providers: [
        { provide: InvestmentService, useValue: service },
        { provide: PersonService, useValue: people },
        { provide: AuthorizationService, useValue: authorization },
        provideRouter([]),
      ],
    });
  });

  function render(): void {
    fixture = TestBed.createComponent(InvestmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('carrega aportes e somente pessoas INVESTIDOR para criação', () => {
    render();
    expect(service.list).toHaveBeenCalledWith();
    expect(people.list).toHaveBeenCalledOnceWith('INVESTIDOR');
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.INVESTMENTS_WRITE,
    );
  });

  it('calcula indicadores usando os campos autoritativos da API', () => {
    render();
    expect(component.totalInvested()).toBe(700000);
    expect(component.totalAllocated()).toBe(300000);
    expect(component.totalGeneralCash()).toBe(400000);
    expect(component.investorCount()).toBe(2);
  });

  it('filtra por investidor, tipo e busca', () => {
    render();
    component.investorFilter.set('person-1');
    component.typeFilter.set('FINANCEIRO');
    component.search.set('aurora');
    expect(component.filteredInvestments().map(({ id }) => id)).toEqual([
      'investment-1',
    ]);
  });

  it('oculta e bloqueia mutações sem INVESTMENTS_WRITE', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    component.openCreate();
    component.openEdit(investments[0]);
    component.requestDelete(investments[0]);
    component.confirmDelete();
    expect(component.formOpen()).toBeFalse();
    expect(component.deleteTarget()).toBeNull();
    expect(service.remove).not.toHaveBeenCalled();
    expect(people.list).not.toHaveBeenCalled();
  });

  it('navega ao detalhe', () => {
    render();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    component.openDetail('investment-1');
    expect(router.navigate).toHaveBeenCalledWith([
      '/investments',
      'investment-1',
    ]);
  });

  it('impede exclusão duplicada e recarrega depois do sucesso', () => {
    const request = new Subject<InvestmentListItem>();
    service.remove.and.returnValue(request);
    render();
    component.requestDelete(investments[0]);
    component.confirmDelete();
    component.confirmDelete();
    expect(service.remove).toHaveBeenCalledTimes(1);
    request.next(investments[0]);
    request.complete();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('reconcilia 404 concorrente e preserva demais erros', () => {
    service.remove.and.returnValue(throwError(() => ({ status: 404 })));
    render();
    component.requestDelete(investments[0]);
    component.confirmDelete();
    expect(component.deleteTarget()).toBeNull();
    expect(component.actionError()).toContain('não existe mais');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('ignora resposta antiga de listagem', () => {
    const stale = new Subject<InvestmentListItem[]>();
    const fresh = new Subject<InvestmentListItem[]>();
    service.list.and.returnValues(stale, fresh);
    render();
    component.loadInvestments();
    fresh.next([investments[1]]);
    stale.next([investments[0]]);
    expect(component.investments().map(({ id }) => id)).toEqual([
      'investment-2',
    ]);
  });
});
