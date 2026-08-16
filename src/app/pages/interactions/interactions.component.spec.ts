import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { InteractionListItem } from '../../core/models/interaction.model';
import { Person } from '../../core/models/person.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InteractionService } from '../../core/services/interaction.service';
import { PersonService } from '../../core/services/person.service';
import { InteractionsComponent } from './interactions.component';

describe('InteractionsComponent', () => {
  let fixture: ComponentFixture<InteractionsComponent>;
  let component: InteractionsComponent;
  let interactionService: jasmine.SpyObj<InteractionService>;
  let personService: jasmine.SpyObj<PersonService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  const person: Person = {
    id: 'person-1',
    organizationId: 'organization-1',
    name: 'Ana Cliente',
    personType: 'FISICA',
    roles: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  const first: InteractionListItem = {
    id: 'interaction-1',
    organizationId: 'organization-1',
    personId: 'person-1',
    person: { id: 'person-1', name: 'Ana Cliente' },
    date: '2026-08-16T00:00:00.000Z',
    type: 'REUNIAO',
    summary: 'Alinhamento da proposta',
    nextStep: 'Enviar minuta',
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };
  const second: InteractionListItem = {
    ...first,
    id: 'interaction-2',
    personId: 'person-2',
    person: { id: 'person-2', name: 'Bruno Fornecedor' },
    type: 'EMAIL',
    summary: 'Documentos recebidos',
    nextStep: null,
  };

  beforeEach(() => {
    interactionService = jasmine.createSpyObj<InteractionService>(
      'InteractionService',
      ['list', 'remove'],
    );
    personService = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    interactionService.list.and.returnValue(of([first, second]));
    interactionService.remove.and.returnValue(of(first));
    personService.list.and.returnValue(of([person]));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [InteractionsComponent],
      providers: [
        { provide: InteractionService, useValue: interactionService },
        { provide: PersonService, useValue: personService },
        { provide: AuthorizationService, useValue: authorization },
        provideRouter([]),
      ],
    });
  });

  function render(): void {
    fixture = TestBed.createComponent(InteractionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('carrega timeline, pessoas e indicadores', () => {
    render();
    expect(interactionService.list).toHaveBeenCalledOnceWith();
    expect(personService.list).toHaveBeenCalledOnceWith();
    expect(component.interactions().length).toBe(2);
    expect(component.peopleCount()).toBe(2);
    expect(component.withNextStep()).toBe(1);
    expect(component.typeOptions.map((item) => item.value)).not.toContain(
      'VISITA' as never,
    );
  });

  it('filtra por pessoa, tipo e conteúdo', () => {
    render();
    component.personFilter.set('person-1');
    component.typeFilter.set('REUNIAO');
    component.search.set('minuta');
    expect(component.filteredInteractions()).toEqual([first]);
    component.resetFilters();
    expect(component.filteredInteractions().length).toBe(2);
  });

  it('oculta e bloqueia mutações sem permissão', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    component.openCreate();
    component.openEdit(first);
    component.requestDelete(first);
    expect(component.formOpen()).toBeFalse();
    expect(component.deleteOpen()).toBeFalse();
    expect(personService.list).not.toHaveBeenCalled();
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.INTERACTIONS_WRITE,
    );
  });

  it('impede exclusão duplicada e atualiza no sucesso', () => {
    const request = new Subject<InteractionListItem>();
    interactionService.remove.and.returnValue(request);
    render();
    component.requestDelete(first);
    component.confirmDelete();
    component.confirmDelete();
    expect(interactionService.remove).toHaveBeenCalledOnceWith('interaction-1');
    request.next(first);
    request.complete();
    expect(interactionService.list).toHaveBeenCalledTimes(2);
  });

  it('reconcilia 404 e mostra erro de listagem com retry', () => {
    interactionService.remove.and.returnValue(
      throwError(() => ({ status: 404 })),
    );
    render();
    component.requestDelete(first);
    component.confirmDelete();
    expect(component.feedback()).toContain('não existe mais');

    interactionService.list.and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Falha real' } })),
    );
    component.loadInteractions();
    fixture.detectChanges();
    expect(component.error()).toBe('Falha real');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });
});
