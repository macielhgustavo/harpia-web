import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PriceTable } from '../../core/models/price-table.model';
import { PriceTableService } from '../../core/services/price-table.service';
import { PriceTableFormModalComponent } from './price-table-form-modal.component';

class PriceTableServiceMock {
  readonly create = jasmine.createSpy();
  readonly update = jasmine.createSpy();
}

describe('PriceTableFormModalComponent', () => {
  let fixture: ComponentFixture<PriceTableFormModalComponent>;
  let component: PriceTableFormModalComponent;
  let service: PriceTableServiceMock;

  const table: PriceTable = {
    id: 'table-1',
    organizationId: 'organization-1',
    developmentId: 'development-1',
    name: 'Tabela vigente',
    phase: 'LANÇAMENTO',
    active: true,
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceTableFormModalComponent],
      providers: [
        { provide: PriceTableService, useClass: PriceTableServiceMock },
      ],
    }).compileComponents();
    service = TestBed.inject(
      PriceTableService,
    ) as unknown as PriceTableServiceMock;
    service.create.and.returnValue(of(table));
    service.update.and.returnValue(of(table));
  });

  function render(editing = false): void {
    fixture = TestBed.createComponent(PriceTableFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('developmentId', 'development-1');
    if (editing) fixture.componentRef.setInput('priceTable', table);
    fixture.detectChanges();
  }

  it('cria com texto normalizado e estado explícito', () => {
    render();
    component.form = {
      name: ' Tabela nova ',
      phase: ' Captação ',
      active: false,
    };
    component.save();

    expect(service.create).toHaveBeenCalledOnceWith({
      developmentId: 'development-1',
      name: 'Tabela nova',
      phase: 'Captação',
      active: false,
    });
  });

  it('envia somente os campos realmente alterados no PATCH', () => {
    render(true);
    component.form.active = false;
    component.save();

    expect(service.update).toHaveBeenCalledOnceWith('table-1', {
      active: false,
    });
  });

  it('não gera PATCH nem audit vazio quando nada mudou', () => {
    render(true);
    const saved = jasmine.createSpy();
    component.saved.subscribe(saved);
    component.save();

    expect(service.update).not.toHaveBeenCalled();
    expect(saved).toHaveBeenCalledWith(table);
  });

  it('rejeita campos vazios antes da API e anuncia os erros', () => {
    render();
    component.form.name = ' ';
    component.form.phase = '';
    component.save();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Informe o nome');
    expect(fixture.nativeElement.textContent).toContain(
      'Informe a fase comercial',
    );
  });

  it('propaga 404 como reconciliação de estado obsoleto', () => {
    service.update.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render(true);
    const stale = jasmine.createSpy();
    component.stale.subscribe(stale);
    component.form.phase = 'PÓS-LANÇAMENTO';
    component.save();

    expect(stale).toHaveBeenCalled();
  });
});
