import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  CalendarPlus,
  LucideAngularModule,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-angular';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Opportunity,
  OpportunityHistoryPage,
  OpportunityStageHistory,
  OpportunityTimelineEvent,
  SalesActivity,
  SalesActivityPage,
  SalesActivityPriority,
  SalesActivityStatus,
  SalesActivityType,
  SalesPipeline,
  SalesStage,
} from '../../core/models/crm.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { Person } from '../../core/models/person.model';
import { UnitListItem } from '../../core/models/unit.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { DevelopmentService } from '../../core/services/development.service';
import { PersonService } from '../../core/services/person.service';
import { UnitService } from '../../core/services/unit.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';
import { OpportunityFormModalComponent } from './opportunity-form-modal.component';
import { VisitsSectionComponent } from './visits-section.component';
import { ReservationsSectionComponent } from '../reservations/reservations-section.component';
import { ProposalsSectionComponent } from '../proposals/proposals-section.component';

const EMPTY_ACTIVITIES: SalesActivityPage = {
  data: [],
  pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
};
const EMPTY_HISTORY: OpportunityHistoryPage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

function mergeTimeline(
  current: OpportunityTimelineEvent[],
  incoming: OpportunityTimelineEvent[],
): OpportunityTimelineEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()].sort(
    (a, b) =>
      b.occurredAt.localeCompare(a.occurredAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

@Component({
  selector: 'app-opportunity-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    DialogFocusDirective,
    OpportunityFormModalComponent,
    VisitsSectionComponent,
    ReservationsSectionComponent,
    ProposalsSectionComponent,
  ],
  templateUrl: './opportunity-detail.component.html',
})
export class OpportunityDetailComponent implements OnInit, OnDestroy {
  private readonly crm = inject(CrmService);
  private readonly peopleService = inject(PersonService);
  private readonly usersService = inject(UserManagementService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly unitService = inject(UnitService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private id = '';

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );
  readonly opportunity = signal<Opportunity | null>(null);
  readonly pipelines = signal<SalesPipeline[]>([]);
  readonly activities = signal<SalesActivityPage>(EMPTY_ACTIVITIES);
  readonly history = signal<OpportunityStageHistory[]>([]);
  readonly historyPage = signal<OpportunityHistoryPage>(EMPTY_HISTORY);
  readonly historyLoadingMore = signal(false);
  readonly historyMoreError = signal('');
  readonly timeline = signal<OpportunityTimelineEvent[]>([]);
  readonly timelineNextCursor = signal<string | null>(null);
  readonly timelineLoadingMore = signal(false);
  readonly timelineMoreError = signal('');
  readonly people = signal<Person[]>([]);
  readonly users = signal<ManagedUser[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly units = signal<UnitListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly feedback = signal('');
  readonly editing = signal(false);
  readonly activityOpen = signal(false);
  readonly savingActivity = signal(false);
  readonly deletingActivityId = signal('');
  readonly deletingOpportunity = signal(false);
  readonly deleteOpen = signal(false);
  readonly moveOpen = signal(false);
  readonly selectedStageId = signal('');
  readonly lostReason = signal('');
  readonly moving = signal(false);

  activityType: SalesActivityType = 'LIGACAO';
  activityStatus: SalesActivityStatus = 'PENDENTE';
  activityPriority: SalesActivityPriority = 'NORMAL';
  activityAssignedUserId = '';
  activityScheduledAt = '';
  activityReminderAt = '';
  activityCompletedAt = '';
  activitySummary = '';
  activityNotes = '';
  activityResult = '';

  readonly activityTypes: { value: SalesActivityType; label: string }[] = [
    { value: 'LIGACAO', label: 'Ligação' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'EMAIL', label: 'E-mail' },
    { value: 'REUNIAO', label: 'Reunião' },
    { value: 'VISITA', label: 'Visita' },
    { value: 'FOLLOW_UP', label: 'Follow-up' },
    { value: 'OUTRO', label: 'Outro' },
  ];
  /** Lets the header quick action open the form owned by the visits section. */
  readonly visitsSection = viewChild(VisitsSectionComponent);

  readonly BackIcon = ArrowLeft;
  readonly VisitIcon = CalendarPlus;
  readonly EditIcon = Pencil;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.id = params.get('id') ?? '';
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentPipeline(): SalesPipeline | undefined {
    const item = this.opportunity();
    return this.pipelines().find(
      (pipeline) => pipeline.id === item?.pipelineId,
    );
  }

  get selectedStage(): SalesStage | undefined {
    return this.currentPipeline?.stages.find(
      (stage) => stage.id === this.selectedStageId(),
    );
  }

  load(): void {
    if (!this.id) return;
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      opportunity: this.crm.getOpportunity(this.id),
      pipelines: this.crm.listPipelines(),
      activities: this.crm.listActivities({
        opportunityId: this.id,
        pageSize: 50,
      }),
      history: this.crm.getHistory(this.id),
      timeline: this.crm.getTimeline(this.id),
      people: this.peopleService.list(),
      users: this.usersService.list({ isActive: true }),
      developments: this.developmentService.list(),
    }).subscribe({
      next: (data) => {
        this.opportunity.set(data.opportunity);
        this.pipelines.set(data.pipelines);
        this.activities.set(data.activities);
        this.history.set(data.history.data);
        this.historyPage.set(data.history);
        this.historyMoreError.set('');
        this.timeline.set(data.timeline.data);
        this.timelineNextCursor.set(data.timeline.nextCursor);
        this.timelineMoreError.set('');
        this.people.set(data.people);
        this.users.set(data.users);
        this.developments.set(data.developments);
        this.selectedStageId.set(data.opportunity.stageId);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(
          extractError(error, 'Não foi possível carregar a oportunidade.'),
        );
      },
    });
  }

  refreshCommercialData(message?: string): void {
    forkJoin({
      opportunity: this.crm.getOpportunity(this.id),
      activities: this.crm.listActivities({
        opportunityId: this.id,
        pageSize: 50,
      }),
      history: this.crm.getHistory(this.id),
      timeline: this.crm.getTimeline(this.id),
    }).subscribe({
      next: (data) => {
        this.opportunity.set(data.opportunity);
        this.activities.set(data.activities);
        this.history.set(data.history.data);
        this.historyPage.set(data.history);
        // A new event is prepended without discarding already loaded pages.
        // Keep the oldest cursor: keyset pagination remains anchored there.
        const previous = this.timeline();
        const previousCursor = this.timelineNextCursor();
        this.timeline.set(mergeTimeline(previous, data.timeline.data));
        const previousIds = new Set(previous.map((event) => event.id));
        const hasOverlap = data.timeline.data.some((event) =>
          previousIds.has(event.id),
        );
        this.timelineNextCursor.set(
          previousCursor ??
            (!previous.length || !hasOverlap ? data.timeline.nextCursor : null),
        );
        this.selectedStageId.set(data.opportunity.stageId);
        if (message) this.feedback.set(message);
      },
      error: (error: unknown) =>
        this.actionError.set(
          extractError(
            error,
            'A alteração foi concluída, mas não foi possível atualizar o resumo.',
          ),
        ),
    });
  }

  loadMoreHistory(): void {
    const { pagination } = this.historyPage();
    if (this.historyLoadingMore() || pagination.page >= pagination.totalPages)
      return;
    this.historyLoadingMore.set(true);
    this.historyMoreError.set('');
    this.crm
      .getHistory(this.id, pagination.page + 1, pagination.pageSize)
      .subscribe({
        next: (page) => {
          const seen = new Set(this.history().map((item) => item.id));
          this.history.update((items) => [
            ...items,
            ...page.data.filter((item) => !seen.has(item.id)),
          ]);
          this.historyPage.set(page);
          this.historyLoadingMore.set(false);
        },
        error: (error: unknown) => {
          this.historyLoadingMore.set(false);
          this.historyMoreError.set(
            extractError(error, 'Não foi possível carregar etapas anteriores.'),
          );
        },
      });
  }

  loadMoreTimeline(): void {
    const cursor = this.timelineNextCursor();
    if (!cursor || this.timelineLoadingMore()) return;
    this.timelineLoadingMore.set(true);
    this.timelineMoreError.set('');
    this.crm.getTimeline(this.id, 20, cursor).subscribe({
      next: (page) => {
        this.timeline.set(mergeTimeline(this.timeline(), page.data));
        this.timelineNextCursor.set(page.nextCursor);
        this.timelineLoadingMore.set(false);
      },
      error: (error: unknown) => {
        this.timelineLoadingMore.set(false);
        this.timelineMoreError.set(
          extractError(error, 'Não foi possível carregar eventos anteriores.'),
        );
      },
    });
  }

  loadUnits(developmentId: string): void {
    this.units.set([]);
    if (!developmentId) return;
    this.unitService
      .list({ developmentId })
      .subscribe({ next: (items) => this.units.set(items) });
  }

  onEdited(): void {
    this.editing.set(false);
    this.refreshCommercialData('Oportunidade atualizada com sucesso.');
  }

  onReservationChanged(message: string): void {
    this.refreshCommercialData(message);
    const developmentId = this.opportunity()?.developmentId;
    if (developmentId) this.loadUnits(developmentId);
  }

  onProposalChanged(message: string): void {
    this.refreshCommercialData(message);
  }

  /**
   * The visits section owns its own list; the detail only refetches the
   * timeline, which stays a backend projection of what actually happened.
   */
  onVisitChanged(message: string): void {
    this.refreshCommercialData(message);
  }

  scheduleVisit(): void {
    if (!this.canWrite) return;
    this.visitsSection()?.openCreate();
  }

  openMove(): void {
    if (!this.canWrite || !this.opportunity()) return;
    this.selectedStageId.set(this.opportunity()!.stageId);
    this.lostReason.set('');
    this.moveOpen.set(true);
  }

  confirmMove(): void {
    const stage = this.selectedStage;
    if (
      !stage ||
      stage.id === this.opportunity()?.stageId ||
      this.moving() ||
      (stage.isLost && !this.lostReason().trim())
    )
      return;
    this.moving.set(true);
    this.crm
      .moveOpportunity(this.id, {
        stageId: stage.id,
        ...(stage.isLost ? { lostReason: this.lostReason().trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.moving.set(false);
          this.moveOpen.set(false);
          this.refreshCommercialData(
            `Oportunidade movida para “${stage.name}”.`,
          );
        },
        error: (error: unknown) => {
          this.moving.set(false);
          this.actionError.set(
            extractError(error, 'Não foi possível mover a oportunidade.'),
          );
        },
      });
  }

  createActivity(): void {
    if (!this.canWrite || this.savingActivity()) return;
    this.savingActivity.set(true);
    this.actionError.set('');
    this.crm
      .createActivity({
        opportunityId: this.id,
        type: this.activityType,
        status: this.activityStatus,
        priority: this.activityPriority,
        ...(this.activityAssignedUserId
          ? { assignedUserId: this.activityAssignedUserId }
          : {}),
        ...(this.activityScheduledAt
          ? { scheduledAt: new Date(this.activityScheduledAt).toISOString() }
          : {}),
        ...(this.activityReminderAt
          ? { reminderAt: new Date(this.activityReminderAt).toISOString() }
          : {}),
        ...(this.activityCompletedAt
          ? { completedAt: new Date(this.activityCompletedAt).toISOString() }
          : {}),
        ...(this.activitySummary.trim()
          ? { summary: this.activitySummary.trim() }
          : {}),
        ...(this.activityNotes.trim()
          ? { notes: this.activityNotes.trim() }
          : {}),
        ...(this.activityResult.trim()
          ? { result: this.activityResult.trim() }
          : {}),
      })
      .subscribe({
        next: () => {
          this.savingActivity.set(false);
          this.activityOpen.set(false);
          this.resetActivityForm();
          this.refreshCommercialData('Atividade registrada com sucesso.');
        },
        error: (error: unknown) => {
          this.savingActivity.set(false);
          this.actionError.set(
            extractError(error, 'Não foi possível registrar a atividade.'),
          );
        },
      });
  }

  removeActivity(activity: SalesActivity): void {
    if (!this.canWrite || this.deletingActivityId()) return;
    this.deletingActivityId.set(activity.id);
    this.crm.removeActivity(activity.id).subscribe({
      next: () => {
        this.deletingActivityId.set('');
        this.refreshCommercialData('Atividade removida.');
      },
      error: (error: unknown) => {
        this.deletingActivityId.set('');
        this.actionError.set(
          extractError(error, 'Não foi possível remover a atividade.'),
        );
      },
    });
  }

  confirmDelete(): void {
    if (!this.canWrite || this.deletingOpportunity()) return;
    this.deletingOpportunity.set(true);
    this.crm.removeOpportunity(this.id).subscribe({
      next: () =>
        void this.router.navigate(['/crm'], { queryParams: { removed: '1' } }),
      error: (error: unknown) => {
        this.deletingOpportunity.set(false);
        if ((error as HttpErrorResponse).status === 404)
          void this.router.navigate(['/crm']);
        this.actionError.set(
          extractError(error, 'Não foi possível remover a oportunidade.'),
        );
      },
    });
  }

  formatMoney(value: string | null): string {
    return value == null
      ? 'Não informado'
      : new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(Number(value));
  }

  formatDateTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(value))
      : 'Não definido';
  }

  activityLabel(type: SalesActivityType): string {
    return (
      this.activityTypes.find((item) => item.value === type)?.label ?? type
    );
  }

  activityStatusLabel(status: SalesActivityStatus): string {
    return {
      PENDENTE: 'Pendente',
      EM_ANDAMENTO: 'Em andamento',
      CONCLUIDA: 'Concluída',
      CANCELADA: 'Cancelada',
    }[status];
  }

  activityPriorityLabel(priority: SalesActivityPriority): string {
    return {
      BAIXA: 'Baixa',
      NORMAL: 'Normal',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    }[priority];
  }

  timelineTypeLabel(type: OpportunityTimelineEvent['type']): string {
    return {
      STAGE_CHANGED: 'Etapa',
      ACTIVITY: 'Atividade',
      VISIT: 'Visita',
      RESERVATION: 'Reserva',
      PROPOSAL: 'Proposta',
      SALE: 'Venda',
    }[type];
  }

  private resetActivityForm(): void {
    this.activityType = 'LIGACAO';
    this.activityStatus = 'PENDENTE';
    this.activityPriority = 'NORMAL';
    this.activityAssignedUserId = '';
    this.activityScheduledAt = '';
    this.activityReminderAt = '';
    this.activityCompletedAt = '';
    this.activitySummary = '';
    this.activityNotes = '';
    this.activityResult = '';
  }
}
