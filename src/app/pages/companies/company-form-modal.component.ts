import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Save, X } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  Company,
  CompanyType,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../../core/models/company.model';
import { CompanyService } from '../../core/services/company.service';
import {
  cnpjDigits,
  formatCnpjInput,
  isCnpjComplete,
} from '../../shared/utils/cnpj';
import { extractError } from '../../shared/utils/http-error';

interface CompanyForm {
  name: string;
  cnpj: string;
  type: CompanyType;
  notes: string;
}

@Component({
  selector: 'app-company-form-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './company-form-modal.component.html',
})
export class CompanyFormModalComponent implements OnInit {
  private readonly companyService = inject(CompanyService);

  @Input() company: Company | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Company>();

  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal(false);

  readonly XIcon = X;
  readonly SaveIcon = Save;

  form: CompanyForm = this.emptyForm();

  get isEditing(): boolean {
    return !!this.company;
  }

  ngOnInit(): void {
    if (this.company) {
      this.form = {
        name: this.company.name,
        cnpj: formatCnpjInput(this.company.cnpj),
        type: this.company.type,
        notes: this.company.notes ?? '',
      };
    }
  }

  onCnpjChange(value: string): void {
    this.form.cnpj = formatCnpjInput(value);
  }

  nameInvalid(): boolean {
    return !this.form.name.trim();
  }

  cnpjInvalid(): boolean {
    return !isCnpjComplete(this.form.cnpj);
  }

  isValid(): boolean {
    return !this.nameInvalid() && !this.cnpjInvalid() && !!this.form.type;
  }

  requestClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  save(): void {
    this.submitted.set(true);
    if (!this.isValid() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const basePayload = {
      name: this.form.name.trim(),
      cnpj: cnpjDigits(this.form.cnpj),
      type: this.form.type,
    };

    let request: Observable<Company>;
    if (this.company) {
      const payload: UpdateCompanyInput = {
        ...basePayload,
        notes: this.form.notes.trim() || null,
      };
      request = this.companyService.update(this.company.id, payload);
    } else {
      const payload: CreateCompanyInput = { ...basePayload };
      if (this.form.notes.trim()) {
        payload.notes = this.form.notes.trim();
      }
      request = this.companyService.create(payload);
    }

    request.subscribe({
      next: (company) => {
        this.saving.set(false);
        this.saved.emit(company);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(extractError(err, 'Não foi possível salvar a empresa. Verifique os dados.'));
      },
    });
  }

  private emptyForm(): CompanyForm {
    return {
      name: '',
      cnpj: '',
      type: 'SPE',
      notes: '',
    };
  }
}
