import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LucideAngularModule,
  Plus,
  RefreshCw,
  Send,
  X,
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  CreateProposalInput,
  ProposalPaymentCondition,
  ProposalPaymentConditionInput,
  ProposalVersion,
  SalesProposal,
  SalesProposalStatus,
} from '../../core/models/proposal.model';
import { UnitReservation } from '../../core/models/reservation.model';
import { UnitListItem } from '../../core/models/unit.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { ProposalService } from '../../core/services/proposal.service';
import { ReservationService } from '../../core/services/reservation.service';
import { UnitService } from '../../core/services/unit.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

const STATUS_LABELS: Record<SalesProposalStatus, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADA: 'Enviada',
  EM_NEGOCIACAO: 'Em negociação',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
};

@Component({
  selector: 'app-proposals-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DialogFocusDirective,
  ],
  templateUrl: './proposals-section.component.html',
})
export class ProposalsSectionComponent implements OnChanges, OnDestroy {
  private readonly proposalsService = inject(ProposalService);
  private readonly reservationsService = inject(ReservationService);
  private readonly unitsService = inject(UnitService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;
  private priceSequence = 0;

  @Input({ required: true }) developmentId = '';
  @Input({ required: true }) opportunityId = '';
  @Input({ required: true }) personId = '';
  @Input() unitId = '';
  @Output() readonly changed = new EventEmitter<string>();

  readonly canRead = this.authorization.hasPermission(
    APP_PERMISSIONS.SALES_READ,
  );
  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.SALES_WRITE,
  );
  readonly proposals = signal<SalesProposal[]>([]);
  readonly units = signal<UnitListItem[]>([]);
  readonly reservations = signal<UnitReservation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly wizardOpen = signal(false);
  readonly step = signal(1);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly priceLoading = signal(false);
  readonly priceError = signal('');
  readonly basePrice = signal('0.00');
  readonly priceTableName = signal('');
  readonly versionTarget = signal<SalesProposal | null>(null);
  readonly rejectTarget = signal<SalesProposal | null>(null);
  readonly acceptTarget = signal<SalesProposal | null>(null);
  readonly rejectionReason = signal('');
  readonly rejecting = signal(false);
  readonly actionId = signal('');

  formUnitId = '';
  formReservationId = '';
  discount = '0,00';
  entryAmount = '0,00';
  installmentAmount = '0,00';
  installments = 1;
  firstDueDate = '';
  balanceAmount = '0,00';
  validUntil = '';
  notes = '';

