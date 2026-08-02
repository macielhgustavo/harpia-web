import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DevelopmentDetail } from '../../core/models/development.model';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { COMPANY_FIXTURES, DEVELOPMENT_DETAIL_FIXTURE } from './development.fixtures';
import { DevelopmentDetailComponent } from './development-detail.component';

class DevelopmentServiceMock {
  readonly getById = jasmine.createSpy().and.returnValue(of(DEVELOPMENT_DETAIL_FIXTURE));
  readonly remove = jasmine.createSpy().and.returnValue(of(DEVELOPMENT_DETAIL_FIXTURE));
}

class CompanyServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(COMPANY_FIXTURES));
}

describe('DevelopmentDetailComponent', () => {
  let fixture: ComponentFixture<DevelopmentDetailComponent>;
  let component: DevelopmentDetailComponent;
  let service: DevelopmentServiceMock;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevelopmentDetailComponent],
      providers: [
        { provide: DevelopmentService, useClass: DevelopmentServiceMock },
        { provide: CompanyService, useClass: CompanyServiceMock },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'dev-aurora' } } } },
      ],
    }).compileComponents();
    service = TestBed.inject(DevelopmentService) as unknown as DevelopmentServiceMock;
    router = TestBed.inject(Router);
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
  });

  it('trata empreendimento não encontrado', () => {
    service.getById.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Not found' } })),
    );
    render();
    expect(component.error()).toBe('Empreendimento não encontrado.');
    expect(fixture.nativeElement.textContent).toContain('Empreendimento não encontrado');
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
    expect(router.navigate).toHaveBeenCalledWith(['/developments'], jasmine.any(Object));
  });

  it('mantém o detalhe e mostra o erro 409 real', () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: { message: 'Empreendimento possui alocações de investimento e não pode ser removido' },
    });
    service.remove.and.returnValue(throwError(() => conflict));
    render();
    component.confirmDelete();
    expect(component.deleteError()).toContain('possui alocações');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
