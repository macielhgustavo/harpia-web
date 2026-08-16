import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { AllocationListItem } from '../../core/models/allocation.model';
import { InvestmentListItem } from '../../core/models/investment.model';
import { ReturnListItem } from '../../core/models/return.model';
import { AllocationService } from '../../core/services/allocation.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InvestmentService } from '../../core/services/investment.service';
import { ReturnService } from '../../core/services/return.service';
import { ReturnsComponent } from './returns.component';

describe('ReturnsComponent', () => {
  let fixture: ComponentFixture<ReturnsComponent>;
  let component: ReturnsComponent;
  let returnService: jasmine.SpyObj<ReturnService>;
  let allocationService: jasmine.SpyObj<AllocationService>;
  let investmentService: jasmine.SpyObj<InvestmentService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  const pending: ReturnListItem = {
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
    allocation: {
      id: 'allocation-1',
      developmentId: 'development-1',
      development: { id: 'development-1', name: 'Aurora' },
      investmentId: 'investment-1',
      investment: {
        id: 'investment-1',
        investor: { id: 'person-1', name: 'Ana Investidora' },
      },
    },
  };

  const overdue: ReturnListItem = {
    ...pending,
    id: 'return-2',
    expectedAmount: 10000,
    status: 'ATRASADO',
    allocation: {
      ...pending.allocation,
      id: 'allocation-2',
      developmentId: null,
      development: null,
    },
  };

  const paid: ReturnListItem = {
    ...pending,
    id: 'return-3',
    expectedAmount: 12000,
    realizedAmount: 11500,
    realizedDate: '2026-08-15T00:00:00.000Z',
    status: 'PAGO',
  };

  const allocation: AllocationListItem = {
    id: 'allocation-1',
    organizationId: 'organization-1',
    investmentId: 'investment-1',
    developmentId: 'development-1',
    development: { id: 'development-1', name: 'Aurora' },
    investment: {
      id: 'investment-1',
      amount: 100000,
      investorId: 'person-1',
    },
    amount: 80000,
    date: '2026-08-01T00:00:00.000Z',
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  const investment: InvestmentListItem = {
    id: 'investment-1',
    organizationId: 'organization-1',
    investorId: 'person-1',
    investor: { id: 'person-1', name: 'Ana Investidora' },
    amount: 100000,
    date: '2026-08-01T00:00:00.000Z',
    type: 'FINANCEIRO',
    notes: null,
    allocations: [],
    allocatedAmount: 80000,
    unallocatedAmount: 20000,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  beforeEach(() => {
    returnService = jasmine.createSpyObj<ReturnService>('ReturnService', [
      'list',
      'remove',
    ]);
    allocationService = jasmine.createSpyObj<AllocationService>(
      'AllocationService',
      ['list'],
    );
    investmentService = jasmine.createSpyObj<InvestmentService>(
      'InvestmentService',
      ['list'],
    );
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    returnService.list.and.returnValue(of([pending, overdue, paid]));
    returnService.remove.and.returnValue(of(pending));
    allocationService.list.and.returnValue(of([allocation]));
    investmentService.list.and.returnValue(of([investment]));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [ReturnsComponent],
      providers: [
        { provide: ReturnService, useValue: returnService },
        { provide: AllocationService, useValue: allocationService },
        { provide: InvestmentService, useValue: investmentService },
        { provide: AuthorizationService, useValue: authorization },
        provideRouter([]),
      ],
    });
  });

  function render(): void {
    fixture = TestBed.createComponent(ReturnsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('carrega dados, opções e indicadores sem persistir ATRASADO', () => {
    render();
    expect(returnService.list).toHaveBeenCalledOnceWith();
    expect(component.expectedTotal()).toBe(47000);
    expect(component.paidTotal()).toBe(11500);
    expect(component.pendingTotal()).toBe(25000);
    expect(component.overdueTotal()).toBe(10000);
    expect(component.allocationOptions()[0].label).toContain('Ana Investidora');
  });

  it('filtra por status, destino, investidor e busca', () => {
    render();
    component.statusFilter.set('ATRASADO');
    component.destinationFilter.set('GENERAL');
    component.investorFilter.set('person-1');
    component.search.set('caixa');
    expect(component.filteredReturns()).toEqual([overdue]);
    component.resetFilters();
    expect(component.filteredReturns().length).toBe(3);
  });

  it('abre a ação principal de pagamento apenas para não pagos', () => {
    render();
    component.openPayment(pending);
    expect(component.formMode()).toBe('pay');
    expect(component.formOpen()).toBeTrue();
    component.closeForm();
    component.openPayment(paid);
    expect(component.formOpen()).toBeFalse();
  });

  it('oculta e bloqueia mutações sem RETURNS_WRITE', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    component.openCreate();
    component.openEdit(pending);
    component.requestDelete(pending);
    expect(component.formOpen()).toBeFalse();
    expect(component.deleteOpen()).toBeFalse();
    expect(allocationService.list).not.toHaveBeenCalled();
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.RETURNS_WRITE,
    );
  });

  it('impede exclusão duplicada e recarrega no sucesso', () => {
    const request = new Subject<ReturnListItem>();
    returnService.remove.and.returnValue(request);
    render();
    component.requestDelete(pending);
    component.confirmDelete();
    component.confirmDelete();
    expect(returnService.remove).toHaveBeenCalledOnceWith('return-1');
    request.next(pending);
    request.complete();
    expect(returnService.list).toHaveBeenCalledTimes(2);
  });

  it('reconcilia 404 sem expor tenant', () => {
    returnService.remove.and.returnValue(throwError(() => ({ status: 404 })));
    render();
    component.requestDelete(pending);
    component.confirmDelete();
    expect(component.deleteOpen()).toBeFalse();
    expect(component.feedback()).toContain('não existe mais');
    expect(returnService.list).toHaveBeenCalledTimes(2);
  });

  it('mostra erro e retry da listagem', () => {
    returnService.list.and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Falha real' } })),
    );
    render();
    expect(component.error()).toBe('Falha real');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });
});
