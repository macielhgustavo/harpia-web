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
import { LucideAngularModule, Save, X } from 'lucide-angular';
import { Observable } from 'rxjs';
import { CompanyListItem } from '../../core/models/company.model';
import {
  CreateDevelopmentInput,
  Development,
  DevelopmentStatus,
  DevelopmentType,
  UpdateDevelopmentInput,
} from '../../core/models/development.model';
import { DevelopmentService } from '../../core/services/development.service';
import {
  DEVELOPMENT_STATUS_OPTIONS,
  DEVELOPMENT_TYPE_OPTIONS,
  toDateInput,
} from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';

interface DevelopmentForm {
  name: string;
  description: string;
  type: DevelopmentType;
  companyId: string;
  address: string;
  city: string;
  status: DevelopmentStatus;
  expectedLaunchDate: string;
  expectedDeliveryDate: string;
}

@Component({
  selector: 'app-development-form-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './development-form-modal.component.html',
})
export class DevelopmentFormModalComponent implements OnInit {
  private readonly developmentService = inject(DevelopmentService);

  @Input() development: Development | null = null;
  @Input() companies: CompanyListItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Development>();

  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal(false);

  readonly statusOptions = DEVELOPMENT_STATUS_OPTIONS;
  readonly typeOptions = DEVELOPMENT_TYPE_OPTIONS;
  readonly XIcon = X;
  readonly SaveIcon = Save;

  form: DevelopmentForm = this.emptyForm();

  get isEditing(): boolean {
    return !!this.development;
  }

  get sortedCompanies(): CompanyListItem[] {
    return [...this.companies].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'SPE' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }

  ngOnInit(): void {
    if (!this.development) return;
    this.form = {
      name: this.development.name,
      description: this.development.description ?? '',
      type: this.development.type,
      companyId: this.development.companyId ?? '',
      address: this.development.address ?? '',
      city: this.development.city ?? '',
      status: this.development.status,
      expectedLaunchDate: toDateInput(this.development.expectedLaunchDate),
      expectedDeliveryDate: toDateInput(this.development.expectedDeliveryDate),
    };
  }

  nameInvalid(): boolean {
    return !this.form.name.trim();
  }

  datesInvalid(): boolean {
    return !!(
      this.form.expectedLaunchDate &&
      this.form.expectedDeliveryDate &&
      this.form.expectedDeliveryDate < this.form.expectedLaunchDate
    );
  }

  isValid(): boolean {
    return (
      !!this.form.name.trim() &&
      !!this.form.type &&
      !!this.form.status &&
      !this.datesInvalid()
    );
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  companyLabel(company: CompanyListItem): string {
    return `${company.name} — ${company.type === 'SPE' ? 'SPE' : 'Incorporadora'}`;
  }

  save(): void {
    this.submitted.set(true);
    if (!this.isValid() || this.saving()) return;

    this.saving.set(true);
    this.error.set('');

    const basePayload = {
      name: this.form.name.trim(),
      type: this.form.type,
      status: this.form.status,
    };

    let request: Observable<Development>;
    if (this.development) {
      const payload: UpdateDevelopmentInput = {
        ...basePayload,
        description: this.form.description.trim() || null,
        companyId: this.form.companyId || null,
        address: this.form.address.trim() || null,
        city: this.form.city.trim() || null,
        expectedLaunchDate: this.form.expectedLaunchDate || null,
        expectedDeliveryDate: this.form.expectedDeliveryDate || null,
      };
      request = this.developmentService.update(this.development.id, payload);
    } else {
      const payload: CreateDevelopmentInput = { ...basePayload };
      if (this.form.description.trim())
        payload.description = this.form.description.trim();
      if (this.form.companyId) payload.companyId = this.form.companyId;
      if (this.form.address.trim()) payload.address = this.form.address.trim();
      if (this.form.city.trim()) payload.city = this.form.city.trim();
      if (this.form.expectedLaunchDate)
        payload.expectedLaunchDate = this.form.expectedLaunchDate;
      if (this.form.expectedDeliveryDate)
        payload.expectedDeliveryDate = this.form.expectedDeliveryDate;
      request = this.developmentService.create(payload);
    }

    request.subscribe({
      next: (development) => {
        this.saving.set(false);
        this.saved.emit(development);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          extractError(
            err,
            'Não foi possível salvar o empreendimento. Verifique os dados.',
          ),
        );
      },
    });
  }

  private emptyForm(): DevelopmentForm {
    return {
      name: '',
      description: '',
      type: 'PREDIO',
      companyId: '',
      address: '',
      city: '',
      status: 'EM_CAPTACAO',
      expectedLaunchDate: '',
      expectedDeliveryDate: '',
    };
  }
}
