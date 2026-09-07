import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Ban,
  CalendarClock,
  CalendarDays,
  Check,
  CircleCheck,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  UserX,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  SalesVisit,
  SalesVisitOutcome,
  SalesVisitPage,
  SalesVisitStatus,
} from '../../core/models/crm.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { UnitListItem } from '../../core/models/unit.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UnitService } from '../../core/services/unit.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

/**
 * Visits of a single opportunity, so the cap is per opportunity and not per
 * tenant. `GET /crm/visits` accepts at most 100 records per page; anything
 * beyond that is reported instead of silently dropped.
 */
export const VISITS_PAGE_SIZE = 100;

const EMPTY_PAGE: SalesVisitPage = {
  data: [],
  pagination: { page: 1, pageSize: VISITS_PAGE_SIZE, total: 0, totalPages: 0 },
};

export const VISIT_OUTCOMES: { value: SalesVisitOutcome; label: string }[] = [
  { value: 'INTERESSE_ALTO', label: 'Interesse alto' },
  { value: 'INTERESSE_MEDIO', label: 'Interesse médio' },
  { value: 'INTERESSE_BAIXO', label: 'Interesse baixo' },
  { value: 'SEM_INTERESSE', label: 'Sem interesse' },
  { value: 'REAGENDAR', label: 'Reagendar' },
];

const scheduledTime = (visit: SalesVisit) =>
  new Date(visit.scheduledAt).getTime();

@Component({
  selector: 'app-visits-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DialogFocusDirective,
  ],
  templateUrl: './visits-section.component.html',
})
export class VisitsSectionComponent implements OnChanges, OnDestroy {
  private readonly crm = inject(CrmService);
  private readonly unitsService = inject(UnitService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;

  /** Opportunity context. Person and tenant are still derived server side. */
  @Input() opportunityId = '';
  @Input() personName = '';
  @Input() developmentId = '';
  @Input() unitId = '';
  @Input() assignedUserId = '';
  @Input() users: ManagedUser[] = [];
  @Input() developments: DevelopmentListItem[] = [];
  @Output() readonly changed = new EventEmitter<string>();

  readonly canRead = this.authorization.hasPermission(APP_PERMISSIONS.CRM_READ);
  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );

