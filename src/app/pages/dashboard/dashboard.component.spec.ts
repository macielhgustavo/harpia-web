import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { DashboardOverview } from '../../core/models/dashboard.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let service: jasmine.SpyObj<DashboardService>;

  const overview: DashboardOverview = {
    totalCaptado: 680000,
    totalAlocado: 600000,
    totalCaixaGeral: 80000,
    totalInvestidores: 2,
    retornosPendentes: { count: 1, valor: 25000 },
    retornosAtrasados: { count: 2, valor: 40000 },
    retornosPagos: { count: 3, valor: 60000 },
    totalEmpreendimentos: 2,
    empreendimentosPorStatus: { EM_CAPTACAO: 1, EM_OBRA: 1 },
    totalUnidades: 6,
    unidadesPorStatus: { DISPONIVEL: 4, RESERVADA: 1, VENDIDA: 1 },
    valorEmVendas: 720000,
    captacaoPorEmpreendimento: [
      {
        developmentId: 'development-1',
        nome: 'Residencial Aurora',
        totalCaptado: 500000,
      },
    ],
    ultimasInteracoes: [
      {
        id: 'interaction-1',
        organizationId: 'organization-1',
        personId: 'person-1',
        person: { id: 'person-1', name: 'Carlos Braga' },
        date: '2026-08-16T00:00:00.000Z',
        type: 'LIGACAO',
        summary: 'Revisar proposta',
        nextStep: 'Enviar simulação',
        createdAt: '2026-08-16T00:00:00.000Z',
        updatedAt: '2026-08-16T00:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'getOverview',
    ]);
    service.getOverview.and.returnValue(of(overview));
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('carrega o endpoint único e mostra os indicadores relevantes', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(service.getOverview).toHaveBeenCalledTimes(1);
    expect(text).toContain('R$ 680.000,00');
    expect(text).toContain('2 retorno(s) em atraso');
    expect(text).toContain('Residencial Aurora');
    expect(text).toContain('Carlos Braga');
    expect(text).toContain('Enviar simulação');
  });

  it('mostra estado saudável quando não há retorno atrasado', () => {
    service.getOverview.and.returnValue(
      of({ ...overview, retornosAtrasados: { count: 0, valor: 0 } }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum retorno pendente está vencido.',
    );
  });

  it('permite tentar novamente após falha', () => {
    service.getOverview.and.returnValue(throwError(() => new Error('offline')));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar o dashboard.',
    );

    service.getOverview.and.returnValue(of(overview));
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Total captado');
  });

  it('ignora resposta antiga depois de uma atualização mais recente', () => {
    const first = new Subject<DashboardOverview>();
    const second = new Subject<DashboardOverview>();
    service.getOverview.and.returnValues(first, second);
    fixture.detectChanges();
    component.load();
    second.next(overview);
    first.next({ ...overview, totalCaptado: 1 });

    expect(component.overview()?.totalCaptado).toBe(680000);
  });
});
