import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flushMicrotasks,
} from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { UnitType } from '../../core/models/unit-type.model';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { UnitTypeFormModalComponent } from './unit-type-form-modal.component';

const UNIT_TYPE: UnitType = {
  id: 'type-1',
  organizationId: 'organization-1',
  developmentId: 'development-1',
  name: 'Dois quartos',
  bedrooms: 2,
  suites: null,
  standardArea: 55.5,
  createdAt: '2026-08-09T12:00:00.000Z',
  updatedAt: '2026-08-09T12:00:00.000Z',
};

@Component({
  standalone: true,
  imports: [UnitTypeFormModalComponent],
  template: `
    <button id="modal-opener" type="button" (click)="open = true">Abrir</button>
    @if (open) {
      <app-unit-type-form-modal
        developmentId="development-1"
        (closed)="open = false"
      />
    }
  `,
})
class ModalHostComponent {
  open = false;
}

describe('UnitTypeFormModalComponent', () => {
  let fixture: ComponentFixture<UnitTypeFormModalComponent>;
  let component: UnitTypeFormModalComponent;
  let service: jasmine.SpyObj<UnitTypeService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<UnitTypeService>('UnitTypeService', [
      'create',
      'update',
    ]);
    service.create.and.returnValue(of(UNIT_TYPE));
    service.update.and.returnValue(of(UNIT_TYPE));

    await TestBed.configureTestingModule({
      imports: [ModalHostComponent, UnitTypeFormModalComponent],
      providers: [{ provide: UnitTypeService, useValue: service }],
    }).compileComponents();
  });

  function render(unitType: UnitType | null = null): void {
    fixture = TestBed.createComponent(UnitTypeFormModalComponent);
    component = fixture.componentInstance;
    component.developmentId = 'development-1';
    component.unitType = unitType;
    fixture.detectChanges();
  }

  it('inicializa criação e edição com os valores esperados', () => {
    render();
    expect(component.isEditing).toBeFalse();
    expect(component.form).toEqual({
      name: '',
      bedrooms: '',
      suites: '',
      standardArea: '',
    });

    fixture.destroy();
    render(UNIT_TYPE);
    expect(component.isEditing).toBeTrue();
    expect(component.form).toEqual({
      name: 'Dois quartos',
      bedrooms: '2',
      suites: '',
      standardArea: '55.5',
    });
  });

  it('exige nome, anuncia o erro, foca o campo e valida números opcionais', fakeAsync(() => {
    render();
    component.form.name = '   ';
    component.form.bedrooms = '-1';
    component.form.suites = '1,5';
    component.form.standardArea = '-0,1';

    component.save();
    fixture.detectChanges();
    flushMicrotasks();

    expect(component.nameInvalid()).toBeTrue();
    expect(component.bedroomsInvalid()).toBeTrue();
    expect(component.suitesInvalid()).toBeTrue();
    expect(component.standardAreaInvalid()).toBeTrue();
    expect(service.create).not.toHaveBeenCalled();
    const nameInput = fixture.nativeElement.querySelector(
      '#unit-type-name',
    ) as HTMLInputElement;
    expect(nameInput.required).toBeTrue();
    expect(nameInput.getAttribute('aria-required')).toBe('true');
    expect(document.activeElement).toBe(nameInput);
    expect(
      fixture.nativeElement
        .querySelector('#unit-type-name-error')
        .getAttribute('role'),
    ).toBe('alert');

    component.form.name = 'a'.repeat(121);
    expect(component.nameInvalid()).toBeTrue();

    component.form.name = 'Compacto';
    component.form.bedrooms = '1';
    component.form.suites = '2';
    component.form.standardArea = '35,25';
    component.save();
    expect(service.create).toHaveBeenCalled();
  }));

  it('omite campos numéricos vazios no POST e remove espaços do nome', () => {
    render();
    component.form.name = '  Studio  ';

    component.save();

    expect(service.create).toHaveBeenCalledOnceWith({
      developmentId: 'development-1',
      name: 'Studio',
    });
  });

  it('aceita vírgula decimal e preserva valores zero no POST', () => {
    render();
    component.form = {
      name: 'Studio',
      bedrooms: '0',
      suites: '0',
      standardArea: '55,50',
    };

    component.save();

    expect(service.create).toHaveBeenCalledOnceWith({
      developmentId: 'development-1',
      name: 'Studio',
      bedrooms: 0,
      suites: 0,
      standardArea: 55.5,
    });
  });

  it('envia null no PATCH somente para campos preenchidos anteriormente', () => {
    render(UNIT_TYPE);
    component.form.name = '  Dois quartos atualizado  ';
    component.form.bedrooms = '';
    component.form.suites = '';
    component.form.standardArea = '';

    component.save();

    expect(service.update).toHaveBeenCalledOnceWith('type-1', {
      name: 'Dois quartos atualizado',
      bedrooms: null,
      standardArea: null,
    });
    const payload = service.update.calls.mostRecent().args[1];
    expect(payload.name).not.toBeNull();
    expect('developmentId' in payload).toBeFalse();
  });

  it('preserva zero em todos os campos numéricos no PATCH', () => {
    render(UNIT_TYPE);
    component.form = {
      name: UNIT_TYPE.name,
      bedrooms: '0',
      suites: '0',
      standardArea: '0',
    };

    component.save();

    expect(service.update).toHaveBeenCalledOnceWith('type-1', {
      name: UNIT_TYPE.name,
      bedrooms: 0,
      suites: 0,
      standardArea: 0,
    });
  });

  it('bloqueia envio duplicado e emite o registro salvo', () => {
    const request = new Subject<UnitType>();
    service.create.and.returnValue(request);
    render();
    component.form.name = 'Studio';
    const saved = jasmine.createSpy();
    component.saved.subscribe(saved);

    component.save();
    component.save();

    expect(component.saving()).toBeTrue();
    expect(service.create).toHaveBeenCalledTimes(1);
    request.next(UNIT_TYPE);
    expect(component.saving()).toBeFalse();
    expect(saved).toHaveBeenCalledOnceWith(UNIT_TYPE);
  });

  it('exibe a mensagem retornada pela API e libera nova tentativa', () => {
    service.create.and.returnValue(
      throwError(() => ({
        error: { message: 'Nome de tipologia já utilizado' },
      })),
    );
    render();
    component.form.name = 'Duplicada';

    component.save();
    fixture.detectChanges();

    expect(component.saving()).toBeFalse();
    expect(component.error()).toBe('Nome de tipologia já utilizado');
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Nome de tipologia já utilizado');
  });

  it('propaga um 404 para a seção reconciliar uma edição obsoleta', () => {
    service.update.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render(UNIT_TYPE);
    const stale = jasmine.createSpy();
    component.stale.subscribe(stale);

    component.save();

    expect(component.saving()).toBeFalse();
    expect(stale).toHaveBeenCalledTimes(1);
  });

  it('mantém o foco no diálogo, fecha com Escape e restaura o foco', fakeAsync(() => {
    const hostFixture = TestBed.createComponent(ModalHostComponent);
    hostFixture.detectChanges();
    const opener = hostFixture.nativeElement.querySelector(
      '#modal-opener',
    ) as HTMLButtonElement;
    opener.focus();
    opener.click();
    hostFixture.detectChanges();
    flushMicrotasks();

    const nameInput = hostFixture.nativeElement.querySelector(
      '#unit-type-name',
    ) as HTMLInputElement;
    const submit = hostFixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    const closeButton = hostFixture.nativeElement.querySelector(
      'button[aria-label="Fechar formulário de tipologia"]',
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(nameInput);

    submit.focus();
    submit.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(closeButton);

    nameInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    hostFixture.detectChanges();
    flushMicrotasks();
    expect(
      hostFixture.nativeElement.querySelector('[role="dialog"]'),
    ).toBeNull();
    expect(document.activeElement).toBe(opener);
  }));

  it('ignora fechamento enquanto salva', () => {
    service.create.and.returnValue(new Subject<UnitType>());
    render();
    component.form.name = 'Studio';
    const closed = jasmine.createSpy();
    component.closed.subscribe(closed);

    component.save();
    component.requestClose();

    expect(closed).not.toHaveBeenCalled();
  });
});
