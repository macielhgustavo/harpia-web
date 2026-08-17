import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { DevelopmentDetail } from '../../core/models/development.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CompanyService } from '../../core/services/company.service';
import { CrmService } from '../../core/services/crm.service';
import { DevelopmentService } from '../../core/services/development.service';
import { DocumentService } from '../../core/services/document.service';
import { PriceTableService } from '../../core/services/price-table.service';
import { PersonService } from '../../core/services/person.service';
import { ReservationService } from '../../core/services/reservation.service';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { UnitService } from '../../core/services/unit.service';
import {
  COMPANY_FIXTURES,
  DEVELOPMENT_DETAIL_FIXTURE,
} from './development.fixtures';
import { DevelopmentDetailComponent } from './development-detail.component';

class DevelopmentServiceMock {
  readonly getById = jasmine
    .createSpy()
    .and.returnValue(of(DEVELOPMENT_DETAIL_FIXTURE));
  readonly remove = jasmine
    .createSpy()
    .and.returnValue(of(DEVELOPMENT_DETAIL_FIXTURE));
}

class CompanyServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(COMPANY_FIXTURES));
}

class UnitTypeServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(
    of(
      DEVELOPMENT_DETAIL_FIXTURE.unitTypes.map((unitType) => ({
        ...unitType,
        _count: {
          units: DEVELOPMENT_DETAIL_FIXTURE.units.filter(
            (unit) => unit.unitTypeId === unitType.id,
          ).length,
        },
      })),
    ),
  );
  readonly remove = jasmine.createSpy().and.returnValue(of(undefined));
}

class UnitServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(
    of(
      DEVELOPMENT_DETAIL_FIXTURE.units.map((unit) => ({
        ...unit,
        prices: [],
      })),
    ),
  );
  readonly remove = jasmine.createSpy().and.returnValue(of(undefined));
  readonly update = jasmine.createSpy().and.returnValue(of(undefined));
}

class PriceTableServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(
    of(
      DEVELOPMENT_DETAIL_FIXTURE.priceTables.map((table) => ({
        ...table,
        _count: { unitPrices: 0 },
      })),
    ),
  );
  readonly getById = jasmine.createSpy().and.callFake((id: string) =>
    of({
      ...DEVELOPMENT_DETAIL_FIXTURE.priceTables.find(
        (table) => table.id === id,
      )!,
      unitPrices: [],
    }),
  );
  readonly remove = jasmine.createSpy().and.returnValue(of(undefined));
}

class DocumentServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of([]));
}

class ReservationServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(
    of({
      data: [],
      pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    }),
  );
}

class PersonServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of([]));
}

class CrmServiceMock {
  readonly listOpportunities = jasmine.createSpy().and.returnValue(
    of({
      data: [],
      pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    }),
  );
}

class AuthorizationServiceMock {
  readonly hasPermission = jasmine.createSpy().and.returnValue(true);
}

