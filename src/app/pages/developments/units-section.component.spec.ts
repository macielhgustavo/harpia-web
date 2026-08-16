import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { Unit, UnitListItem } from '../../core/models/unit.model';
import { UnitType } from '../../core/models/unit-type.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DocumentService } from '../../core/services/document.service';
import { UnitService } from '../../core/services/unit.service';
import { UnitsSectionComponent } from './units-section.component';

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
  {
    id: 'type-2',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Casa térrea',
    bedrooms: 3,
    suites: 1,
    standardArea: 100,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
  },
];

const UNITS: UnitListItem[] = [
  {
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
    notes: null,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
    unitType: { id: 'type-1', name: 'Dois quartos' },
    prices: [
      {
        id: 'price-1',
        organizationId: 'organization-1',
        unitId: 'unit-1',
        priceTableId: 'table-1',
        value: 420000,
        createdAt: '2026-08-16T12:00:00.000Z',
        updatedAt: '2026-08-16T12:00:00.000Z',
        priceTable: { id: 'table-1', name: 'Tabela vigente' },
      },
    ],
  },
  {
    id: 'unit-2',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    identifier: 'Casa 05',
    unitTypeId: 'type-2',
    category: 'CASA',
    grouping: 'Vila Sul',
    landArea: 180,
    builtArea: 100,
    parkingSpots: 2,
    status: 'RESERVADA',
    notes: 'Esquina',
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
    unitType: { id: 'type-2', name: 'Casa térrea' },
    prices: [],
  },
  {
    id: 'unit-3',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    identifier: 'Loja 01',
    unitTypeId: null,
    category: 'SALA_COMERCIAL',
    grouping: null,
    landArea: null,
    builtArea: null,
    parkingSpots: null,
    status: 'VENDIDA',
    notes: null,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
    unitType: null,
    prices: [],
  },
];

class UnitServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(UNITS));
  readonly create = jasmine.createSpy().and.returnValue(of(UNITS[0]));
  readonly update = jasmine.createSpy().and.returnValue(of(UNITS[0]));
  readonly remove = jasmine.createSpy().and.returnValue(of(UNITS[0]));
}

class AuthorizationServiceMock {
  readonly hasPermission = jasmine.createSpy().and.returnValue(true);
}

class DocumentServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of([]));
}