  readonly page = signal<SalesVisitPage>(EMPTY_PAGE);
  readonly units = signal<UnitListItem[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly feedback = signal('');
  readonly saving = signal(false);
  readonly actionId = signal('');
  readonly formError = signal('');

  readonly createOpen = signal(false);
  readonly rescheduleTarget = signal<SalesVisit | null>(null);
  readonly completeTarget = signal<SalesVisit | null>(null);
  readonly cancelTarget = signal<SalesVisit | null>(null);

  /** Open visits first, soonest first; everything else is history, newest first. */
  readonly scheduled = computed(() =>
    this.page()
      .data.filter((visit) => visit.status === 'AGENDADA')
      .sort((a, b) => scheduledTime(a) - scheduledTime(b)),
  );
  readonly history = computed(() =>
    this.page()
      .data.filter((visit) => visit.status !== 'AGENDADA')
      .sort((a, b) => scheduledTime(b) - scheduledTime(a)),
  );
  /** Visits of this opportunity that did not fit the single page requested. */
  readonly overflow = computed(() =>
    Math.max(0, this.page().pagination.total - this.page().data.length),
  );

  formDevelopmentId = '';
  formUnitId = '';
  formAssignedUserId = '';
  formScheduledAt = '';
  formDurationMinutes = 60;
  formLocation = '';
  formNotes = '';
  formOutcome: SalesVisitOutcome = 'INTERESSE_ALTO';
  formResult = '';
  formCancellationReason = '';

  readonly outcomes = VISIT_OUTCOMES;
  readonly PlusIcon = Plus;
  readonly RefreshIcon = RefreshCw;
  readonly RescheduleIcon = Pencil;
  readonly ScheduledIcon = CalendarClock;
  readonly CalendarIcon = CalendarDays;
  readonly CompletedIcon = CircleCheck;
  readonly CompleteIcon = Check;
  readonly NoShowIcon = UserX;
  readonly CancelIcon = Ban;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['opportunityId']) this.load();
    if (changes['developmentId'] && this.developmentId) {
      this.loadUnits(this.developmentId);
    }
  }

  ngOnDestroy(): void {
    this.loadSequence += 1;
  }

  load(): void {
    if (!this.canRead || !this.opportunityId) return;
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadError.set('');
    this.crm
      .listVisits({
        opportunityId: this.opportunityId,
        pageSize: VISITS_PAGE_SIZE,
      })
      .subscribe({
        next: (page) => {
          if (sequence !== this.loadSequence) return;
          // The API already scopes by tenant and opportunity. Filtering again
          // is defence in depth: this section never renders a visit that
          // belongs to another opportunity.
          this.page.set({
            ...page,
            data: page.data.filter(
              (visit) => visit.opportunityId === this.opportunityId,
            ),
          });
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.loading.set(false);
          this.loadError.set(
            extractError(error, 'Não foi possível carregar as visitas.'),
          );
        },
      });
  }

  loadUnits(developmentId: string): void {
    this.units.set([]);
    if (!developmentId) return;
    this.unitsService
      .list({ developmentId })
      .subscribe({ next: (units) => this.units.set(units) });
  }

  onFormDevelopmentChange(developmentId: string): void {
    this.formDevelopmentId = developmentId;
    // A unit belongs to exactly one development; keeping a stale one would
    // send a pair the backend rejects.
    this.formUnitId = '';
    this.loadUnits(developmentId);
  }

  openCreate(): void {
    if (!this.canWrite) return;
    this.formDevelopmentId = this.developmentId;
    this.formUnitId = this.unitId;
    this.formAssignedUserId = this.assignedUserId;
    this.formScheduledAt = '';
    this.formDurationMinutes = 60;
    this.formLocation = '';
    this.formNotes = '';
    this.formError.set('');
    this.actionError.set('');
    if (this.formDevelopmentId) this.loadUnits(this.formDevelopmentId);
    this.createOpen.set(true);
  }

  createVisit(): void {
    if (!this.canWrite || this.saving()) return;
    if (!this.formScheduledAt) {
      this.formError.set('Informe a data e o horário da visita.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.crm
      .createVisit({
        opportunityId: this.opportunityId,
        scheduledAt: new Date(this.formScheduledAt).toISOString(),
        durationMinutes: this.formDurationMinutes,
        ...(this.formDevelopmentId
          ? { developmentId: this.formDevelopmentId }
          : {}),
        ...(this.formUnitId ? { unitId: this.formUnitId } : {}),
        ...(this.formAssignedUserId
          ? { assignedUserId: this.formAssignedUserId }
          : {}),
        ...(this.formLocation.trim()
          ? { location: this.formLocation.trim() }
          : {}),
        ...(this.formNotes.trim() ? { notes: this.formNotes.trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createOpen.set(false);
          this.settle('Visita agendada com sucesso.');
        },
        error: (error: unknown) =>
          this.failForm(error, 'Não foi possível agendar a visita.'),
      });
  }

  openReschedule(visit: SalesVisit): void {
    if (!this.canWrite) return;
    this.formScheduledAt = this.toLocalInput(visit.scheduledAt);
    this.formDurationMinutes = visit.durationMinutes;
    this.formAssignedUserId = visit.assignedUserId ?? '';
    this.formLocation = visit.location ?? '';
    this.formNotes = visit.notes ?? '';
    this.formError.set('');
    this.actionError.set('');
    this.rescheduleTarget.set(visit);
  }

  reschedule(): void {
    const visit = this.rescheduleTarget();
    if (!visit || this.saving()) return;
    if (!this.formScheduledAt) {
      this.formError.set('Informe a data e o horário da visita.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    // The visit keeps its id, tenant, opportunity, history and audit trail:
    // rescheduling is an update, never a cancellation plus a new record.
    this.crm
      .updateVisit(visit.id, {
        scheduledAt: new Date(this.formScheduledAt).toISOString(),
        durationMinutes: this.formDurationMinutes,
        assignedUserId: this.formAssignedUserId || null,
        location: this.formLocation.trim() || null,
        notes: this.formNotes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.rescheduleTarget.set(null);
          this.settle('Visita reagendada.');
        },
        error: (error: unknown) =>
          this.failForm(error, 'Não foi possível reagendar a visita.'),
      });
  }

  openComplete(visit: SalesVisit): void {
    if (!this.canWrite) return;
    this.formOutcome = 'INTERESSE_ALTO';
    this.formResult = '';
    this.formError.set('');
    this.actionError.set('');
    this.completeTarget.set(visit);
  }

  completeVisit(): void {
    const visit = this.completeTarget();
    if (!visit || this.saving()) return;
    this.saving.set(true);
    this.formError.set('');
    this.crm
      .updateVisit(visit.id, {
        status: 'REALIZADA',
        outcome: this.formOutcome,
        result: this.formResult.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.completeTarget.set(null);
          this.settle('Visita registrada como realizada.');
        },
        error: (error: unknown) =>
          this.failForm(error, 'Não foi possível registrar a visita.'),
      });
  }

  markNoShow(visit: SalesVisit): void {
    if (!this.canWrite || this.actionId()) return;
    this.actionId.set(visit.id);
    this.actionError.set('');
    // Only the status changes: `scheduledAt` stays as the moment that was
    // missed, and the backend stamps the temporal marker.
    this.crm.updateVisit(visit.id, { status: 'NAO_COMPARECEU' }).subscribe({
      next: () => {
        this.actionId.set('');
        this.settle('Não comparecimento registrado.');
      },
      error: (error: unknown) => {
        this.actionId.set('');
        this.actionError.set(
          extractError(
            error,
            'Não foi possível registrar o não comparecimento.',
          ),
        );
      },
    });
  }

  openCancel(visit: SalesVisit): void {
    if (!this.canWrite) return;
    this.formCancellationReason = '';
    this.formError.set('');
    this.actionError.set('');
    this.cancelTarget.set(visit);
  }

  cancelVisit(): void {
    const visit = this.cancelTarget();
    if (!visit || this.saving()) return;
    // The backend rejects a cancellation without a reason; the UI asks for it
    // instead of turning that into a server error.
    if (!this.formCancellationReason.trim()) {
      this.formError.set('Informe o motivo do cancelamento.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.crm
      .updateVisit(visit.id, {
        status: 'CANCELADA',
        cancellationReason: this.formCancellationReason.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.cancelTarget.set(null);
          this.settle('Visita cancelada.');
        },
        error: (error: unknown) =>
          this.failForm(error, 'Não foi possível cancelar a visita.'),
      });
  }

  closeDialogs(): void {
    if (this.saving()) return;
    this.createOpen.set(false);
    this.rescheduleTarget.set(null);
    this.completeTarget.set(null);
    this.cancelTarget.set(null);
  }

  formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(value),
        )
      : 'Não definida';
  }

  formatTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(
          new Date(value),
        )
      : '';
  }

  formatDateTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(value))
      : 'Não definido';
  }

  statusLabel(status: SalesVisitStatus): string {
    return {
      AGENDADA: 'Agendada',
      REALIZADA: 'Realizada',
      CANCELADA: 'Cancelada',
      NAO_COMPARECEU: 'Não compareceu',
    }[status];
  }

  /** Colour is redundant: every badge also carries an icon and a text label. */
  statusClass(status: SalesVisitStatus): string {
    return {
      AGENDADA: 'bg-gold-light text-gold-dark',
      REALIZADA: 'bg-emerald-50 text-emerald-700',
      CANCELADA: 'bg-surface-warm text-muted',
      NAO_COMPARECEU: 'bg-red-50 text-red-800',
    }[status];
  }

  statusIcon(status: SalesVisitStatus) {
    return {
      AGENDADA: this.ScheduledIcon,
      REALIZADA: this.CompletedIcon,
      CANCELADA: this.CancelIcon,
      NAO_COMPARECEU: this.NoShowIcon,
    }[status];
  }

  outcomeLabel(outcome: SalesVisitOutcome | null): string {
    if (!outcome) return '';
    return (
      this.outcomes.find((item) => item.value === outcome)?.label ?? outcome
    );
  }

  placeLabel(visit: SalesVisit): string {
    const development = visit.development?.name ?? 'Sem empreendimento';
    return visit.unit
      ? development + ' · Unidade ' + visit.unit.identifier
      : development;
  }

  private settle(message: string): void {
    this.feedback.set(message);
    this.actionError.set('');
    this.load();
    // The timeline stays a backend projection: the parent refetches it instead
    // of the section inventing a local event.
    this.changed.emit(message);
  }

  private failForm(error: unknown, fallback: string): void {
    this.saving.set(false);
    this.formError.set(extractError(error, fallback));
  }

  /** `datetime-local` needs a local wall clock string, not a UTC instant. */
  private toLocalInput(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
