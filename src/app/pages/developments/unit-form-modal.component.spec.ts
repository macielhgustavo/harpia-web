import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { Unit } from '../../core/models/unit.model';
import { UnitType } from '../../core/models/unit-type.model';
import { UnitService } from '../../core/services/unit.service';
import { UnitFormModalComponent } from './unit-form-modal.component';

const UNIT_TYPES: UnitType[] = [
  {
    id: 'type-1',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Dois quartos',
    bedrooms: 2,
    suites: 1,
    standardArea: 55,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
  },
];

const UNIT: Unit = {
  id: 'unit-1',
  organizationId: 'organization-1',
  developmentId: 'development-1',
  identifier: 'Apto 101',
  unitTypeId: 'type-1',
  category: 'APARTAMENTO',
  grouping: 'Torre A',
  landArea: null,
  builtArea: 55,
  parkingSpots: 1,
  status: 'DISPONIVEL',
  notes: 'Sol da manhã',
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
  unitType: { id: 'type-1', name: 'Dois quartos' },
};

class UnitServiceMock {
  readonly create = jasmine.createSpy().and.returnValue(of(UNIT));
  readonly update = jasmine.createSpy().and.returnValue(of(UNIT));
}

describe('UnitFormModalComponent', () => {
  let fixture: ComponentFixture<UnitFormModalComponent>;
  let component: UnitFormModalComponent;
  let service: UnitServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitFormModalComponent],
      providers: [{ provide: UnitService, useClass: UnitServiceMock }],
    }).compileComponents();
    service = TestBed.inject(UnitService) as unknown as UnitServiceMock;
  });

  function render(unit: Unit | null = null): void {
    fixture = TestBed.createComponent(UnitFormModalComponent);
    component = fixture.componentInstance;
    component.developmentId = 'development-1';
    component.unitTypes = UNIT_TYPES;
    component.unit = unit;
    fixture.detectChanges();
  }

  it('inicia criação com os enums reais e status disponível', () => {
    render();

    expect(component.form.category).toBe('APARTAMENTO');
    expect(component.form.status).toBe('DISPONIVEL');
    expect(fixture.nativeElement.textContent).toContain('Sala comercial');
    expect(fixture.nativeElement.textContent).toContain('Permutada');
    expect(fixture.nativeElement.textContent).toContain('Dois quartos');
  });

  it('preenche a edição incluindo valores nulos e relacionamentos', () => {
    render(UNIT);

    expect(component.form.identifier).toBe('Apto 101');
    expect(component.form.unitTypeId).toBe('type-1');
    expect(component.form.landArea).toBe('');
    expect(component.form.builtArea).toBe('55');
    expect(component.form.notes).toBe('Sol da manhã');
  });

  it('valida identificador e números antes de escrever', async () => {
    render();
    component.form.identifier = ' ';
    component.form.builtArea = '-1';
    component.form.parkingSpots = '1,5';

    component.save();
    await fixture.whenStable();

    expect(service.create).not.toHaveBeenCalled();
    expect(component.submitted()).toBeTrue();
    expect(document.activeElement?.id).toBe('unit-identifier');
  });

  it('cria com trim, vírgula decimal, zero e omite vazios', () => {
    render();
    component.form = {
      identifier: '  Apto 201  ',
      grouping: ' Torre B ',
      category: 'APARTAMENTO',
      unitTypeId: 'type-1',
      builtArea: '75,5',
      landArea: '',
      parkingSpots: '0',
      status: 'BLOQUEADA',
      notes: '  Revisar documentação  ',
    };

    component.save();

    expect(service.create).toHaveBeenCalledOnceWith({
      developmentId: 'development-1',
      identifier: 'Apto 201',
      grouping: 'Torre B',
      category: 'APARTAMENTO',
      unitTypeId: 'type-1',
      builtArea: 75.5,
      parkingSpots: 0,
      status: 'BLOQUEADA',
      notes: 'Revisar documentação',
    });
  });

  it('edita apenas campos alterados e envia null para limpar', () => {
    render(UNIT);
    component.form.grouping = '';
    component.form.unitTypeId = '';
    component.form.builtArea = '';
    component.form.parkingSpots = '0';
    component.form.notes = '';

    component.save();

    expect(service.update).toHaveBeenCalledOnceWith('unit-1', {
      grouping: null,
      unitTypeId: null,
      builtArea: null,
      parkingSpots: 0,
      notes: null,
    });
  });

  it('fecha edição sem request quando nada mudou', () => {
    render(UNIT);
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);

    component.save();

    expect(service.update).not.toHaveBeenCalled();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('impede envio duplicado durante salvamento', () => {
    const request = new Subject<Unit>();
    service.create.and.returnValue(request);
    render();
    component.form.identifier = '101';

    component.save();
    component.save();

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBeTrue();
  });

  it('exibe a mensagem real de validação da API', () => {
    service.create.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: ['identifier should not be empty'] },
          }),
      ),
    );
    render();
    component.form.identifier = '101';

    component.save();

    expect(component.error()).toContain('identifier should not be empty');
  });

  it('sinaliza registro removido em corrida no update', () => {
    service.update.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render(UNIT);
    const stale = jasmine.createSpy('stale');
    component.stale.subscribe(stale);
    component.form.identifier = 'Apto 101 atualizado';

    component.save();

    expect(stale).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBeFalse();
  });
});
