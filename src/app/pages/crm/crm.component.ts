import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Columns3,
  List,
  LucideAngularModule,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Board,
  BoardFilters,
  BoardStageSummary,
  Opportunity,
  OpportunityPage,
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

/** Cards fetched per stage, both on the first board load and on "load more". */
export const STAGE_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 20;

const EMPTY_PAGE: OpportunityPage = {
  data: [],
  pagination: { page: 1, pageSize: LIST_PAGE_SIZE, total: 0, totalPages: 0 },
};

/** One Kanban column: server aggregates plus the pages loaded so far. */
export interface BoardColumn {
  stage: SalesStage;
  summary: BoardStageSummary;
  opportunities: Opportunity[];
  page: number;
}

@Component({
  selector: 'app-crm',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DialogFocusDirective,
    OpportunityFormModalComponent,
  ],
  templateUrl: './crm.component.html',
})
export class CrmComponent implements OnInit {
  private readonly crm = inject(CrmService);
  private readonly peopleService = inject(PersonService);
  private readonly usersService = inject(UserManagementService);
  private readonly developmentService = inject(DevelopmentService);
  private readonly unitService = inject(UnitService);
  private readonly authorization = inject(AuthorizationService);
  private readonly router = inject(Router);
  private loadSequence = 0;

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );
  readonly columns = signal<BoardColumn[]>([]);
  readonly boardSummary = signal<Board['summary']>({
    total: 0,
    estimatedValue: '0.00',
    weightedValue: '0.00',
  });
  readonly result = signal<OpportunityPage>(EMPTY_PAGE);
  readonly pipelines = signal<SalesPipeline[]>([]);
  readonly people = signal<Person[]>([]);
  readonly users = signal<ManagedUser[]>([]);
  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly units = signal<UnitListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly feedback = signal('');
  readonly actionError = signal('');
  readonly loadingStageId = signal('');
  readonly search = signal('');
  readonly pipelineId = signal('');
  readonly stageId = signal('');
  readonly assignedUserId = signal('');
  readonly developmentId = signal('');
  readonly view = signal<'kanban' | 'list'>('kanban');
  readonly formOpen = signal(false);
  readonly editing = signal<Opportunity | null>(null);
  readonly moveTarget = signal<Opportunity | null>(null);
  readonly moveStage = signal<SalesStage | null>(null);
  readonly lostReason = signal('');
  readonly moving = signal(false);
  readonly draggingOpportunityId = signal('');
  readonly dragTargetStageId = signal('');

  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly RefreshIcon = RefreshCw;
  readonly KanbanIcon = Columns3;
  readonly ListIcon = List;

  ngOnInit(): void {
    this.loadReferenceData();
  }

  get selectedPipeline(): SalesPipeline | undefined {
    return (
      this.pipelines().find((item) => item.id === this.pipelineId()) ??
      this.pipelines()[0]
    );
  }

  get isEmpty(): boolean {
    return this.view() === 'kanban'
      ? this.boardSummary().total === 0
      : this.result().data.length === 0;
  }

  /** Always the server total for the active view, never a page length. */
  get total(): number {
    return this.view() === 'kanban'
      ? this.boardSummary().total
      : this.result().pagination.total;
  }

  daysInStage(opportunity: Opportunity): number {
    const enteredAt = new Date(opportunity.stageEnteredAt).getTime();
    if (!Number.isFinite(enteredAt)) return 0;
    return Math.max(0, Math.floor((Date.now() - enteredAt) / 86_400_000));
  }

  stageAgeLabel(opportunity: Opportunity): string {
    const days = this.daysInStage(opportunity);
    if (days === 0) return 'Entrou hoje';
    return `${days} ${days === 1 ? 'dia' : 'dias'} na etapa`;
  }

  isOverdue(opportunity: Opportunity): boolean {
    if (
      !opportunity.nextContactAt ||
      opportunity.stage.isWon ||
      opportunity.stage.isLost
    ) {
      return false;
    }
    return new Date(opportunity.nextContactAt).getTime() < Date.now();
  }

  isStalled(opportunity: Opportunity): boolean {
    return (
      !opportunity.stage.isWon &&
      !opportunity.stage.isLost &&
      this.daysInStage(opportunity) >= 7
    );
  }

  probabilityLabel(opportunity: Opportunity): string {
    return `${opportunity.probability ?? opportunity.stage.defaultProbability}%`;
  }

  remaining(column: BoardColumn): number {
    return Math.max(0, column.summary.total - column.opportunities.length);
  }

  loadReferenceData(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      pipelines: this.crm.listPipelines(),
      people: this.peopleService.list(),
      users: this.usersService.list({ isActive: true }),
      developments: this.developmentService.list(),
    }).subscribe({
      next: ({ pipelines, people, users, developments }) => {
        this.pipelines.set(pipelines);
        this.people.set(people);
        this.users.set(users);
        this.developments.set(developments);
        const initialPipeline =
          pipelines.find((item) => item.isDefault) ?? pipelines[0];
        if (!this.pipelineId()) this.pipelineId.set(initialPipeline?.id ?? '');
        this.load(1);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(
          extractError(error, 'Não foi possível carregar o CRM.'),
        );
      },
    });
  }

  load(page = 1): void {
    return this.view() === 'kanban' ? this.loadBoard() : this.loadList(page);
  }

  /** Kanban: one request returns every column with server side aggregates. */
  loadBoard(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadError.set('');
    this.crm.getBoard({ ...this.boardFilters(), stageLimit: STAGE_PAGE_SIZE })
      .subscribe({
        next: (board) => {
          if (sequence !== this.loadSequence) return;
          this.applyBoard(board);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.loading.set(false);
          this.loadError.set(
            extractError(error, 'Não foi possível carregar o funil.'),
          );
        },
      });
  }

  loadList(page = 1): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadError.set('');
    this.crm
      .listOpportunities({
        ...this.boardFilters(),
        stageId: this.stageId() || undefined,
        page,
        pageSize: LIST_PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          if (sequence !== this.loadSequence) return;
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.loading.set(false);
          this.loadError.set(
            extractError(error, 'Não foi possível carregar as oportunidades.'),
          );
        },
      });
  }

  /** Appends the next page of a single column without touching the others. */
  loadMore(stageId: string): void {
    const column = this.columns().find((item) => item.stage.id === stageId);
    if (!column || this.loadingStageId()) return;
    this.loadingStageId.set(stageId);
    this.actionError.set('');
    this.crm
      .listOpportunities({
        ...this.boardFilters(),
        stageId,
        page: column.page + 1,
        pageSize: STAGE_PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          this.loadingStageId.set('');
          this.columns.update((columns) =>
            columns.map((item) => {
              if (item.stage.id !== stageId) return item;
              const known = new Set(item.opportunities.map((row) => row.id));
              const opportunities = [
                ...item.opportunities,
                ...result.data.filter((row) => !known.has(row.id)),
              ];
              return {
                ...item,
                opportunities,
                page: item.page + 1,
                summary: {
                  ...item.summary,
                  total: result.pagination.total,
                  loaded: opportunities.length,
                  hasMore: result.pagination.total > opportunities.length,
                },
              };
            }),
          );
        },
        error: (error: unknown) => {
          this.loadingStageId.set('');
          this.actionError.set(
            extractError(error, 'Não foi possível carregar mais oportunidades.'),
          );
        },
      });
  }

  setView(view: 'kanban' | 'list'): void {
    if (this.view() === view) return;
    this.view.set(view);
    this.load(1);
  }

  applyFilters(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.stageId.set('');
    this.assignedUserId.set('');
    this.developmentId.set('');
    this.load(1);
  }

  onPipelineFilter(): void {
    this.stageId.set('');
    this.load(1);
  }

  openCreate(): void {
    if (!this.canWrite) return;
    this.editing.set(null);
    this.units.set([]);
    this.formOpen.set(true);
  }

  openEdit(opportunity: Opportunity, event?: Event): void {
    event?.stopPropagation();
    if (!this.canWrite) return;
    this.editing.set(opportunity);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.units.set([]);
  }

  loadUnits(developmentId: string): void {
    this.units.set([]);
    if (!developmentId) return;
    this.unitService.list({ developmentId }).subscribe({
      next: (units) => this.units.set(units),
      error: () =>
        this.actionError.set(
          'Não foi possível carregar as unidades deste empreendimento.',
        ),
    });
  }

  onSaved(): void {
    const wasEditing = !!this.editing();
    this.closeForm();
    this.feedback.set(
      wasEditing
        ? 'Oportunidade atualizada com sucesso.'
        : 'Oportunidade criada com sucesso.',
    );
    this.load(1);
  }

  requestMove(opportunity: Opportunity, stageId: string): void {
    if (!this.canWrite || !stageId || stageId === opportunity.stageId) return;
    const stage =
      opportunity.pipelineId === this.selectedPipeline?.id
        ? this.selectedPipeline.stages.find((item) => item.id === stageId)
        : undefined;
    if (!stage) return;
    this.moveTarget.set(opportunity);
    this.moveStage.set(stage);
    this.lostReason.set('');
  }

  startDrag(opportunity: Opportunity, event: DragEvent): void {
    if (!this.canWrite || this.moving()) {
      event.preventDefault();
      return;
    }
    this.draggingOpportunityId.set(opportunity.id);
    event.dataTransfer?.setData('text/plain', opportunity.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  enterStage(stageId: string, event: DragEvent): void {
    if (!this.draggingOpportunityId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragTargetStageId.set(stageId);
  }

  leaveStage(stageId: string, event: DragEvent): void {
    if (
      event.currentTarget === event.target &&
      this.dragTargetStageId() === stageId
    ) {
      this.dragTargetStageId.set('');
    }
  }

  dropOnStage(stageId: string, event: DragEvent): void {
    event.preventDefault();
    const opportunityId =
      this.draggingOpportunityId() || event.dataTransfer?.getData('text/plain');
    const opportunity = this.boardOpportunities().find(
      (item) => item.id === opportunityId,
    );
    this.finishDrag();
    if (opportunity) this.requestMove(opportunity, stageId);
  }

  finishDrag(): void {
    this.draggingOpportunityId.set('');
    this.dragTargetStageId.set('');
  }

  closeMove(): void {
    if (!this.moving()) {
      this.moveTarget.set(null);
      this.moveStage.set(null);
    }
  }

  confirmMove(): void {
    const target = this.moveTarget();
    const stage = this.moveStage();
    if (
      !target ||
      !stage ||
      this.moving() ||
      (stage.isLost && !this.lostReason().trim())
    )
      return;
    this.moving.set(true);
    this.actionError.set('');
    // Snapshot so a failed move can restore both columns and their summaries.
    const snapshot = this.columns();
    if (this.view() === 'kanban') this.moveCardLocally(target, stage);
    this.crm
      .moveOpportunity(target.id, {
        stageId: stage.id,
        ...(stage.isLost ? { lostReason: this.lostReason().trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.moving.set(false);
          this.closeMove();
          this.feedback.set(`Oportunidade movida para “${stage.name}”.`);
          if (this.view() === 'kanban') this.refreshSummaries();
          else this.loadList(this.result().pagination.page);
        },
        error: (error: unknown) => {
          this.moving.set(false);
          this.columns.set(snapshot);
          if ((error as HttpErrorResponse).status === 404) {
            this.closeMove();
            this.load(1);
          }
          this.actionError.set(
            extractError(error, 'Não foi possível mover a oportunidade.'),
          );
        },
      });
  }

  openDetail(id: string): void {
    void this.router.navigate(['/crm/opportunities', id]);
  }

  formatMoney(value: string | null): string {
    return value == null
      ? 'Valor não informado'
      : new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(Number(value));
  }

  formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(value),
        )
      : 'Não definido';
  }

  private boardFilters(): BoardFilters {
    return {
      search: this.search() || undefined,
      pipelineId: this.pipelineId() || undefined,
      assignedUserId: this.assignedUserId() || undefined,
      developmentId: this.developmentId() || undefined,
    };
  }

  private boardOpportunities(): Opportunity[] {
    return this.columns().flatMap((column) => column.opportunities);
  }

  private applyBoard(board: Board): void {
    this.boardSummary.set(board.summary);
    this.columns.set(
      board.stages.map((item) => ({
        stage: item.stage,
        summary: item.summary,
        opportunities: item.opportunities,
        page: 1,
      })),
    );
  }

  /**
   * Optimistic move between columns. Totals are adjusted by one; the money
   * aggregates are refreshed from the server instead of being recomputed here,
   * because they are decimal strings and must never go through a JS float.
   */
  private moveCardLocally(opportunity: Opportunity, stage: SalesStage): void {
    this.columns.update((columns) =>
      columns.map((column) => {
        if (column.stage.id === opportunity.stageId) {
          const opportunities = column.opportunities.filter(
            (item) => item.id !== opportunity.id,
          );
          return {
            ...column,
            opportunities,
            summary: {
              ...column.summary,
              total: Math.max(0, column.summary.total - 1),
              loaded: opportunities.length,
            },
          };
        }
        if (column.stage.id === stage.id) {
          const moved: Opportunity = {
            ...opportunity,
            stageId: stage.id,
            stage,
            stageEnteredAt: new Date().toISOString(),
          };
          const opportunities = [moved, ...column.opportunities];
          return {
            ...column,
            opportunities,
            summary: {
              ...column.summary,
              total: column.summary.total + 1,
              loaded: opportunities.length,
            },
          };
        }
        return column;
      }),
    );
  }

  /** Summaries only: refreshes totals and money without reloading any list. */
  private refreshSummaries(): void {
    this.crm
      .getBoard({ ...this.boardFilters(), stageLimit: 0 })
      .subscribe({
        next: (board) => {
          this.boardSummary.set(board.summary);
          this.columns.update((columns) =>
            columns.map((column) => {
              const fresh = board.stages.find(
                (item) => item.stage.id === column.stage.id,
              );
              if (!fresh) return column;
              return {
                ...column,
                summary: {
                  ...fresh.summary,
                  loaded: column.opportunities.length,
                  hasMore: fresh.summary.total > column.opportunities.length,
                },
              };
            }),
          );
        },
        error: () =>
          this.actionError.set(
            'A oportunidade foi movida, mas os totais do funil não puderam ser atualizados.',
          ),
      });
  }
}
