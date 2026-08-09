import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Development } from '../../core/models/development.model';
import { DevelopmentService } from '../../core/services/development.service';
import { COMPANY_FIXTURES, DEVELOPMENT_FIXTURES } from './development.fixtures';
import { DevelopmentFormModalComponent } from './development-form-modal.component';

class DevelopmentServiceMock {
  readonly create = jasmine
    .createSpy()
    .and.callFake((payload: Partial<Development>) =>
      of({ ...DEVELOPMENT_FIXTURES[0], ...payload }),
    );
  readonly update = jasmine
    .createSpy()
    .and.callFake((_id: string, payload: Partial<Development>) =>
      of({ ...DEVELOPMENT_FIXTURES[0], ...payload }),
    );
}

describe('DevelopmentFormModalComponent', () => {
  let fixture: ComponentFixture<DevelopmentFormModalComponent>;
  let component: DevelopmentFormModalComponent;
  let service: DevelopmentServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevelopmentFormModalComponent],
      providers: [
        { provide: DevelopmentService, useClass: DevelopmentServiceMock },
      ],
    }).compileComponents();
    service = TestBed.inject(
      DevelopmentService,
    ) as unknown as DevelopmentServiceMock;
  });

  function render(development: Development | null = null): void {
    fixture = TestBed.createComponent(DevelopmentFormModalComponent);
    component = fixture.componentInstance;
    component.development = development;
    component.companies = COMPANY_FIXTURES;
    fixture.detectChanges();
  }

  it('cria o modal', () => {
    render();
    expect(component).toBeTruthy();
  });

  it('impede criação sem os campos obrigatórios', () => {
    render();
    component.form.name = '';
    component.save();
    expect(component.submitted()).toBeTrue();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejeita entrega anterior ao lançamento', () => {
    render();
    component.form.name = 'Novo projeto';
    component.form.expectedLaunchDate = '2028-01-01';
    component.form.expectedDeliveryDate = '2027-12-31';
    expect(component.datesInvalid()).toBeTrue();
    component.save();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('cria com payload válido e sem strings opcionais vazias', () => {
    render();
    const saved = jasmine.createSpy();
    component.saved.subscribe(saved);
    component.form.name = 'Novo projeto';
    component.form.type = 'LOTEAMENTO';
    component.form.companyId = 'company-spe';
    component.form.expectedLaunchDate = '2026-09-01';
    component.form.expectedDeliveryDate = '2029-06-01';
    component.save();
    expect(service.create).toHaveBeenCalledWith({
      name: 'Novo projeto',
      type: 'LOTEAMENTO',
      status: 'EM_CAPTACAO',
      companyId: 'company-spe',
      expectedLaunchDate: '2026-09-01',
      expectedDeliveryDate: '2029-06-01',
    });
    expect(saved).toHaveBeenCalled();
  });

  it('preenche e edita sem deslocar as datas por timezone', () => {
    render(DEVELOPMENT_FIXTURES[0]);
    expect(component.form.expectedLaunchDate).toBe('2026-09-01');
    expect(component.form.expectedDeliveryDate).toBe('2028-12-01');
    component.form.name = 'Aurora Editado';
    component.form.companyId = '';
    component.form.description = '';
    component.save();
    expect(service.update).toHaveBeenCalledWith(
      'dev-aurora',
      jasmine.objectContaining({
        name: 'Aurora Editado',
        companyId: null,
        description: null,
        expectedLaunchDate: '2026-09-01',
      }),
    );
  });

  it('envia null ao limpar as datas durante a edição', () => {
    render(DEVELOPMENT_FIXTURES[0]);
    component.form.expectedLaunchDate = '';
    component.form.expectedDeliveryDate = '';

    component.save();

    expect(service.update).toHaveBeenCalledWith(
      'dev-aurora',
      jasmine.objectContaining({
        expectedLaunchDate: null,
        expectedDeliveryDate: null,
      }),
    );
  });
});
