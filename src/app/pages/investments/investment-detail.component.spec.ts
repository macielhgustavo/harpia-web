import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { InvestmentDetail } from '../../core/models/investment.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InvestmentService } from '../../core/services/investment.service';
import { InvestmentDetailComponent } from './investment-detail.component';

describe('InvestmentDetailComponent', () => {
  let fixture: ComponentFixture<InvestmentDetailComponent>;
  let component: InvestmentDetailComponent;
  let service: jasmine.SpyObj<InvestmentService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

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
    service.getById.and.returnValue(of(detail));
    service.remove.and.returnValue(of(detail));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [InvestmentDetailComponent],
      providers: [
        { provide: InvestmentService, useValue: service },
        { provide: AuthorizationService, useValue: authorization },
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
  });

  it('calcula caixa geral, percentual e atraso apenas na apresentação', () => {
    render();
    expect(component.allocationPercentage(detail.allocations[0])).toBe(60);
    expect(component.returnStatusLabel(detail.allocations[0].returns[0])).toBe(
      'Atrasado',
    );
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
