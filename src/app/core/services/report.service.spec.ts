import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getBlob']);
    api.getBlob.and.returnValue(of(new HttpResponse({ body: new Blob() })));
    TestBed.configureTestingModule({
      providers: [ReportService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ReportService);
  });

  it('gera captação com período e referências sem enviar tenant', () => {
    service
      .generate('captations', 'xlsx', {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        investorId: ' investor-1 ',
        developmentId: 'development-1',
        status: 'PAGO',
      })
      .subscribe();

    const [path, params] = api.getBlob.calls.mostRecent().args;
    expect(path).toBe('/reports/captations');
    expect(params?.get('format')).toBe('xlsx');
    expect(params?.get('startDate')).toBe('2026-01-01');
    expect(params?.get('endDate')).toBe('2026-12-31');
    expect(params?.get('investorId')).toBe('investor-1');
    expect(params?.get('developmentId')).toBe('development-1');
    expect(params?.has('status')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('envia status somente no relatório de retornos', () => {
    service.generate('returns', 'pdf', { status: 'ATRASADO' }).subscribe();
    expect(api.getBlob.calls.mostRecent().args[1]?.toString()).toBe(
      'format=pdf&status=ATRASADO',
    );
  });

  it('envia data de referência somente para retornos em atraso', () => {
    service
      .generate('overdue-returns', 'pdf', {
        asOfDate: '2026-08-16',
        startDate: '2026-01-01',
      })
      .subscribe();
    const params = api.getBlob.calls.mostRecent().args[1];
    expect(params?.get('asOfDate')).toBe('2026-08-16');
    expect(params?.has('startDate')).toBeFalse();
  });

  it('limita posição de investidores às referências compatíveis', () => {
    service
      .generate('investor-positions', 'xlsx', {
        investorId: 'investor-1',
        developmentId: 'development-1',
        endDate: '2026-12-31',
      })
      .subscribe();
    expect(api.getBlob.calls.mostRecent().args[1]?.toString()).toBe(
      'format=xlsx&developmentId=development-1&investorId=investor-1',
    );
  });
});
