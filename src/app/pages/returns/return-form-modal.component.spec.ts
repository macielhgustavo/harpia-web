import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Return, ReturnListItem } from '../../core/models/return.model';
import { ReturnService } from '../../core/services/return.service';
import { ReturnFormModalComponent } from './return-form-modal.component';

describe('ReturnFormModalComponent', () => {
  let fixture: ComponentFixture<ReturnFormModalComponent>;
  let component: ReturnFormModalComponent;
  let service: jasmine.SpyObj<ReturnService>;

  const item: ReturnListItem = {
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

  beforeEach(() => {
    service = jasmine.createSpyObj<ReturnService>('ReturnService', [
      'create',
      'update',
    ]);
    service.create.and.returnValue(of(item));
    service.update.and.returnValue(of(item));
    TestBed.configureTestingModule({
      imports: [ReturnFormModalComponent],
      providers: [{ provide: ReturnService, useValue: service }],
    });
  });

  function render(mode: 'create' | 'edit' | 'pay'): void {
    fixture = TestBed.createComponent(ReturnFormModalComponent);
    component = fixture.componentInstance;
    component.mode = mode;
    component.investmentReturn = mode === 'create' ? null : item;
    component.allocations = [{ id: 'allocation-1', label: 'Ana — Aurora' }];
    fixture.detectChanges();
  }

  it('programa retorno pendente sem enviar ATRASADO', () => {
    render('create');
    component.form = {
      allocationId: 'allocation-1',
      amount: 25000,
      date: '2026-09-20',
    };
    component.save();
    expect(service.create).toHaveBeenCalledOnceWith({
      allocationId: 'allocation-1',
      expectedAmount: 25000,
      expectedDate: '2026-09-20',
    });
  });

  it('edita apenas os dados previstos', () => {
    render('edit');
    component.form.amount = 30000;
    component.save();
    expect(service.update).toHaveBeenCalledOnceWith('return-1', {
      expectedAmount: 30000,
      expectedDate: '2026-09-20',
    });
  });

  it('marca como pago exigindo valor e data realizados', () => {
    render('pay');
    component.form.amount = 24000;
    component.form.date = '2026-08-16';
    component.save();
    expect(service.update).toHaveBeenCalledOnceWith('return-1', {
      realizedAmount: 24000,
      realizedDate: '2026-08-16',
      status: 'PAGO',
    });
  });

  it('não envia com valor inválido', () => {
    render('pay');
    component.form.amount = 0;
    component.save();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('bloqueia clique duplicado', () => {
    const pending = new Subject<Return>();
    service.update.and.returnValue(pending);
    render('pay');
    component.save();
    component.save();
    expect(service.update).toHaveBeenCalledTimes(1);
  });

  it('propaga mensagem real e sinaliza 404', () => {
    service.update.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'Dados de pagamento inválidos' },
      })),
    );
    render('pay');
    component.save();
    expect(component.error()).toBe('Dados de pagamento inválidos');

    service.update.and.returnValue(throwError(() => ({ status: 404 })));
    spyOn(component.stale, 'emit');
    component.save();
    expect(component.stale.emit).toHaveBeenCalled();
  });
});
