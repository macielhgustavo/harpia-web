import {
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { DevelopmentListItem } from '../../core/models/development.model';
import { Person } from '../../core/models/person.model';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { ReportService } from '../../core/services/report.service';
import { ReportsComponent } from './reports.component';

describe('ReportsComponent', () => {
  let fixture: ComponentFixture<ReportsComponent>;
  let component: ReportsComponent;
  let reportService: jasmine.SpyObj<ReportService>;

  const investor: Person = {
    id: 'investor-1',
    organizationId: 'organization-1',
    name: 'Maria Santos',
    personType: 'FISICA',
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const development: DevelopmentListItem = {
    id: 'development-1',
    organizationId: 'organization-1',
    name: 'Residencial Aurora',
    description: null,
    type: 'PREDIO',
    companyId: null,
    company: null,
    address: null,
    city: null,
    status: 'EM_CAPTACAO',
    expectedLaunchDate: null,
    expectedDeliveryDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _count: { units: 6 },
  };

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', [
      'generate',
    ]);
    reportService.generate.and.returnValue(
      of(
        new HttpResponse({
          body: new Blob(['report'], { type: 'application/pdf' }),
          headers: new HttpHeaders({
            'Content-Disposition': 'attachment; filename="relatorio.pdf"',
          }),
        }),
      ),
    );
    const personService = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    personService.list.and.returnValue(of([investor]));
    const developmentService = jasmine.createSpyObj<DevelopmentService>(
      'DevelopmentService',
      ['list'],
    );
    developmentService.list.and.returnValue(of([development]));

    TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        { provide: ReportService, useValue: reportService },
        { provide: PersonService, useValue: personService },
        { provide: DevelopmentService, useValue: developmentService },
      ],
    });
    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega opções reais e apresenta os quatro relatórios', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Maria Santos');
    expect(text).toContain('Residencial Aurora');
    expect(text).toContain('Captação');
    expect(text).toContain('Retornos em atraso');
    expect(text).toContain('Posição por investidor');
  });

  it('bloqueia período invertido antes da API', () => {
    component.startDate = '2026-08-20';
    component.endDate = '2026-08-10';
    component.generate('returns', 'pdf');
    fixture.detectChanges();

    expect(reportService.generate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'A data inicial deve ser anterior ou igual à data final.',
    );
  });

  it('gera Blob autenticado com filtros e preserva o nome da resposta', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:report');
    spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    component.investorId = investor.id;
    component.developmentId = development.id;
    component.status = 'ATRASADO';

    component.generate('returns', 'pdf');
    fixture.detectChanges();

    expect(reportService.generate).toHaveBeenCalledOnceWith(
      'returns',
      'pdf',
      jasmine.objectContaining({
        investorId: investor.id,
        developmentId: development.id,
        status: 'ATRASADO',
      }),
    );
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
    expect(fixture.nativeElement.textContent).toContain(
      'Retornos gerado em PDF.',
    );
  });

  it('mantém estado de geração e impede chamada duplicada', () => {
    const response = new Subject<HttpResponse<Blob>>();
    reportService.generate.and.returnValue(response);

    component.generate('captations', 'xlsx');
    component.generate('captations', 'xlsx');
    fixture.detectChanges();

    expect(reportService.generate).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Gerando relatório...');
  });

  it('mostra o erro autoritativo do backend', () => {
    reportService.generate.and.returnValue(
      throwError(() => ({ error: { message: 'Refine os filtros.' } })),
    );

    component.generate('investor-positions', 'xlsx');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Refine os filtros.');
  });

  it('lê mensagem JSON quando o erro chega como Blob', async () => {
    const errorBlob = new Blob([], { type: 'application/json' });
    spyOn(errorBlob, 'text').and.resolveTo(
      JSON.stringify({ message: 'Período acima do permitido.' }),
    );
    reportService.generate.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: errorBlob,
          }),
      ),
    );

    component.generate('captations', 'pdf');
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Período acima do permitido.',
    );
  });
});
