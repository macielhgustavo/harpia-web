import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProposalPage, SalesProposal } from '../../core/models/proposal.model';
import { ReservationPage } from '../../core/models/reservation.model';
import { UnitListItem } from '../../core/models/unit.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { ProposalService } from '../../core/services/proposal.service';
import { ReservationService } from '../../core/services/reservation.service';
import { UnitService } from '../../core/services/unit.service';
import { ProposalsSectionComponent } from './proposals-section.component';

const unit = {
  id: 'unit-1',
  developmentId: 'development-1',
  identifier: '101',
  status: 'DISPONIVEL',
  prices: [],
} as unknown as UnitListItem;

const proposal = {
  id: 'proposal-1',
  opportunityId: 'opportunity-1',
  reservationId: null,
  personId: 'person-1',
  unitId: 'unit-1',
  status: 'RASCUNHO',
  validUntil: null,
  unit: {
    id: 'unit-1',
    identifier: '101',
    status: 'DISPONIVEL',
    development: { id: 'development-1', name: 'Residencial' },
  },
  currentVersion: {
    id: 'version-1',
    version: 1,
    basePrice: '100000.00',
    discount: '10000.00',
    finalPrice: '90000.00',
    downPayment: '10000.00',
    validUntil: null,
    notes: 'Primeira condição',
    sourcePriceTableId: 'table-1',
    sourcePriceTableName: 'Tabela agosto',
    createdAt: '2026-08-16T12:00:00.000Z',
    createdByUser: { id: 'user-1', name: 'Admin' },
    conditions: [
      {
        id: 'condition-1',
        type: 'ENTRADA',
        amount: '10000.00',
        installments: null,
        firstDueDate: null,
        intervalMonths: null,
        description: null,
        position: 0,
      },
      {
        id: 'condition-2',
        type: 'SALDO_CHAVES',
        amount: '80000.00',
        installments: null,
        firstDueDate: null,
        intervalMonths: null,
        description: null,
        position: 1,
      },
    ],
  },
  versions: [],
} as unknown as SalesProposal;
proposal.versions = [proposal.currentVersion!];

const emptyProposalPage: ProposalPage = {
  data: [],
  pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
};
const emptyReservationPage: ReservationPage = {
  data: [],
  pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
};

describe('ProposalsSectionComponent', () => {
  let fixture: ComponentFixture<ProposalsSectionComponent>;
  let component: ProposalsSectionComponent;
  let proposalsService: jasmine.SpyObj<ProposalService>;

  beforeEach(async () => {
    proposalsService = jasmine.createSpyObj<ProposalService>(
      'ProposalService',
      [
        'list',
        'pricePreview',
        'create',
        'createVersion',
        'send',
        'accept',
        'reject',
      ],
    );
    proposalsService.list.and.returnValue(of(emptyProposalPage));
    proposalsService.pricePreview.and.returnValue(
      of({
        unit: {
          id: 'unit-1',
          identifier: '101',
          developmentId: 'development-1',
        },
        basePrice: '100000.00',
        priceTable: { id: 'table-1', name: 'Tabela agosto' },
      }),
    );
    proposalsService.create.and.returnValue(of(proposal));
    proposalsService.createVersion.and.returnValue(of(proposal));
    proposalsService.send.and.returnValue(of(proposal));
    proposalsService.accept.and.returnValue(of(proposal));
    proposalsService.reject.and.returnValue(of(proposal));

    const reservations = jasmine.createSpyObj<ReservationService>(
      'ReservationService',
      ['list'],
    );
    reservations.list.and.returnValue(of(emptyReservationPage));
    const units = jasmine.createSpyObj<UnitService>('UnitService', ['list']);
    units.list.and.returnValue(of([unit]));
    const authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ProposalsSectionComponent],
      providers: [
        { provide: ProposalService, useValue: proposalsService },
        { provide: ReservationService, useValue: reservations },
        { provide: UnitService, useValue: units },
        { provide: AuthorizationService, useValue: authorization },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProposalsSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('developmentId', 'development-1');
    fixture.componentRef.setInput('opportunityId', 'opportunity-1');
    fixture.componentRef.setInput('personId', 'person-1');
    fixture.componentRef.setInput('unitId', 'unit-1');
    fixture.detectChanges();
  });

  it('loads proposals strictly in the opportunity context', () => {
    expect(proposalsService.list).toHaveBeenCalledWith({
      opportunityId: 'opportunity-1',
      pageSize: 100,
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma proposta registrada',
    );
  });

  it('creates a proposal with a frozen preview and exact payment total', () => {
    component.openCreate();
    component.discount = '10.000,00';
    component.entryAmount = '10.000,00';
    component.installmentAmount = '40.000,00';
    component.installments = 20;
    component.balanceAmount = '40.000,00';
    component.notes = '  Condição comercial  ';

    component.save();

    expect(proposalsService.create).toHaveBeenCalledWith({
      personId: 'person-1',
      unitId: 'unit-1',
      opportunityId: 'opportunity-1',
      discount: '10000.00',
      notes: 'Condição comercial',
      conditions: [
        { type: 'ENTRADA', amount: '10000.00' },
        {
          type: 'PARCELAS',
          amount: '40000.00',
          installments: 20,
          intervalMonths: 1,
        },
        { type: 'SALDO_CHAVES', amount: '40000.00' },
      ],
    });
  });

  it('blocks a payment distribution that differs from the final price', () => {
    component.openCreate();
    component.entryAmount = '1,00';
    component.balanceAmount = '1,00';
    component.save();
    expect(proposalsService.create).not.toHaveBeenCalled();
    expect(component.formError()).toContain('somar exatamente');
    expect(component.step()).toBe(3);
  });

  it('creates a next version from the immutable current snapshot', () => {
    component.openVersion(proposal);
    component.save();
    expect(component.basePrice()).toBe('100000.00');
    expect(proposalsService.pricePreview).not.toHaveBeenCalled();
    expect(proposalsService.createVersion).toHaveBeenCalledWith(
      'proposal-1',
      jasmine.objectContaining({
        discount: '10000.00',
        conditions: [
          { type: 'ENTRADA', amount: '10000.00' },
          { type: 'SALDO_CHAVES', amount: '80000.00' },
        ],
      }),
    );
  });

  it('sends and accepts through explicit transitions and emits refresh', () => {
    const changed = jasmine.createSpy('changed');
    component.changed.subscribe(changed);
    component.send(proposal);
    component.accept({ ...proposal, status: 'ENVIADA' });
    expect(proposalsService.send).toHaveBeenCalledOnceWith('proposal-1');
    expect(proposalsService.accept).toHaveBeenCalledOnceWith('proposal-1');
    expect(changed).toHaveBeenCalledWith('Proposta aceita com sucesso.');
  });

  it('requires and trims a rejection reason', () => {
    component.openReject({ ...proposal, status: 'ENVIADA' });
    component.confirmReject();
    expect(proposalsService.reject).not.toHaveBeenCalled();
    component.rejectionReason.set('  Cliente recusou o prazo  ');
    component.confirmReject();
    expect(proposalsService.reject).toHaveBeenCalledOnceWith(
      'proposal-1',
      'Cliente recusou o prazo',
    );
  });
});
