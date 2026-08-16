import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { InvestmentDetail } from '../../core/models/investment.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { AllocationService } from '../../core/services/allocation.service';
import { DevelopmentService } from '../../core/services/development.service';
import { DocumentService } from '../../core/services/document.service';
import { InvestmentService } from '../../core/services/investment.service';
import { InvestmentDetailComponent } from './investment-detail.component';

describe('InvestmentDetailComponent', () => {
  let fixture: ComponentFixture<InvestmentDetailComponent>;
  let component: InvestmentDetailComponent;
  let service: jasmine.SpyObj<InvestmentService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;
  let allocationService: jasmine.SpyObj<AllocationService>;
  let developmentService: jasmine.SpyObj<DevelopmentService>;
  let documentService: jasmine.SpyObj<DocumentService>;

  const detail: InvestmentDetail = {
    id: 'investment-1',
    organizationId: 'organization-1',
    investorId: 'person-1',
    investor: { id: 'person-1', name: 'Ana Investidora' },
    amount: 500000,
    date: '2026-08-16T00:00:00.000Z',
    type: 'FINANCEIRO',
    notes: 'Aporte inicial',
    allocatedAmount: 300000,
    unallocatedAmount: 200000,
    allocations: [
      {
        id: 'allocation-1',
        organizationId: 'organization-1',
        investmentId: 'investment-1',
        developmentId: 'development-1',
        development: { id: 'development-1', name: 'Aurora' },
        amount: 300000,
        date: '2026-08-16T00:00:00.000Z',
        notes: null,
        returns: [
          {
            id: 'return-1',
            organizationId: 'organization-1',
            allocationId: 'allocation-1',
            expectedAmount: 10000,
            expectedDate: '2026-08-10T00:00:00.000Z',
            realizedDate: null,
            realizedAmount: null,
            status: 'PENDENTE',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
        createdAt: '2026-08-16T00:00:00.000Z',
        updatedAt: '2026-08-16T00:00:00.000Z',
      },
    ],
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<InvestmentService>('InvestmentService', [
      'getById',
      'remove',
    ]);
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    allocationService = jasmine.createSpyObj<AllocationService>(
      'AllocationService',
      ['remove'],
    );
    developmentService = jasmine.createSpyObj<DevelopmentService>(
      'DevelopmentService',
      ['list'],
    );
    documentService = jasmine.createSpyObj<DocumentService>('DocumentService', [
      'list',
      'upload',
      'download',
      'remove',
    ]);
    service.getById.and.returnValue(of(detail));
    service.remove.and.returnValue(of(detail));
    allocationService.remove.and.returnValue(of(detail.allocations[0]));
    developmentService.list.and.returnValue(of([]));
    documentService.list.and.returnValue(of([]));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [InvestmentDetailComponent],
      providers: [
        { provide: InvestmentService, useValue: service },
        { provide: AuthorizationService, useValue: authorization },
        { provide: AllocationService, useValue: allocationService },
        { provide: DevelopmentService, useValue: developmentService },
        { provide: DocumentService, useValue: documentService },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'investment-1' } } },
        },
      ],
    });
  });

  function render(): void {
    fixture = TestBed.createComponent(InvestmentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('carrega o detalhe completo e os retornos associados', () => {
    render();
    expect(service.getById).toHaveBeenCalledOnceWith('investment-1');
    expect(component.returns().length).toBe(1);
    expect(component.expectedReturns()).toBe(10000);
    expect(fixture.nativeElement.textContent).toContain('Aurora');
    expect(documentService.list).toHaveBeenCalledOnceWith({
      investmentId: 'investment-1',
    });
  });

  it('calcula caixa geral, percentual e atraso apenas na apresentação', () => {
    render();
    expect(component.allocationPercentage(detail.allocations[0])).toBe(60);
    expect(component.returnStatusLabel(detail.allocations[0].returns[0])).toBe(
      'Atrasado',
    );
    expect(component.allocatedTotal()).toBe(300000);
    expect(component.availableAmount()).toBe(200000);
  });

  it('inclui alocações de caixa geral no total consumido', () => {
    service.getById.and.returnValue(
      of({
        ...detail,
        allocations: [
          ...detail.allocations,
          {
            ...detail.allocations[0],
            id: 'allocation-2',
            developmentId: null,
            development: null,
            amount: 50000,
            returns: [],
          },
        ],
      }),
    );
    render();
    expect(component.allocatedTotal()).toBe(350000);
    expect(component.availableAmount()).toBe(150000);
  });

  it('trata 404 sem expor diferença de tenant', () => {
    service.getById.and.returnValue(throwError(() => ({ status: 404 })));
    render();
    expect(component.notFound()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain(
      'não existe ou não pertence',
    );
  });

  it('oculta e bloqueia edição e exclusão sem permissão', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    component.openEdit();
    component.requestDelete();
    component.confirmDelete();
    expect(component.formOpen()).toBeFalse();
    expect(component.deleteOpen()).toBeFalse();
    expect(service.remove).not.toHaveBeenCalled();
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.INVESTMENTS_WRITE,
    );
  });

  it('impede exclusão duplicada e volta à lista no sucesso', () => {
    const request = new Subject<InvestmentDetail>();
    service.remove.and.returnValue(request);
    render();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    component.requestDelete();
    component.confirmDelete();
    component.confirmDelete();
    expect(service.remove).toHaveBeenCalledTimes(1);
    request.next(detail);
    request.complete();
    expect(router.navigate).toHaveBeenCalledWith(['/investments'], {
      queryParams: { feedback: 'removed' },
    });
  });

  it('abre criação somente com saldo e empreendimentos disponíveis', () => {
    render();
    component.openCreateAllocation();
    expect(component.allocationFormOpen()).toBeTrue();
    component.closeAllocationForm();
    component.developmentsError.set('Falha');
    component.openCreateAllocation();
    expect(component.allocationFormOpen()).toBeFalse();
  });

  it('exclui alocação uma vez e atualiza o detalhe', () => {
    const pending = new Subject<(typeof detail.allocations)[number]>();
    allocationService.remove.and.returnValue(pending);
    render();
    component.requestAllocationDelete(detail.allocations[0]);
    component.confirmAllocationDelete();
    component.confirmAllocationDelete();
    expect(allocationService.remove).toHaveBeenCalledOnceWith('allocation-1');
    pending.next(detail.allocations[0]);
    pending.complete();
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(component.feedback()).toContain('excluída');
  });

  it('reconcilia 404 de alocação sem marcar o investimento como ausente', () => {
    allocationService.remove.and.returnValue(
      throwError(() => ({ status: 404 })),
    );
    render();
    component.requestAllocationDelete(detail.allocations[0]);
    component.confirmAllocationDelete();
    expect(component.allocationDeleteOpen()).toBeFalse();
    expect(component.notFound()).toBeFalse();
    expect(service.getById).toHaveBeenCalledTimes(2);
  });

  it('descarta resposta antiga de atualização', () => {
    const stale = new Subject<InvestmentDetail>();
    const fresh = new Subject<InvestmentDetail>();
    service.getById.and.returnValues(stale, fresh);
    render();
    component.loadInvestment();
    fresh.next({ ...detail, amount: 600000 });
    stale.next(detail);
    expect(component.investment()?.amount).toBe(600000);
  });
});
