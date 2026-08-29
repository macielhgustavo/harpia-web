import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DocumentService } from '../../core/services/document.service';
import { PersonService } from '../../core/services/person.service';
import { SaleService } from '../../core/services/sale.service';
import { SaleDetailComponent } from './sale-detail.component';

describe('SaleDetailComponent', () => {
  let fixture: ComponentFixture<SaleDetailComponent>;
  let component: SaleDetailComponent;
  let sales: jasmine.SpyObj<SaleService>;

  const detail = {
    id: 'sale-1',
    saleNumber: 'VEN-2026-0001',
    status: 'ATIVA',
    saleDate: '2026-08-25T00:00:00.000Z',
    grossAmount: '500000.00',
    discountAmount: '10000.00',
    netAmount: '490000.00',
    outstandingBalance: '490000.00',
    notes: 'Contrato assinado',
    proposalId: 'proposal-1',
    opportunityId: 'opportunity-1',
    createdByUser: { id: 'user-1', name: 'Admin' },
    development: { id: 'development-1', name: 'Jardins' },
    unit: {
      id: 'unit-1',
      identifier: '101',
      grouping: 'Torre A',
      status: 'VENDIDA',
      category: 'APARTAMENTO',
    },
    opportunity: {
      id: 'opportunity-1',
      stage: { id: 'won', name: 'Ganho', code: 'WON' },
    },
    buyers: [
      {
        id: 'buyer-1',
        personId: 'person-1',
        participationPercentage: '100.00',
        isPrimary: true,
        createdAt: '2026-08-25T00:00:00.000Z',
        person: {
          id: 'person-1',
          name: 'Ana Cliente',
          document: '00000000000',
          documentType: 'CPF',
          email: null,
          phone: null,
        },
      },
    ],
    paymentPlan: [
      {
        id: 'plan-1',
        type: 'ENTRADA',
        amount: '90000.00',
        installments: null,
        firstDueDate: null,
        intervalMonths: null,
        description: null,
        position: 0,
      },
    ],
    commissions: [],
    documents: [],
    audit: [],
  } as unknown as import('../../core/models/sale.model').SaleDetail;

  beforeEach(async () => {
    sales = jasmine.createSpyObj<SaleService>('SaleService', [
      'getById',
      'update',
      'addCommission',
    ]);
    sales.getById.and.returnValue(of(detail));
    sales.update.and.returnValue(of(detail));
    sales.addCommission.and.returnValue(
      of({
        id: 'commission-1',
        personId: 'broker-1',
        userId: null,
        percentage: '1.00',
        amount: '5000.00',
        status: 'PREVISTA',
        notes: null,
        createdAt: '2026-08-25T00:00:00.000Z',
        person: { id: 'broker-1', name: 'Corretor' },
        user: null,
      }),
    );
    const people = jasmine.createSpyObj<PersonService>('PersonService', [
      'list',
    ]);
    people.list.and.returnValue(of([]));
    const documents = jasmine.createSpyObj<DocumentService>('DocumentService', [
      'download',
    ]);
    const authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [SaleDetailComponent],
      providers: [
        { provide: SaleService, useValue: sales },
        { provide: PersonService, useValue: people },
        { provide: DocumentService, useValue: documents },
        { provide: AuthorizationService, useValue: authorization },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'sale-1' },
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SaleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders buyers, property, proposal values and payment plan', () => {
    expect(sales.getById).toHaveBeenCalledOnceWith('sale-1');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('VEN-2026-0001');
    expect(text).toContain('Ana Cliente');
    expect(text).toContain('Jardins');
    expect(text).toContain('Plano de pagamento contratado');
  });

  it('updates only the editable formal sale fields', () => {
    component.openEdit();
    component.editNotes = 'Contrato revisado';
    component.saveEdit();

    expect(sales.update).toHaveBeenCalledOnceWith('sale-1', {
      saleNumber: 'VEN-2026-0001',
      saleDate: '2026-08-25',
      notes: 'Contrato revisado',
    });
  });

  it('adds an initial person commission without changing sale status', () => {
    component.commissionOpen.set(true);
    component.commissionPersonId = 'broker-1';
    component.commissionAmount = '5.000,00';
    component.commissionPercentage = '1,00';
    component.saveCommission();

    expect(sales.addCommission).toHaveBeenCalledOnceWith('sale-1', {
      personId: 'broker-1',
      amount: '5000.00',
      percentage: '1.00',
    });
  });
});
