import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  CreateOpportunityInput,
  Opportunity,
  SalesPipeline,
  UpdateOpportunityInput,
} from '../../core/models/crm.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { Person } from '../../core/models/person.model';
import { UnitListItem } from '../../core/models/unit.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { CrmService } from '../../core/services/crm.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

interface OpportunityForm {
  personId: string;
  pipelineId: string;
  stageId: string;
  assignedUserId: string;
  developmentId: string;
  unitId: string;
  source: string;
  estimatedValue: string;
  probability: string;
  nextContactAt: string;
  expectedCloseDate: string;
  notes: string;
}

@Component({
  selector: 'app-opportunity-form-modal',
  standalone: true,
  imports: [FormsModule, DialogFocusDirective],
  templateUrl: './opportunity-form-modal.component.html',
})
export class OpportunityFormModalComponent implements OnInit {
  private readonly crm = inject(CrmService);

  @Input() opportunity: Opportunity | null = null;
  @Input() pipelines: SalesPipeline[] = [];
  @Input() people: Person[] = [];
  @Input() users: ManagedUser[] = [];
  @Input() developments: DevelopmentListItem[] = [];
  @Input() units: UnitListItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Opportunity>();
  @Output() readonly developmentChanged = new EventEmitter<string>();

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  form: OpportunityForm = this.emptyForm();

  get isEditing(): boolean {
    return !!this.opportunity;
  }

  get selectedPipeline(): SalesPipeline | undefined {
    return this.pipelines.find((item) => item.id === this.form.pipelineId);
  }

  ngOnInit(): void {
    const pipeline =
      this.pipelines.find((item) => item.isDefault) ?? this.pipelines[0];
    if (!this.opportunity) {
      this.form.pipelineId = pipeline?.id ?? '';
      this.form.stageId = pipeline?.stages[0]?.id ?? '';
      return;
    }
    this.form = {
      personId: this.opportunity.personId,
      pipelineId: this.opportunity.pipelineId,
      stageId: this.opportunity.stageId,
      assignedUserId: this.opportunity.assignedUserId ?? '',
      developmentId: this.opportunity.developmentId ?? '',
      unitId: this.opportunity.unitId ?? '',
      source: this.opportunity.source ?? '',
      estimatedValue: this.opportunity.estimatedValue ?? '',
      probability: this.opportunity.probability?.toString() ?? '',
      nextContactAt: this.toLocalDateTime(this.opportunity.nextContactAt),
      expectedCloseDate: this.toDate(this.opportunity.expectedCloseDate),
      notes: this.opportunity.notes ?? '',
    };
    if (this.form.developmentId)
      this.developmentChanged.emit(this.form.developmentId);
  }

  onPipelineChange(): void {
    this.form.stageId = this.selectedPipeline?.stages[0]?.id ?? '';
  }

  onDevelopmentChange(): void {
    this.form.unitId = '';
    this.developmentChanged.emit(this.form.developmentId);
  }

  isValid(): boolean {
    const valueValid =
      !this.form.estimatedValue ||
      /^\d{1,16}([.,]\d{1,2})?$/.test(this.form.estimatedValue);
    const probability =
      this.form.probability === '' ? null : Number(this.form.probability);
    return (
      !!this.form.personId &&
      (this.isEditing || (!!this.form.pipelineId && !!this.form.stageId)) &&
      valueValid &&
      (probability === null ||
        (Number.isInteger(probability) &&
          probability >= 0 &&
          probability <= 100))
    );
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    const shared = {
      personId: this.form.personId,
      assignedUserId: this.form.assignedUserId || null,
      developmentId: this.form.developmentId || null,
      unitId: this.form.unitId || null,
      source: this.form.source.trim() || null,
      estimatedValue: this.form.estimatedValue
        ? this.form.estimatedValue.replace(',', '.')
        : null,
      probability:
        this.form.probability === '' ? null : Number(this.form.probability),
      nextContactAt: this.form.nextContactAt
        ? new Date(this.form.nextContactAt).toISOString()
        : null,
      expectedCloseDate: this.form.expectedCloseDate || null,
      notes: this.form.notes.trim() || null,
    } satisfies UpdateOpportunityInput;

    let request: Observable<Opportunity>;
    if (this.opportunity) {
      request = this.crm.updateOpportunity(this.opportunity.id, shared);
    } else {
      const payload: CreateOpportunityInput = {
        personId: shared.personId!,
        pipelineId: this.form.pipelineId,
        stageId: this.form.stageId,
      };
      if (shared.assignedUserId) payload.assignedUserId = shared.assignedUserId;
      if (shared.developmentId) payload.developmentId = shared.developmentId;
      if (shared.unitId) payload.unitId = shared.unitId;
      if (shared.source) payload.source = shared.source;
      if (shared.estimatedValue) payload.estimatedValue = shared.estimatedValue;
      if (shared.probability !== null) payload.probability = shared.probability;
      if (shared.nextContactAt) payload.nextContactAt = shared.nextContactAt;
      if (shared.expectedCloseDate)
        payload.expectedCloseDate = shared.expectedCloseDate;
      if (shared.notes) payload.notes = shared.notes;
      request = this.crm.createOpportunity(payload);
    }

    request.subscribe({
      next: (opportunity) => {
        this.saving.set(false);
        this.saved.emit(opportunity);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(
          extractError(error, 'Não foi possível salvar a oportunidade.'),
        );
      },
    });
  }

  private emptyForm(): OpportunityForm {
    return {
      personId: '',
      pipelineId: '',
      stageId: '',
      assignedUserId: '',
      developmentId: '',
      unitId: '',
      source: '',
      estimatedValue: '',
      probability: '',
      nextContactAt: '',
      expectedCloseDate: '',
      notes: '',
    };
  }

  private toDate(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
