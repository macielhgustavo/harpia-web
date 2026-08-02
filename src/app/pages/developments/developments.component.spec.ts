import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { CompanyListItem } from '../../core/models/company.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { COMPANY_FIXTURES, DEVELOPMENT_FIXTURES } from './development.fixtures';
import { DevelopmentsComponent } from './developments.component';

class DevelopmentServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(DEVELOPMENT_FIXTURES));
  readonly remove = jasmine.createSpy().and.returnValue(of(DEVELOPMENT_FIXTURES[0]));
}

class CompanyServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(COMPANY_FIXTURES));
}

describe('DevelopmentsComponent', () => {
  let fixture: ComponentFixture<DevelopmentsComponent>;
  let component: DevelopmentsComponent;
  let developmentService: DevelopmentServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevelopmentsComponent],
      providers: [
        { provide: DevelopmentService, useClass: DevelopmentServiceMock },
        { provide: CompanyService, useClass: CompanyServiceMock },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
      ],
    }).compileComponents();
    developmentService = TestBed.inject(DevelopmentService) as unknown as DevelopmentServiceMock;
  });

  function render(): void {
    fixture = TestBed.createComponent(DevelopmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('cria o componente e carrega a listagem', () => {
    render();
    expect(component).toBeTruthy();
    expect(developmentService.list).toHaveBeenCalled();
    expect(component.developments().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Residencial Aurora');
  });

  it('exibe o estado de loading enquanto as requisições estão pendentes', () => {
    const developments$ = new Subject<DevelopmentListItem[]>();
    const companies$ = new Subject<CompanyListItem[]>();
    developmentService.list.and.returnValue(developments$);
    (TestBed.inject(CompanyService) as unknown as CompanyServiceMock).list.and.returnValue(companies$);
    render();
    expect(fixture.nativeElement.textContent).toContain('Carregando empreendimentos');
  });

  it('exibe estado vazio', () => {
    developmentService.list.and.returnValue(of([]));
    render();
    expect(fixture.nativeElement.textContent).toContain('Nenhum empreendimento cadastrado');
  });

  it('busca localmente por nome', () => {
    render();
    component.search.set('Aurora');
    expect(component.filteredDevelopments().map((item) => item.id)).toEqual(['dev-aurora']);
  });

  it('filtra por status', () => {
    render();
    component.statusFilter.set('EM_OBRA');
    expect(component.filteredDevelopments().map((item) => item.id)).toEqual(['dev-horizonte']);
  });

  it('filtra por tipo', () => {
    render();
    component.typeFilter.set('COMERCIAL');
    expect(component.filteredDevelopments().map((item) => item.id)).toEqual(['dev-horizonte']);
  });

  it('filtra por empresa', () => {
    render();
    component.companyFilter.set('company-spe');
    expect(component.filteredDevelopments().map((item) => item.id)).toEqual(['dev-aurora']);
  });

  it('remove um empreendimento e recarrega a listagem', () => {
    render();
    component.requestDelete(DEVELOPMENT_FIXTURES[1]);
    component.confirmDelete();
    expect(developmentService.remove).toHaveBeenCalledWith('dev-horizonte');
    expect(component.feedback()).toContain('removido com sucesso');
    expect(developmentService.list).toHaveBeenCalledTimes(2);
  });

  it('mantém o item e mostra a mensagem real no erro 409', () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: { message: 'Empreendimento possui alocações de investimento e não pode ser removido' },
    });
    developmentService.remove.and.returnValue(throwError(() => conflict));
    render();
    component.requestDelete(DEVELOPMENT_FIXTURES[0]);
    component.confirmDelete();
    expect(component.deleteTarget()?.id).toBe('dev-aurora');
    expect(component.actionError()).toContain('possui alocações');
  });

  it('reabre o formulário com o empreendimento selecionado para edição', () => {
    render();
    component.openEdit(DEVELOPMENT_FIXTURES[0]);
    expect(component.formOpen()).toBeTrue();
    expect(component.editingDevelopment()?.id).toBe('dev-aurora');
  });
});
