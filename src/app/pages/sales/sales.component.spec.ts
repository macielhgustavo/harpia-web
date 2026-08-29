import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { SaleService } from '../../core/services/sale.service';
import { SalesComponent } from './sales.component';

describe('SalesComponent', () => {
  let fixture: ComponentFixture<SalesComponent>;
  let component: SalesComponent;
  let sales: jasmine.SpyObj<SaleService>;

  const page = {
    data: [
      {
        id: 'sale-1',
        saleNumber: 'VEN-2026-0001',
        status: 'ATIVA',
        saleDate: '2026-08-25T00:00:00.000Z',
        netAmount: '490000.00',
        outstandingBalance: '490000.00',
        development: { id: 'development-1', name: 'Jardins' },
        unit: { id: 'unit-1', identifier: '101', grouping: 'Torre A' },
        buyers: [
          {
            id: 'buyer-1',
            isPrimary: true,
            person: { id: 'person-1', name: 'Ana Cliente' },
          },
        ],
      },
    ],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  } as ReturnType<SaleService['list']> extends import('rxjs').Observable<
    infer T
  >
    ? T
    : never;

  beforeEach(async () => {
    sales = jasmine.createSpyObj<SaleService>('SaleService', ['list']);
    sales.list.and.returnValue(of(page));
    const developments = jasmine.createSpyObj<DevelopmentService>(
      'DevelopmentService',
      ['list'],
    );
    developments.list.and.returnValue(of([]));
    const people = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    people.list.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SalesComponent],
      providers: [
        { provide: SaleService, useValue: sales },
        { provide: DevelopmentService, useValue: developments },
        { provide: PersonService, useValue: people },
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the first server-side page and renders its commercial summary', () => {
    expect(sales.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, pageSize: 20 }),
    );
    expect(fixture.nativeElement.textContent).toContain('VEN-2026-0001');
    expect(fixture.nativeElement.textContent).toContain('Ana Cliente');
    expect(fixture.nativeElement.textContent).toContain('Jardins');
  });

  it('sends every selected filter and resets pagination to page one', () => {
    component.developmentId.set('development-1');
    component.status.set('ATIVA');
    component.buyerId.set('person-1');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-31');
    component.applyFilters();

    expect(sales.list.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        developmentId: 'development-1',
        status: 'ATIVA',
        buyerId: 'person-1',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        page: 1,
      }),
    );
  });

  it('blocks an inverted date range without calling the API', () => {
    sales.list.calls.reset();
    component.startDate.set('2026-09-01');
    component.endDate.set('2026-08-31');
    component.applyFilters();

    expect(sales.list).not.toHaveBeenCalled();
    expect(component.error()).toContain('data inicial');
  });
});
