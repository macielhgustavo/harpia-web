import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AllocationDetail } from '../../core/models/allocation.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { AllocationService } from '../../core/services/allocation.service';
import { AllocationFormModalComponent } from './allocation-form-modal.component';

describe('AllocationFormModalComponent', () => {
  let fixture: ComponentFixture<AllocationFormModalComponent>;
  let component: AllocationFormModalComponent;
  let service: jasmine.SpyObj<AllocationService>;

  const allocation: AllocationDetail = {
    id: 'allocation-1',
    organizationId: 'organization-1',
    investmentId: 'investment-1',
    developmentId: 'development-1',
    development: { id: 'development-1', name: 'Aurora' },
    amount: 300000,
    date: '2026-08-16T00:00:00.000Z',
    notes: 'Primeira etapa',
    returns: [],
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };

  const development: DevelopmentListItem = {
    id: 'development-1',
    organizationId: 'organization-1',
    name: 'Aurora',
    description: null,
    type: 'PREDIO',
    companyId: null,
    company: null,
    address: null,
    city: null,
    status: 'EM_OBRA',
    expectedLaunchDate: null,
    expectedDeliveryDate: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    _count: { units: 10 },
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<AllocationService>('AllocationService', [
      'create',
      'update',
    ]);
    service.create.and.returnValue(of(allocation));
    service.update.and.returnValue(of(allocation));
    TestBed.configureTestingModule({
      imports: [AllocationFormModalComponent],
      providers: [{ provide: AllocationService, useValue: service }],
    });
  });

  function render(editing = false): void {
    fixture = TestBed.createComponent(AllocationFormModalComponent);
    component = fixture.componentInstance;
    component.investmentId = 'investment-1';
    component.investmentAmount = 500000;
    component.allocatedAmount = editing ? 300000 : 0;
    component.developments = [development];
    component.allocation = editing ? allocation : null;
    fixture.detectChanges();
  }

  it('cria uma alocação em empreendimento com payload exato', () => {
    render();
    component.form = {
      developmentId: 'development-1',
      amount: 300000,
      date: '2026-08-16',
      notes: '  Primeira etapa  ',
    };
    component.save();
    expect(service.create).toHaveBeenCalledOnceWith({
      investmentId: 'investment-1',
      developmentId: 'development-1',
      amount: 300000,
      date: '2026-08-16',
      notes: 'Primeira etapa',
    });
  });

  it('representa caixa geral omitindo developmentId na criação', () => {
    render();
    component.form = {
      developmentId: '',
      amount: 50000,
      date: '2026-08-16',
      notes: '',
    };
    component.save();
    expect(service.create).toHaveBeenCalledOnceWith({
      investmentId: 'investment-1',
      amount: 50000,
      date: '2026-08-16',
    });
  });

  it('permite mover uma alocação para caixa geral com null', () => {
    render(true);
    component.form.developmentId = '';
    component.save();
    expect(service.update).toHaveBeenCalledOnceWith('allocation-1', {
      developmentId: null,
    });
  });

  it('considera o valor atual no saldo ao editar', () => {
    render(true);
    expect(component.availableForForm).toBe(500000);
    component.form.amount = 500001;
    component.save();
    expect(service.update).not.toHaveBeenCalled();
    expect(component.amountInvalid()).toBeTrue();
  });

  it('exibe o erro de orçamento devolvido pelo backend', () => {
    service.create.and.returnValue(
      throwError(() => ({
        status: 400,
        error: {
          message: 'Valor excede o disponível para alocar neste aporte.',
        },
      })),
    );
    render();
    component.form.amount = 100000;
    component.form.date = '2026-08-16';
    component.save();
    expect(component.error()).toContain('Valor excede');
  });

  it('bloqueia envio duplicado enquanto salva', () => {
    const pending = new Subject<AllocationDetail>();
    service.create.and.returnValue(pending);
    render();
    component.form.amount = 100000;
    component.form.date = '2026-08-16';
    component.save();
    component.save();
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it('sinaliza registro obsoleto ao receber 404 na edição', () => {
    service.update.and.returnValue(throwError(() => ({ status: 404 })));
    render(true);
    spyOn(component.stale, 'emit');
    component.form.amount = 250000;
    component.save();
    expect(component.stale.emit).toHaveBeenCalled();
  });
});
