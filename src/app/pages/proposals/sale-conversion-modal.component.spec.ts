import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Person } from '../../core/models/person.model';
import { SalesProposal } from '../../core/models/proposal.model';
import { SaleDetail } from '../../core/models/sale.model';
import { PersonService } from '../../core/services/person.service';
import { SaleService } from '../../core/services/sale.service';
import { SaleConversionModalComponent } from './sale-conversion-modal.component';

describe('SaleConversionModalComponent', () => {
  let fixture: ComponentFixture<SaleConversionModalComponent>;
  let component: SaleConversionModalComponent;
  let sales: jasmine.SpyObj<SaleService>;

  const people = [
    { id: 'person-1', name: 'Ana Cliente' },
    { id: 'person-2', name: 'Bruno Cliente' },
  ] as Person[];
  const proposal = {
    id: 'proposal-1',
    personId: 'person-1',
    status: 'ACEITA',
    person: { id: 'person-1', name: 'Ana Cliente' },
    unit: { id: 'unit-1', identifier: '101' },
    currentVersion: { finalPrice: '490000.00' },
    sale: null,
  } as unknown as SalesProposal;
  const sale = { id: 'sale-1' } as SaleDetail;

  beforeEach(async () => {
    const personService = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    personService.list.and.returnValue(of(people));
    sales = jasmine.createSpyObj<SaleService>('SaleService', [
      'convertProposal',
    ]);
    sales.convertProposal.and.returnValue(of(sale));

    await TestBed.configureTestingModule({
      imports: [SaleConversionModalComponent],
      providers: [
        { provide: PersonService, useValue: personService },
        { provide: SaleService, useValue: sales },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SaleConversionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('proposal', proposal);
    fixture.detectChanges();
  });

  it('loads buyers and keeps the proposal client as primary', () => {
    expect(component.people()).toEqual(people);
    expect(fixture.nativeElement.textContent).toContain('Ana Cliente');
    expect(fixture.nativeElement.textContent).toContain('Comprador principal');
  });

  it('submits multiple buyers whose participations total 100', () => {
    component.useParticipation = true;
    component.buyerRows = [{ personId: 'person-2', participation: '40,00' }];
    component.save();

    expect(sales.convertProposal).toHaveBeenCalledOnceWith(
      'proposal-1',
      jasmine.objectContaining({
        buyers: [
          {
            personId: 'person-1',
            isPrimary: true,
            participationPercentage: '60.00',
          },
          {
            personId: 'person-2',
            isPrimary: false,
            participationPercentage: '40.00',
          },
        ],
      }),
    );
  });

  it('blocks duplicate buyers before calling the API', () => {
    component.buyerRows = [{ personId: 'person-1', participation: '' }];
    component.save();

    expect(sales.convertProposal).not.toHaveBeenCalled();
    expect(component.error()).toContain('Não repita');
  });
});
