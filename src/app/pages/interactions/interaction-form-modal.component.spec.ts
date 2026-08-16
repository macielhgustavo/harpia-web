import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { InteractionListItem } from '../../core/models/interaction.model';
import { Person } from '../../core/models/person.model';
import { InteractionService } from '../../core/services/interaction.service';
import { InteractionFormModalComponent } from './interaction-form-modal.component';

describe('InteractionFormModalComponent', () => {
  let fixture: ComponentFixture<InteractionFormModalComponent>;
  let component: InteractionFormModalComponent;
  let service: jasmine.SpyObj<InteractionService>;

  const person: Person = {
    id: 'person-1',
    organizationId: 'organization-1',
    name: 'Ana Cliente',
    personType: 'FISICA',
    roles: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  const interaction: InteractionListItem = {
    id: 'interaction-1',
    organizationId: 'organization-1',
    personId: 'person-1',
    person: { id: 'person-1', name: 'Ana Cliente' },
    date: '2026-08-16T00:00:00.000Z',
    type: 'REUNIAO',
    summary: 'Alinhamento',
    nextStep: 'Enviar proposta',
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<InteractionService>('InteractionService', [
      'create',
      'update',
    ]);
    service.create.and.returnValue(of(interaction));
    service.update.and.returnValue(of(interaction));
    TestBed.configureTestingModule({
      imports: [InteractionFormModalComponent],
      providers: [{ provide: InteractionService, useValue: service }],
    });
  });

  function render(editing = false, fixed = false): void {
    fixture = TestBed.createComponent(InteractionFormModalComponent);
    component = fixture.componentInstance;
    component.people = [person];
    component.interaction = editing ? interaction : null;
    if (fixed) {
      component.fixedPersonId = person.id;
      component.fixedPersonName = person.name;
    }
    fixture.detectChanges();
  }

  it('cria com pessoa, enum real e campos normalizados', () => {
    render();
    component.form = {
      personId: 'person-1',
      date: '2026-08-16',
      type: 'WHATSAPP',
      summary: '  Retorno sobre proposta  ',
      nextStep: '  Ligar amanhã  ',
    };
    component.save();
    expect(service.create).toHaveBeenCalledOnceWith({
      personId: 'person-1',
      date: '2026-08-16',
      type: 'WHATSAPP',
      summary: 'Retorno sobre proposta',
      nextStep: 'Ligar amanhã',
    });
  });

  it('aceita pessoa fixa no detalhe e não exige lista', () => {
    render(false, true);
    component.people = [];
    component.form.summary = 'Contato feito';
    component.save();
    expect(service.create.calls.mostRecent().args[0].personId).toBe('person-1');
  });

  it('edita sem permitir trocar pessoa e limpa próximo passo', () => {
    render(true);
    component.form.nextStep = '';
    component.save();
    expect(service.update).toHaveBeenCalledOnceWith('interaction-1', {
      date: '2026-08-16',
      type: 'REUNIAO',
      summary: 'Alinhamento',
      nextStep: '',
    });
  });

  it('rejeita resumo em branco', () => {
    render(false, true);
    component.form.summary = '   ';
    component.save();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('bloqueia clique duplicado', () => {
    const request = new Subject<InteractionListItem>();
    service.create.and.returnValue(request);
    render(false, true);
    component.form.summary = 'Contato';
    component.save();
    component.save();
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it('preserva erro real e sinaliza 404', () => {
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