describe('DevelopmentDetailComponent', () => {
  let fixture: ComponentFixture<DevelopmentDetailComponent>;
  let component: DevelopmentDetailComponent;
  let service: DevelopmentServiceMock;
  let companyService: CompanyServiceMock;
  let router: Router;
  let authorization: AuthorizationServiceMock;
  let documentService: DocumentServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevelopmentDetailComponent],
      providers: [
        { provide: DevelopmentService, useClass: DevelopmentServiceMock },
        { provide: CompanyService, useClass: CompanyServiceMock },
        { provide: UnitTypeService, useClass: UnitTypeServiceMock },
        { provide: UnitService, useClass: UnitServiceMock },
        { provide: PriceTableService, useClass: PriceTableServiceMock },
        { provide: DocumentService, useClass: DocumentServiceMock },
        { provide: ReservationService, useClass: ReservationServiceMock },
        { provide: PersonService, useClass: PersonServiceMock },
        { provide: CrmService, useClass: CrmServiceMock },
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'dev-aurora' } } },
        },
      ],
    }).compileComponents();
    service = TestBed.inject(
      DevelopmentService,
    ) as unknown as DevelopmentServiceMock;
    companyService = TestBed.inject(
      CompanyService,
    ) as unknown as CompanyServiceMock;
    router = TestBed.inject(Router);
    authorization = TestBed.inject(
      AuthorizationService,
    ) as unknown as AuthorizationServiceMock;
    documentService = TestBed.inject(
      DocumentService,
    ) as unknown as DocumentServiceMock;
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  function render(): void {
    fixture = TestBed.createComponent(DevelopmentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('cria e carrega o detalhe com seus resumos', () => {
    render();
    expect(component).toBeTruthy();
    expect(service.getById).toHaveBeenCalledWith('dev-aurora');
    expect(fixture.nativeElement.textContent).toContain('2Q Standard');
    expect(fixture.nativeElement.textContent).toContain('Apto 101');
    expect(fixture.nativeElement.textContent).toContain('Tabela Captação');
    expect(documentService.list).toHaveBeenCalledOnceWith({
      developmentId: 'dev-aurora',
    });
  });

  it('trata empreendimento não encontrado', () => {
    service.getById.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'Not found' },
          }),
      ),
    );
    render();
    expect(component.error()).toBe('Empreendimento não encontrado.');
    expect(fixture.nativeElement.textContent).toContain(
      'Empreendimento não encontrado',
    );
  });

  it('exibe indicação discreta para valores nulos', () => {
    const nullDetail: DevelopmentDetail = {
      ...DEVELOPMENT_DETAIL_FIXTURE,
      description: null,
      address: null,
      city: null,
      companyId: null,
      company: null,
      expectedLaunchDate: null,
    };
    service.getById.and.returnValue(of(nullDetail));
    render();
    expect(fixture.nativeElement.textContent).toContain('Não informado');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('formata datas sem alteração de dia', () => {
    render();
    expect(component.formatDate('2026-09-01T00:00:00.000Z')).toBe('01/09/2026');
    expect(component.formatDate(null)).toBe('Não informado');
  });

  it('traduz os enums reais', () => {
    render();
    expect(component.typeLabel('CONDOMINIO_CASAS')).toBe('Condomínio de casas');
    expect(component.statusLabel('EM_APROVACAO')).toBe('Em aprovação');
  });

  it('exclui e retorna para a listagem', () => {
    render();
    component.confirmDelete();
    expect(service.remove).toHaveBeenCalledWith('dev-aurora');
    expect(router.navigate).toHaveBeenCalledWith(
      ['/developments'],
      jasmine.any(Object),
    );
  });

  it('mantém o detalhe e mostra o erro 409 real', () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: {
        message:
          'Empreendimento possui alocações de investimento e não pode ser removido',
      },
    });
    service.remove.and.returnValue(throwError(() => conflict));
    render();
    component.confirmDelete();
    expect(component.deleteError()).toContain('possui alocações');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('omite o resumo financeiro quando a API não envia allocations', () => {
    const operationalDetail: DevelopmentDetail = {
      ...DEVELOPMENT_DETAIL_FIXTURE,
      _count: { units: DEVELOPMENT_DETAIL_FIXTURE._count.units },
    };
    service.getById.and.returnValue(of(operationalDetail));

    render();

    expect(fixture.nativeElement.textContent).not.toContain('Alocações');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('oculta e bloqueia ações de escrita sem DEVELOPMENTS_WRITE', () => {
    authorization.hasPermission.and.returnValue(false);
    render();

    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.DEVELOPMENTS_WRITE,
    );
    expect(fixture.nativeElement.textContent).not.toContain('Editar');
    expect(fixture.nativeElement.textContent).not.toContain('Excluir');

    component.openEdit();
    component.requestDelete();
    component.confirmDelete();

    expect(component.editOpen()).toBeFalse();
    expect(component.deleteOpen()).toBeFalse();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('recarrega os resumos depois de uma alteração de tipologia', () => {
    render();

    component.onUnitTypesChanged('Tipologia atualizada com sucesso.');

    expect(component.feedback()).toBe('Tipologia atualizada com sucesso.');
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(companyService.list).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBeFalse();
  });

  it('integra a gestão de unidades e atualiza somente o resumo do empreendimento', () => {
    render();

    component.onUnitsChanged('Unidade criada com sucesso.');

    expect(component.feedback()).toBe('Unidade criada com sucesso.');
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(companyService.list).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).not.toContain(
      'gestão completa de unidades será adicionada',
    );
  });

  it('integra tabelas de preço e atualiza somente o resumo do empreendimento', () => {
    render();

    component.onPriceTablesChanged('Preço individual salvo com sucesso.');

    expect(component.feedback()).toBe('Preço individual salvo com sucesso.');
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(companyService.list).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Tabelas de preço');
  });

  it('preserva a página e o sucesso se apenas a atualização dos resumos falhar', () => {
    service.getById.and.returnValues(
      of(DEVELOPMENT_DETAIL_FIXTURE),
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    render();

    component.onUnitTypesChanged('Tipologia criada com sucesso.');

    expect(component.development()?.id).toBe(DEVELOPMENT_DETAIL_FIXTURE.id);
    expect(component.error()).toBe('');
    expect(component.loading()).toBeFalse();
    expect(component.feedback()).toContain('Tipologia criada com sucesso.');
    expect(component.feedback()).toContain('atualizar os resumos');
    expect(companyService.list).toHaveBeenCalledTimes(1);
  });

  it('ignora um resumo antigo que chega depois de uma mutação mais nova', () => {
    render();
    const stale = new Subject<DevelopmentDetail>();
    const fresh = new Subject<DevelopmentDetail>();
    service.getById.and.returnValues(stale, fresh);

    component.onUnitTypesChanged('Primeira alteração.');
    component.onUnitTypesChanged('Segunda alteração.');
    fresh.next({ ...DEVELOPMENT_DETAIL_FIXTURE, name: 'Resumo novo' });
    stale.next({ ...DEVELOPMENT_DETAIL_FIXTURE, name: 'Resumo antigo' });

    expect(component.development()?.name).toBe('Resumo novo');
    expect(component.feedback()).toBe('Segunda alteração.');
  });
});
