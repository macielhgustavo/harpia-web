import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { APP_PERMISSIONS, AppPermission } from '../../core/config/rbac.config';
import { UnitTypeListItem } from '../../core/models/unit-type.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { UnitTypesSectionComponent } from './unit-types-section.component';

const UNIT_TYPES: UnitTypeListItem[] = [
  {
    id: 'unit-type-1',
    organizationId: 'organization-a',
    developmentId: 'development-1',
    name: 'Apartamento 2 quartos',
    bedrooms: 2,
    suites: 1,
    standardArea: 64.5,
    createdAt: '2026-08-09T12:00:00.000Z',
    updatedAt: '2026-08-09T12:00:00.000Z',
    _count: { units: 3 },
  },
];

class UnitTypeServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(UNIT_TYPES));
  readonly remove = jasmine.createSpy().and.returnValue(of(undefined));
}

class AuthorizationServiceMock {
  canWrite = true;

  hasPermission(permission: AppPermission): boolean {
    return permission === APP_PERMISSIONS.UNITS_WRITE && this.canWrite;
  }
}

describe('UnitTypesSectionComponent', () => {
  let fixture: ComponentFixture<UnitTypesSectionComponent>;
  let component: UnitTypesSectionComponent;
  let service: UnitTypeServiceMock;

  async function create(canWrite = true): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [UnitTypesSectionComponent],
      providers: [
        { provide: UnitTypeService, useClass: UnitTypeServiceMock },
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
      ],
    }).compileComponents();

    const authorization = TestBed.inject(
      AuthorizationService,
    ) as unknown as AuthorizationServiceMock;
    authorization.canWrite = canWrite;
    service = TestBed.inject(UnitTypeService) as unknown as UnitTypeServiceMock;
    fixture = TestBed.createComponent(UnitTypesSectionComponent);
    component = fixture.componentInstance;
    component.developmentId = 'development-1';
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('lista tipologias com a contagem autoritativa de unidades', async () => {
    await create();

    expect(service.list).toHaveBeenCalledWith('development-1');
    expect(fixture.nativeElement.textContent).toContain(
      'Apartamento 2 quartos',
    );
    expect(fixture.nativeElement.textContent).toContain('3 unidades');
    expect(fixture.nativeElement.textContent).toContain('64,5 m²');
  });

  it('oculta todas as ações para quem tem apenas leitura', async () => {
    await create(false);

    expect(component.canWrite).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Nova tipologia');
    expect(
      fixture.nativeElement.querySelector('[aria-label^="Editar tipologia"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label^="Remover tipologia"]'),
    ).toBeNull();
  });

  it('explica que as unidades ficam cadastradas e sem tipologia', async () => {
    await create();

    component.requestDelete(UNIT_TYPES[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      '3 unidades permanecerão cadastradas e ficarão sem tipologia.',
    );
  });

  it('remove sem duplicar requisições, recarrega, notifica e leva o foco ao título', async () => {
    await create();
    const changed = jasmine.createSpy();
    const focus = spyOn(HTMLElement.prototype, 'focus').and.callThrough();
    component.changed.subscribe(changed);
    component.requestDelete(UNIT_TYPES[0]);

    component.confirmDelete();
    component.confirmDelete();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));

    expect(service.remove).toHaveBeenCalledOnceWith('unit-type-1');
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith(
      'Tipologia “Apartamento 2 quartos” removida com sucesso.',
    );
    const heading = fixture.nativeElement.querySelector('h2') as HTMLElement;
    expect(
      focus.calls.all().some((call) => call.object === heading),
    ).toBeTrue();
    expect(document.activeElement).toBe(heading);
  });

  it('reconcilia a lista e o detalhe após um 404 de corrida', async () => {
    await create();
    const changed = jasmine.createSpy();
    component.changed.subscribe(changed);
    service.remove.and.returnValue(
      throwError(() => ({ status: 404, error: { message: 'missing' } })),
    );
    service.list.and.returnValue(of([]));
    component.requestDelete(UNIT_TYPES[0]);

    component.confirmDelete();
    fixture.detectChanges();

    expect(component.deleteTarget()).toBeNull();
    expect(component.feedback()).toContain('não existe mais');
    expect(component.unitTypes()).toEqual([]);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith('A tipologia não existe mais.');
  });

  it('mostra estado vazio diferente para escrita', async () => {
    await create();
    service.list.and.returnValue(of([]));

    component.reload();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Cadastrar a primeira tipologia',
    );
  });

  it('mostra erro de listagem e permite tentar novamente', async () => {
    await create();
    service.list.and.returnValue(
      throwError(() => ({ status: 403, error: { message: 'Sem permissão' } })),
    );

    component.reload();
    fixture.detectChanges();

    expect(component.error()).toBe('Sem permissão');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });

  it('distingue nenhuma, uma e várias unidades no aviso', async () => {
    await create();

    expect(
      component.affectedUnitsMessage({
        ...UNIT_TYPES[0],
        _count: { units: 0 },
      }),
    ).toBe('Nenhuma unidade será afetada.');
    expect(
      component.affectedUnitsMessage({
        ...UNIT_TYPES[0],
        _count: { units: 1 },
      }),
    ).toBe('1 unidade permanecerá cadastrada e ficará sem tipologia.');
    expect(component.affectedUnitsMessage(UNIT_TYPES[0])).toContain(
      '3 unidades permanecerão',
    );
  });

  it('fecha uma edição obsoleta e atualiza a lista', async () => {
    await create();
    const changed = jasmine.createSpy();
    component.changed.subscribe(changed);
    component.openEdit(UNIT_TYPES[0]);

    component.onStaleUnitType();

    expect(component.formOpen()).toBeFalse();
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith('A tipologia não existe mais.');
  });

  it('mantém mensagem verdadeira e restaura o foco se a reconciliação falhar', async () => {
    await create();
    service.list.and.returnValue(
      throwError(() => ({
        status: 500,
        error: { message: 'Falha ao listar' },
      })),
    );
    component.openEdit(UNIT_TYPES[0]);

    component.onStaleUnitType();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));

    expect(component.feedback()).toBe('A tipologia não existe mais.');
    expect(component.feedback()).not.toContain('lista foi atualizada');
    expect(component.error()).toBe('Falha ao listar');
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('h2'),
    );
  });
});
