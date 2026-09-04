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

const EMPTY_PAGE: OpportunityPage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

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

  stageItems(stageId: string): Opportunity[] {
    return this.result().data.filter((item) => item.stageId === stageId);
  }

  stageTotal(stageId: string): string {
    const total = this.stageItems(stageId).reduce(
      (sum, opportunity) => sum + Number(opportunity.estimatedValue ?? 0),
      0,
    );
    return this.formatMoney(String(total));
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

  load(page: number): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadError.set('');
    this.crm
      .listOpportunities({
        page,
        pageSize: 50,
        search: this.search(),
        pipelineId: this.pipelineId(),
        stageId: this.stageId(),
        assignedUserId: this.assignedUserId(),
        developmentId: this.developmentId(),
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

  onSaved(opportunity: Opportunity): void {
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
    const opportunity = this.result().data.find(
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
          this.load(this.result().pagination.page);
        },
        error: (error: unknown) => {
          this.moving.set(false);
          if ((error as HttpErrorResponse).status === 404) {
            this.closeMove();
            this.load(this.result().pagination.page);
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
}