  readonly PlusIcon = Plus;
  readonly RefreshIcon = RefreshCw;
  readonly CloseIcon = X;
  readonly PreviousIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;
  readonly SendIcon = Send;
  readonly AcceptIcon = Check;
  readonly ClockIcon = Clock3;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.canRead &&
      (changes['developmentId'] ||
        changes['opportunityId'] ||
        changes['personId'] ||
        changes['unitId'])
    ) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.loadSequence += 1;
    this.priceSequence += 1;
  }

  load(): void {
    if (!this.canRead || !this.opportunityId) return;
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      proposals: this.proposalsService.list({
        opportunityId: this.opportunityId,
        pageSize: 100,
      }),
      reservations: this.reservationsService.list({
        opportunityId: this.opportunityId,
        pageSize: 100,
      }),
      units: this.developmentId
        ? this.unitsService.list({ developmentId: this.developmentId })
        : of([] as UnitListItem[]),
    }).subscribe({
      next: ({ proposals, reservations, units }) => {
        if (sequence !== this.loadSequence) return;
        this.proposals.set(proposals.data);
        this.reservations.set(reservations.data);
        this.units.set(units);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar as propostas.'),
        );
      },
    });
  }

  openCreate(): void {
    if (!this.canWrite || this.loading()) return;
    this.versionTarget.set(null);
    const reservation = this.activeReservation();
    this.formReservationId = reservation?.id ?? '';
    this.formUnitId = reservation?.unitId ?? this.unitId;
    this.resetFinancialForm();
    this.wizardOpen.set(true);
    if (this.formUnitId) this.loadPrice();
  }

  openVersion(proposal: SalesProposal): void {
    if (!this.canWrite || !proposal.currentVersion) return;
    this.versionTarget.set(proposal);
    this.formUnitId = proposal.unitId;
    this.formReservationId = proposal.reservationId ?? '';
    this.basePrice.set(proposal.currentVersion.basePrice);
    this.priceTableName.set(
      proposal.currentVersion.sourcePriceTableName ?? 'Preço congelado',
    );
    this.discount = this.inputMoney(proposal.currentVersion.discount);
    this.entryAmount = this.inputMoney(
      this.conditionTotal(proposal.currentVersion.conditions, 'ENTRADA'),
    );
    this.installmentAmount = this.inputMoney(
      this.conditionTotal(proposal.currentVersion.conditions, 'PARCELAS'),
    );
    this.balanceAmount = this.inputMoney(
      proposal.currentVersion.conditions
        .filter(
          (condition) =>
            condition.type !== 'ENTRADA' && condition.type !== 'PARCELAS',
        )
        .reduce((sum, condition) => sum + Number(condition.amount), 0)
        .toFixed(2),
    );
    const parcel = proposal.currentVersion.conditions.find(
      (condition) => condition.type === 'PARCELAS',
    );
    this.installments = parcel?.installments ?? 1;
    this.firstDueDate = parcel?.firstDueDate?.slice(0, 10) ?? '';
    this.validUntil = proposal.currentVersion.validUntil?.slice(0, 10) ?? '';
    this.notes = proposal.currentVersion.notes ?? '';
    this.step.set(1);
    this.formError.set('');
    this.priceError.set('');
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    if (!this.saving()) this.wizardOpen.set(false);
  }

  loadPrice(): void {
    if (!this.formUnitId || this.versionTarget()) return;
    const sequence = ++this.priceSequence;
    this.priceLoading.set(true);
    this.priceError.set('');
    this.proposalsService.pricePreview(this.formUnitId).subscribe({
      next: (preview) => {
        if (sequence !== this.priceSequence) return;
        this.basePrice.set(preview.basePrice);
        this.priceTableName.set(preview.priceTable.name);
        this.priceLoading.set(false);
        this.balanceAmount = this.inputMoney(this.finalPrice());
      },
      error: (error: unknown) => {
        if (sequence !== this.priceSequence) return;
        this.priceLoading.set(false);
        this.basePrice.set('0.00');
        this.priceError.set(
          extractError(error, 'Não foi possível obter o preço da unidade.'),
        );
      },
    });
  }

  nextStep(): void {
    this.formError.set('');
    if (!this.validateStep(this.step())) return;
    if (this.step() < 4) this.step.update((value) => value + 1);
  }

  previousStep(): void {
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  save(): void {
    if (!this.canWrite || this.saving() || !this.validateAll()) return;
    const conditions = this.paymentConditions();
    const validUntil = this.validUntil
      ? new Date(`${this.validUntil}T23:59:59`).toISOString()
      : undefined;
    const common = {
      discount: this.apiMoney(this.discount),
      ...(validUntil ? { validUntil } : {}),
      ...(this.notes.trim() ? { notes: this.notes.trim() } : {}),
      conditions,
    };
    const target = this.versionTarget();
    const request = target
      ? this.proposalsService.createVersion(target.id, common)
      : this.proposalsService.create({
          ...common,
          personId: this.personId,
          unitId: this.formUnitId,
          opportunityId: this.opportunityId,
          ...(this.formReservationId
            ? { reservationId: this.formReservationId }
            : {}),
        } satisfies CreateProposalInput);
    this.saving.set(true);
    this.formError.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.wizardOpen.set(false);
        const message = target
          ? 'Nova versão da proposta criada.'
          : 'Proposta criada como rascunho.';
        this.feedback.set(message);
        this.changed.emit(message);
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(
          extractError(error, 'Não foi possível salvar a proposta.'),
        );
      },
    });
  }

  send(proposal: SalesProposal): void {
    this.runAction(proposal, 'send', 'Proposta enviada com sucesso.');
  }

  accept(proposal: SalesProposal): void {
    this.runAction(proposal, 'accept', 'Proposta aceita com sucesso.');
  }

  requestAccept(proposal: SalesProposal): void {
    if (!this.canWrite || this.actionId()) return;
    this.acceptTarget.set(proposal);
  }

  closeAccept(): void {
    if (!this.actionId()) this.acceptTarget.set(null);
  }

  confirmAccept(): void {
    const target = this.acceptTarget();
    if (!target) return;
    this.acceptTarget.set(null);
    this.accept(target);
  }

  openReject(proposal: SalesProposal): void {
    if (!this.canWrite || this.actionId()) return;
    this.rejectionReason.set('');
    this.formError.set('');
    this.rejectTarget.set(proposal);
  }

  closeReject(): void {
    if (!this.rejecting()) this.rejectTarget.set(null);
  }

  confirmReject(): void {
    const target = this.rejectTarget();
    const reason = this.rejectionReason().trim();
    if (!target || !reason || this.rejecting()) {
      if (!reason) this.formError.set('Informe o motivo da recusa.');
      return;
    }
    this.rejecting.set(true);
    this.proposalsService.reject(target.id, reason).subscribe({
      next: () => {
        this.rejecting.set(false);
        this.rejectTarget.set(null);
        this.feedback.set('Proposta recusada.');
        this.changed.emit('Proposta recusada.');
        this.load();
      },
      error: (error: unknown) => {
        this.rejecting.set(false);
        this.formError.set(
          extractError(error, 'Não foi possível recusar a proposta.'),
        );
        if ((error as HttpErrorResponse).status === 409) this.load();
      },
    });
  }

  finalPrice(): string {
    return this.fromCents(
      Math.max(0, this.cents(this.basePrice()) - this.cents(this.discount)),
    );
  }

  paymentTotal(): string {
    return this.fromCents(
      this.cents(this.entryAmount) +
        this.cents(this.installmentAmount) +
        this.cents(this.balanceAmount),
    );
  }

  difference(version: ProposalVersion, previous?: ProposalVersion): string {
    if (!previous) return 'Versão inicial';
    const delta = Number(version.finalPrice) - Number(previous.finalPrice);
    if (delta === 0) return 'Sem alteração no valor final';
    return `${delta < 0 ? 'Redução' : 'Aumento'} de ${this.formatMoney(
      Math.abs(delta).toFixed(2),
    )}`;
  }

  statusLabel(status: SalesProposalStatus): string {
    return STATUS_LABELS[status];
  }

  hasDiscount(value: string): boolean {
    return Number(value) > 0;
  }

  statusClass(status: SalesProposalStatus): string {
    if (status === 'ACEITA') return 'bg-emerald-50 text-emerald-800';
    if (status === 'RECUSADA' || status === 'CANCELADA')
      return 'bg-red-50 text-red-700';
    if (status === 'EXPIRADA') return 'bg-surface-warm text-muted';
    if (status === 'ENVIADA' || status === 'EM_NEGOCIACAO')
      return 'bg-blue-50 text-blue-800';
    return 'bg-amber-50 text-amber-800';
  }

  formatMoney(value: string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }

  formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(value),
        )
      : 'Sem validade';
  }

  availableUnits(): UnitListItem[] {
    const reservation = this.activeReservation();
    return this.units().filter(
      (unit) =>
        unit.status === 'DISPONIVEL' ||
        unit.id === this.unitId ||
        unit.id === reservation?.unitId,
    );
  }

  private runAction(
    proposal: SalesProposal,
    action: 'send' | 'accept',
    message: string,
  ) {
    if (!this.canWrite || this.actionId()) return;
    this.actionId.set(proposal.id);
    this.error.set('');
    this.proposalsService[action](proposal.id).subscribe({
      next: () => {
        this.actionId.set('');
        this.feedback.set(message);
        this.changed.emit(message);
        this.load();
      },
      error: (error: unknown) => {
        this.actionId.set('');
        this.error.set(
          extractError(error, 'Não foi possível concluir a ação.'),
        );
        if ((error as HttpErrorResponse).status === 409) this.load();
      },
    });
  }

  private resetFinancialForm(): void {
    this.step.set(1);
    this.discount = '0,00';
    this.entryAmount = '0,00';
    this.installmentAmount = '0,00';
    this.installments = 1;
    this.firstDueDate = '';
    this.balanceAmount = '0,00';
    this.validUntil = '';
    this.notes = '';
    this.basePrice.set('0.00');
    this.priceTableName.set('');
    this.formError.set('');
    this.priceError.set('');
  }

  private validateStep(step: number): boolean {
    if (
      step === 1 &&
      (!this.formUnitId || this.priceLoading() || this.priceError())
    ) {
      this.formError.set('Selecione uma unidade com preço ativo.');
      return false;
    }
    if (
      step === 2 &&
      (this.cents(this.discount) < 0 ||
        this.cents(this.discount) > this.cents(this.basePrice()))
    ) {
      this.formError.set('Informe um desconto entre zero e o preço base.');
      return false;
    }
    if (
      step === 3 &&
      (this.cents(this.entryAmount) < 0 ||
        this.cents(this.installmentAmount) < 0 ||
        this.cents(this.balanceAmount) < 0 ||
        this.cents(this.paymentTotal()) !== this.cents(this.finalPrice()) ||
        (this.cents(this.installmentAmount) > 0 && this.installments < 1))
    ) {
      this.formError.set(
        'A distribuição do pagamento deve somar exatamente o valor final.',
      );
      return false;
    }
    if (
      step === 4 &&
      this.validUntil &&
      new Date(`${this.validUntil}T23:59:59`).getTime() <= Date.now()
    ) {
      this.formError.set('A validade deve estar no futuro.');
      return false;
    }
    return true;
  }

  private validateAll(): boolean {
    for (let current = 1; current <= 4; current += 1) {
      if (!this.validateStep(current)) {
        this.step.set(current);
        return false;
      }
    }
    return true;
  }

  private paymentConditions(): ProposalPaymentConditionInput[] {
    const result: ProposalPaymentConditionInput[] = [];
    if (this.cents(this.entryAmount) > 0) {
      result.push({ type: 'ENTRADA', amount: this.apiMoney(this.entryAmount) });
    }
    if (this.cents(this.installmentAmount) > 0) {
      result.push({
        type: 'PARCELAS',
        amount: this.apiMoney(this.installmentAmount),
        installments: this.installments,
        intervalMonths: 1,
        ...(this.firstDueDate
          ? {
              firstDueDate: new Date(
                `${this.firstDueDate}T12:00:00`,
              ).toISOString(),
            }
          : {}),
      });
    }
    if (this.cents(this.balanceAmount) > 0 || result.length === 0) {
      result.push({
        type: 'SALDO_CHAVES',
        amount: this.apiMoney(this.balanceAmount),
      });
    }
    return result;
  }

  private activeReservation(): UnitReservation | undefined {
    return this.reservations().find(
      (reservation) => reservation.status === 'ATIVA',
    );
  }

  private conditionTotal(
    conditions: ProposalPaymentCondition[],
    type: ProposalPaymentCondition['type'],
  ): string {
    return conditions
      .filter((condition) => condition.type === type)
      .reduce((sum, condition) => sum + Number(condition.amount), 0)
      .toFixed(2);
  }

  apiMoney(value: string): string {
    return this.fromCents(this.cents(value));
  }

  private inputMoney(value: string): string {
    return Number(value).toFixed(2).replace('.', ',');
  }

  cents(value: string): number {
    const normalized = String(value ?? '')
      .trim()
      .replace(/\s/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) ? Math.round(number * 100) : -1;
  }

  private fromCents(value: number): string {
    return (value / 100).toFixed(2);
  }
}
