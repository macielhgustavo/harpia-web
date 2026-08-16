import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Investment } from '../../core/models/investment.model';
import { Person } from '../../core/models/person.model';
import { InvestmentService } from '../../core/services/investment.service';
import { InvestmentFormModalComponent } from './investment-form-modal.component';

describe('InvestmentFormModalComponent', () => {
  let fixture: ComponentFixture<InvestmentFormModalComponent>;
  let component: InvestmentFormModalComponent;
  let service: jasmine.SpyObj<InvestmentService>;

  const investor: Person = {
    id: 'person-1',
    name: 'Ana Investidora',
    personType: 'FISICA',
    roles: [],
    organizationId: 'organization-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  const investment: Investment = {
    id: 'investment-1',
    organizationId: 'organization-1',
    investorId: investor.id,
    amount: 500000,
    date: '2026-08-16T00:00:00.000Z',
    type: 'FINANCEIRO',
    notes: 'Inicial',
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<InvestmentService>('InvestmentService', [
      'create',
      'update',
    ]);
    service.create.and.returnValue(of(investment));
    service.update.and.returnValue(of(investment));
    TestBed.configureTestingModule({
      imports: [InvestmentFormModalComponent],
      providers: [{ provide: InvestmentService, useValue: service }],
    });
  });

  function render(editing = false): void {
    fixture = TestBed.createComponent(InvestmentFormModalComponent);
    component = fixture.componentInstance;
    component.investors = [investor];
    if (editing) {
      component.investment = investment;
      component.investorName = investor.name;
    }
    fixture.detectChanges();
  }

  it('cria somente com investidor selecionado e payload normalizado', () => {
    render();
    component.form = {
      investorId: investor.id,
      amount: 500000,
      date: '2026-08-16',
      type: 'FINANCEIRO',
      notes: '  Aporte inicial  ',
    };

    component.save();

    expect(service.create).toHaveBeenCalledOnceWith({
      investorId: investor.id,
      amount: 500000,
      date: '2026-08-16',
      type: 'FINANCEIRO',
      notes: 'Aporte inicial',
    });
  });

  it('bloqueia investidor ausente e valor não positivo', () => {
    render();
    component.form.investorId = '';
    component.form.amount = 0;

    component.save();

    expect(service.create).not.toHaveBeenCalled();
    expect(component.submitted()).toBeTrue();
  });

  it('não permite trocar investidor na edição e envia apenas diferenças', () => {
    render(true);
    component.form.amount = 600000;
    component.form.notes = '';

    component.save();

    expect(service.update).toHaveBeenCalledOnceWith('investment-1', {
      amount: 600000,
      notes: '',
    });
  });

  it('evita requisição e preserva resposta ao salvar edição sem diferenças', () => {
    render(true);
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    component.save();

    expect(service.update).not.toHaveBeenCalled();
    expect(saved).toHaveBeenCalledWith(investment);
  });

  it('impede duplo envio e mostra erro real da API', () => {
    const request = new Subject<Investment>();
    service.create.and.returnValue(request);
    render();
    component.form.investorId = investor.id;
    component.form.amount = 100;

    component.save();
    component.save();
    expect(service.create).toHaveBeenCalledTimes(1);

    request.error({ error: { message: 'Investidor inválido' } });
    expect(component.error()).toBe('Investidor inválido');
  });

  it('sinaliza 404 concorrente na edição', () => {
    service.update.and.returnValue(throwError(() => ({ status: 404 })));
    render(true);
    component.form.amount = 600000;
    const stale = jasmine.createSpy('stale');
    component.stale.subscribe(stale);

    component.save();

    expect(stale).toHaveBeenCalled();
  });
});
