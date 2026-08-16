import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardOverview } from '../models/dashboard.model';
import { ApiService } from './api.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({} as DashboardOverview));
    TestBed.configureTestingModule({
      providers: [DashboardService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(DashboardService);
  });

  it('consulta apenas o resumo autorizado da organização atual', () => {
    service.getOverview().subscribe();

    expect(api.get).toHaveBeenCalledOnceWith('/dashboard');
  });
});
