import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CalendarDays,
  Check,
  LucideAngularModule,
  Plus,
  RefreshCw,
  UserX,
  X,
} from 'lucide-angular';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  switchMap,
  takeUntil,
} from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Opportunity,
  SalesVisit,
  SalesVisitOutcome,
  SalesVisitPage,
  SalesVisitStatus,
} from '../../core/models/crm.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

/** Opportunities offered by the lookup at a time; search narrows the rest. */
export const OPPORTUNITY_LOOKUP_SIZE = 20;
export const OPPORTUNITY_LOOKUP_DEBOUNCE = 300;

const EMPTY_VISITS: SalesVisitPage = {
  data: [],
  pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
};

@Component({
  selector: 'app-crm-visits',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    DialogFocusDirective,
  ],
  templateUrl: './crm-visits.component.html',
})
export class CrmVisitsComponent implements OnInit, OnDestroy {
  private readonly crm = inject(CrmService);
  private readonly usersService = inject(UserManagementService);
  private readonly authorization = inject(AuthorizationService);

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );
  readonly result = signal<SalesVisitPage>(EMPTY_VISITS);
  readonly opportunities = signal<Opportunity[]>([]);
  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly actionId = signal('');
  readonly createOpen = signal(false);
  readonly completeTarget = signal<SalesVisit | null>(null);
  readonly cancelTarget = signal<SalesVisit | null>(null);

  readonly opportunitySearch = signal('');
  readonly opportunitySearching = signal(false);
  readonly opportunityTotal = signal(0);
  private readonly opportunityQuery = new Subject<string>();
  private readonly destroy = new Subject<void>();

  readonly statusFilter = signal<SalesVisitStatus | ''>('');
  readonly assignedUserFilter = signal('');
  readonly scheduledFrom = signal('');
  readonly scheduledTo = signal('');

  opportunityId = '';
  assignedUserId = '';
  scheduledAt = '';
  durationMinutes = 60;
  location = '';
  notes = '';
  outcome: SalesVisitOutcome = 'INTERESSE_ALTO';
  resultNotes = '';
  cancellationReason = '';

  readonly CalendarIcon = CalendarDays;
  readonly PlusIcon = Plus;
  readonly RefreshIcon = RefreshCw;
  readonly CompleteIcon = Check;
  readonly NoShowIcon = UserX;
  readonly CancelIcon = X;

  ngOnInit(): void {
    // Server side lookup: any opportunity of the tenant can be reached,
    // instead of only the ones that fit an arbitrary first page.
    this.opportunityQuery
      .pipe(
        debounceTime(OPPORTUNITY_LOOKUP_DEBOUNCE),
        distinctUntilChanged(),
        switchMap((search) => {
          this.opportunitySearching.set(true);
          return this.crm.listOpportunities({
            search: search || undefined,
            pageSize: OPPORTUNITY_LOOKUP_SIZE,
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe({
        next: (result) => {
          this.opportunitySearching.set(false);
          this.opportunities.set(result.data);
          this.opportunityTotal.set(result.pagination.total);
        },
        error: () => {
          this.opportunitySearching.set(false);
          this.error.set('Não foi possível buscar oportunidades.');
        },
      });
    this.loadReferences();
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  searchOpportunities(term: string): void {
    this.opportunitySearch.set(term);
    this.opportunityQuery.next(term.trim());
  }

  /** Records matching the lookup that did not fit the offered page. */
  get opportunityOverflow(): number {
    return Math.max(0, this.opportunityTotal() - this.opportunities().length);
  }

  loadReferences(): void {
    this.loading.set(true);
    forkJoin({
      opportunities: this.crm.listOpportunities({
        pageSize: OPPORTUNITY_LOOKUP_SIZE,
      }),
      users: this.usersService.list({ isActive: true }),
    }).subscribe({
      next: ({ opportunities, users }) => {
        this.opportunities.set(opportunities.data);
        this.opportunityTotal.set(opportunities.pagination.total);
        this.users.set(users);
        this.load(1);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar a agenda de visitas.'),
        );
      },
    });
  }

  load(page = 1): void {
    this.loading.set(true);
    this.error.set('');
    this.crm
      .listVisits({
        page,
        pageSize: 50,
        status: this.statusFilter() || undefined,
        assignedUserId: this.assignedUserFilter(),
        scheduledFrom: this.toIso(this.scheduledFrom()),
        scheduledTo: this.toIso(this.scheduledTo()),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(
            extractError(error, 'Não foi possível carregar as visitas.'),
          );
        },
      });
  }

  createVisit(): void {
    if (!this.canWrite || !this.opportunityId || !this.scheduledAt) return;
    this.actionId.set('create');
    this.error.set('');
    this.crm
      .createVisit({
        opportunityId: this.opportunityId,
        scheduledAt: new Date(this.scheduledAt).toISOString(),
        durationMinutes: this.durationMinutes,
        ...(this.assignedUserId ? { assignedUserId: this.assignedUserId } : {}),
        ...(this.location.trim() ? { location: this.location.trim() } : {}),
        ...(this.notes.trim() ? { notes: this.notes.trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.actionId.set('');
          this.createOpen.set(false);
          this.resetCreateForm();
          this.feedback.set('Visita agendada com sucesso.');
          this.load(1);
        },
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  completeVisit(): void {
    const visit = this.completeTarget();
    if (!visit || this.actionId()) return;
    this.actionId.set(visit.id);
    this.crm
      .updateVisit(visit.id, {
        status: 'REALIZADA',
        outcome: this.outcome,
        result: this.resultNotes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.actionId.set('');
          this.completeTarget.set(null);
          this.resultNotes = '';
          this.feedback.set('Comparecimento e resultado registrados.');
          this.load(this.result().pagination.page);
        },
        error: (error: unknown) => this.handleActionError(error),
      });
  }

  markNoShow(visit: SalesVisit): void {
    if (!this.canWrite || this.actionId()) return;
    this.actionId.set(visit.id);
    this.crm.updateVisit(visit.id, { status: 'NAO_COMPARECEU' }).subscribe({
      next: () => {
        this.actionId.set('');
        this.feedback.set('Ausência registrada.');
        this.load(this.result().pagination.page);
      },
      error: (error: unknown) => this.handleActionError(error),
    });
  }

  cancelVisit(): void {
    const visit = this.cancelTarget();
    if (!visit || !this.cancellationReason.trim() || this.actionId()) return;
    this.actionId.set(visit.id);
    this.crm
      .updateVisit(visit.id, {
        status: 'CANCELADA',
        cancellationReason: this.cancellationReason.trim(),
      })
      .subscribe({
        next: () => {
          this.actionId.set('');
          this.cancelTarget.set(null);
          this.cancellationReason = '';
          this.feedback.set('Visita cancelada.');
          this.load(this.result().pagination.page);
        },
        error: (error: unknown) => this.handleActionError(error),
      });
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

  outcomeLabel(outcome: SalesVisitOutcome | null): string {
    if (!outcome) return '';
    return {
      INTERESSE_ALTO: 'Interesse alto',
      INTERESSE_MEDIO: 'Interesse médio',
      INTERESSE_BAIXO: 'Interesse baixo',
      SEM_INTERESSE: 'Sem interesse',
      REAGENDAR: 'Reagendar',
    }[outcome];
  }

  private toIso(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
  }

  private resetCreateForm(): void {
    this.opportunityId = '';
    this.assignedUserId = '';
    this.scheduledAt = '';
    this.durationMinutes = 60;
    this.location = '';
    this.notes = '';
  }

  private handleActionError(error: unknown): void {
    this.actionId.set('');
    this.error.set(extractError(error, 'Não foi possível atualizar a visita.'));
  }
}