describe('UnitsSectionComponent', () => {
  let fixture: ComponentFixture<UnitsSectionComponent>;
  let component: UnitsSectionComponent;
  let service: UnitServiceMock;
  let authorization: AuthorizationServiceMock;
  let documentService: DocumentServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitsSectionComponent],
      providers: [
        { provide: UnitService, useClass: UnitServiceMock },
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
        { provide: DocumentService, useClass: DocumentServiceMock },
      ],
    }).compileComponents();
    service = TestBed.inject(UnitService) as unknown as UnitServiceMock;
    authorization = TestBed.inject(
      AuthorizationService,
    ) as unknown as AuthorizationServiceMock;
    documentService = TestBed.inject(
      DocumentService,
    ) as unknown as DocumentServiceMock;
  });

  function render(): void {
    fixture = TestBed.createComponent(UnitsSectionComponent);
    component = fixture.componentInstance;
    component.developmentId = 'development-1';
    component.unitTypes = UNIT_TYPES;
    fixture.detectChanges();
  }

  it('carrega a lista real, indicadores e labels dos enums', () => {
    render();

    expect(service.list).toHaveBeenCalledOnceWith({
      developmentId: 'development-1',
    });
    expect(component.stats()).toEqual({
      total: 3,
      available: 1,
      reserved: 1,
      sold: 1,
    });
    expect(fixture.nativeElement.textContent).toContain('Apto 101');
    expect(fixture.nativeElement.textContent).toContain('Sala comercial');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('abre os documentos usando apenas o vínculo da unidade', () => {
    render();
    component.openDocuments(UNITS[0]);
    fixture.detectChanges();
    expect(component.documentsTarget()).toBe(UNITS[0]);
    expect(documentService.list).toHaveBeenCalledOnceWith({
      unitId: UNITS[0].id,
    });
    component.closeDocuments();
    expect(component.documentsTarget()).toBeNull();
  });

  it('exibe erro e permite retry', () => {
    service.list.and.returnValues(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { message: 'Falha ao consultar unidades' },
          }),
      ),
      of(UNITS),
    );
    render();

    expect(component.error()).toBe('Falha ao consultar unidades');
    component.reload();
    expect(component.units().length).toBe(3);
    expect(component.error()).toBe('');
  });

  it('mostra estado vazio com ação de criação', () => {
    service.list.and.returnValue(of([]));
    render();

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma unidade cadastrada',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Cadastrar a primeira unidade',
    );
  });

  it('combina busca e todos os filtros sem nova chamada HTTP', () => {
    render();
    component.search.set('esquina');
    component.statusFilter.set('RESERVADA');
    component.categoryFilter.set('CASA');
    component.unitTypeFilter.set('type-2');
    component.groupingFilter.set('Vila Sul');

    expect(component.filteredUnits().map((unit) => unit.id)).toEqual([
      'unit-2',
    ]);
    expect(service.list).toHaveBeenCalledTimes(1);

    component.resetFilters();
    expect(component.filteredUnits().length).toBe(3);
  });

  it('filtra explicitamente unidades sem tipologia', () => {
    render();
    component.unitTypeFilter.set('none');

    expect(component.filteredUnits().map((unit) => unit.id)).toEqual([
      'unit-3',
    ]);
  });

  it('oculta e bloqueia mutações sem UNITS_WRITE', () => {
    authorization.hasPermission.and.returnValue(false);
    render();

    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.UNITS_WRITE,
    );
    expect(fixture.nativeElement.textContent).not.toContain('Nova unidade');

    component.openCreate();
    component.openEdit(UNITS[0]);
    component.openStatus(UNITS[0]);
    component.requestDelete(UNITS[0]);
    component.confirmDelete();

    expect(component.formOpen()).toBeFalse();
    expect(component.statusTarget()).toBeNull();
    expect(component.deleteTarget()).toBeNull();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('abre criação e edição e recarrega após salvar', () => {
    render();
    const changed = jasmine.createSpy('changed');
    component.changed.subscribe(changed);

    component.openCreate();
    expect(component.formOpen()).toBeTrue();
    expect(component.editing()).toBeNull();
    component.closeForm();
    component.openEdit(UNITS[0]);
    component.onSaved(UNITS[0]);

    expect(component.formOpen()).toBeFalse();
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith(
      'Unidade “Apto 101” atualizada com sucesso.',
    );
  });

  it('altera status com payload mínimo e impede duplo clique', () => {
    const request = new Subject<Unit>();
    service.update.and.returnValue(request);
    render();
    component.openStatus(UNITS[0]);
    component.selectedStatus.set('BLOQUEADA');

    component.saveStatus();
    component.saveStatus();

    expect(service.update).toHaveBeenCalledOnceWith('unit-1', {
      status: 'BLOQUEADA',
    });
    expect(component.statusSaving()).toBeTrue();
    request.next({ ...UNITS[0], status: 'BLOQUEADA' });
    request.complete();
    expect(component.feedback()).toContain('Bloqueada');
  });

  it('não envia alteração de status sem mudança', () => {
    render();
    component.openStatus(UNITS[0]);
    component.saveStatus();

    expect(service.update).not.toHaveBeenCalled();
    expect(component.statusTarget()).toBeNull();
  });

  it('informa impacto e exclui com limpeza da lista', () => {
    render();
    const changed = jasmine.createSpy('changed');
    component.changed.subscribe(changed);
    expect(component.priceImpactMessage(UNITS[0])).toContain(
      '1 preço será removido',
    );

    component.requestDelete(UNITS[0]);
    component.confirmDelete();

    expect(service.remove).toHaveBeenCalledOnceWith('unit-1');
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith(
      'Unidade “Apto 101” removida com sucesso.',
    );
  });

  it('reconcilia 404 concorrente ao alterar ou excluir', () => {
    service.remove.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render();
    component.requestDelete(UNITS[0]);

    component.confirmDelete();

    expect(component.deleteTarget()).toBeNull();
    expect(component.feedback()).toBe('A unidade não existe mais.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('preserva mensagem 409 real ao excluir', () => {
    service.remove.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Unidade possui vínculo impeditivo' },
          }),
      ),
    );
    render();
    component.requestDelete(UNITS[0]);

    component.confirmDelete();

    expect(component.deleteError()).toBe('Unidade possui vínculo impeditivo');
    expect(component.deleteTarget()?.id).toBe('unit-1');
  });

  it('ignora resposta de lista antiga após reload mais novo', () => {
    const stale = new Subject<UnitListItem[]>();
    const fresh = new Subject<UnitListItem[]>();
    service.list.and.returnValues(stale, fresh);
    render();

    component.reload();
    fresh.next([UNITS[1]]);
    stale.next([UNITS[0]]);

    expect(component.units().map((unit) => unit.id)).toEqual(['unit-2']);
  });
});
