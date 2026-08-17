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
  Clock3,
  LucideAngularModule,
  Plus,
  RefreshCw,
  X,
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { Opportunity } from '../../core/models/crm.model';
import { Person } from '../../core/models/person.model';
import {
  ReservationPage,
  UnitReservation,
  UnitReservationStatus,
} from '../../core/models/reservation.model';
import { UnitListItem } from '../../core/models/unit.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { PersonService } from '../../core/services/person.service';
import { ReservationService } from '../../core/services/reservation.service';
import { UnitService } from '../../core/services/unit.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_PAGE: ReservationPage = {
  data: [],
  pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
};

@Component({
  selector: 'app-reservations-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DialogFocusDirective,
  ],
  templateUrl: './reservations-section.component.html',
})
export class ReservationsSectionComponent implements OnChanges, OnDestroy {
  private readonly reservations = inject(ReservationService);
  private readonly unitsService = inject(UnitService);
  private readonly peopleService = inject(PersonService);
  private readonly crm = inject(CrmService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;
  private readonly clock = window.setInterval(
    () => this.now.set(Date.now()),
    60_000,
  );

  @Input() developmentId = '';
  @Input() opportunityId = '';
  @Input() personId = '';
  @Input() unitId = '';
  @Output() readonly changed = new EventEmitter<string>();

  readonly canRead = this.authorization.hasPermission(
    APP_PERMISSIONS.SALES_READ,
  );
  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.SALES_WRITE,
  );
  readonly page = signal(EMPTY_PAGE);
  readonly units = signal<UnitListItem[]>([]);
  readonly people = signal<Person[]>([]);
  readonly opportunities = signal<Opportunity[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly createOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly cancelTarget = signal<UnitReservation | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  readonly now = signal(Date.now());

  formUnitId = '';
  formPersonId = '';
  formOpportunityId = '';
  formExpiresAt = '';
  formNotes = '';
  cancellationReason = '';

  readonly PlusIcon = Plus;
  readonly ClockIcon = Clock3;
  readonly RefreshIcon = RefreshCw;
  readonly CloseIcon = X;

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
    window.clearInterval(this.clock);
    this.loadSequence += 1;
  }

  load(): void {
    if (!this.canRead || (!this.developmentId && !this.opportunityId)) return;
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    const unitRequest = this.developmentId
      ? this.unitsService.list({ developmentId: this.developmentId })
      : of([] as UnitListItem[]);
    const opportunityRequest =
      this.developmentId && !this.opportunityId
        ? this.crm.listOpportunities({
            developmentId: this.developmentId,
            pageSize: 100,
          })
        : of({
            data: [] as Opportunity[],
            pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
          });

    forkJoin({
      page: this.reservations.list({
        ...(this.opportunityId
          ? { opportunityId: this.opportunityId }
          : { developmentId: this.developmentId }),
        pageSize: 100,
      }),
      units: unitRequest,
      people: this.peopleService.list(),
      opportunities: opportunityRequest,
    }).subscribe({
      next: ({ page, units, people, opportunities }) => {
        if (sequence !== this.loadSequence) return;
        this.page.set(page);
        this.units.set(units);
        this.people.set(people);
        this.opportunities.set(opportunities.data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar as reservas.'),
        );
      },
    });
  }

  openCreate(): void {
    if (!this.canWrite || this.loading()) return;
    const plus48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);
    plus48Hours.setMinutes(
      plus48Hours.getMinutes() - plus48Hours.getTimezoneOffset(),
    );
    this.formUnitId = this.unitId || '';
    this.formPersonId = this.personId || '';
    this.formOpportunityId = this.opportunityId || '';
    this.formExpiresAt = plus48Hours.toISOString().slice(0, 16);
    this.formNotes = '';
    this.formError.set('');
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (!this.saving()) this.createOpen.set(false);
  }

  save(): void {
    if (!this.canWrite || this.saving()) return;
    if (!this.formUnitId || !this.formPersonId || !this.formExpiresAt) {
      this.formError.set('Informe unidade, cliente e validade.');
      return;
    }
    const expiresAt = new Date(this.formExpiresAt);
    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      this.formError.set('A validade deve estar no futuro.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.reservations
      .create({
        unitId: this.formUnitId,
        personId: this.formPersonId,
        ...(this.formOpportunityId
          ? { opportunityId: this.formOpportunityId }
          : {}),
        expiresAt: expiresAt.toISOString(),
        ...(this.formNotes.trim() ? { notes: this.formNotes.trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createOpen.set(false);
          this.feedback.set('Unidade reservada com sucesso.');
          this.changed.emit('Unidade reservada com sucesso.');
          this.load();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            extractError(error, 'Não foi possível criar a reserva.'),
          );
        },
      });
  }

  requestCancel(reservation: UnitReservation): void {
    if (!this.canWrite || reservation.status !== 'ATIVA') return;
    this.cancellationReason = '';
    this.cancelError.set('');
    this.cancelTarget.set(reservation);
  }

  closeCancel(): void {
    if (!this.cancelling()) this.cancelTarget.set(null);
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    const reason = this.cancellationReason.trim();
    if (!target || !reason || this.cancelling()) {
      if (!reason) this.cancelError.set('Informe o motivo do cancelamento.');
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set('');
    this.reservations.cancel(target.id, { reason }).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelTarget.set(null);
        this.feedback.set('Reserva cancelada e unidade liberada.');
        this.changed.emit('Reserva cancelada e unidade liberada.');
        this.load();
      },
      error: (error: unknown) => {
        this.cancelling.set(false);
        if ((error as HttpErrorResponse).status === 409) this.load();
        this.cancelError.set(
          extractError(error, 'Não foi possível cancelar a reserva.'),
        );
      },
    });
  }

  availableUnits(): UnitListItem[] {
    return this.units().filter((unit) => unit.status === 'DISPONIVEL');
  }

  statusLabel(status: UnitReservationStatus): string {
    return {
      ATIVA: 'Ativa',
      CANCELADA: 'Cancelada',
      EXPIRADA: 'Expirada',
      CONVERTIDA: 'Convertida',
    }[status];
  }

  statusClass(status: UnitReservationStatus): string {
    return {
      ATIVA: 'bg-emerald-50 text-emerald-800',
      CANCELADA: 'bg-red-50 text-red-700',
      EXPIRADA: 'bg-surface-warm text-muted',
      CONVERTIDA: 'bg-blue-50 text-blue-800',
    }[status];
  }

  remaining(reservation: UnitReservation): string {
    if (reservation.status !== 'ATIVA')
      return this.statusLabel(reservation.status);
    const difference = new Date(reservation.expiresAt).getTime() - this.now();
    if (difference <= 0) return 'Expiração pendente de atualização';
    const hours = Math.floor(difference / 3_600_000);
    const minutes = Math.max(1, Math.floor((difference % 3_600_000) / 60_000));
    return hours >= 24
      ? `${Math.floor(hours / 24)}d ${hours % 24}h restantes`
      : `${hours}h ${minutes}min restantes`;
  }

  formatDateTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(value))
      : 'Não informado';
  }
}
