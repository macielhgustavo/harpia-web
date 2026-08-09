import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Save, X } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  CreateUnitTypeInput,
  UnitType,
  UpdateUnitTypeInput,
} from '../../core/models/unit-type.model';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

interface UnitTypeForm {
  name: string;
  bedrooms: string;
  suites: string;
  standardArea: string;
}

@Component({
  selector: 'app-unit-type-form-modal',
  standalone: true,
  imports: [DialogFocusDirective, FormsModule, LucideAngularModule],
  templateUrl: './unit-type-form-modal.component.html',
})
export class UnitTypeFormModalComponent implements OnInit {
  private readonly unitTypeService = inject(UnitTypeService);

  @Input() developmentId = '';
  @Input() unitType: UnitType | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<UnitType>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('bedroomsInput')
  private bedroomsInput?: ElementRef<HTMLInputElement>;
  @ViewChild('suitesInput')
  private suitesInput?: ElementRef<HTMLInputElement>;
  @ViewChild('standardAreaInput')
  private standardAreaInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal(false);

  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly nameMaxLength = 120;

  form: UnitTypeForm = this.emptyForm();

  get isEditing(): boolean {
    return this.unitType !== null;
  }

  ngOnInit(): void {
    if (!this.unitType) {
      return;
    }

    this.form = {
      name: this.unitType.name,
      bedrooms: this.toFormValue(this.unitType.bedrooms),
      suites: this.toFormValue(this.unitType.suites),
      standardArea: this.toFormValue(this.unitType.standardArea),
    };
  }

  nameInvalid(): boolean {
    const name = this.form.name.trim();
    return !name || name.length > this.nameMaxLength;
  }

  bedroomsInvalid(): boolean {
    return this.optionalNumberInvalid(this.form.bedrooms, true);
  }

  suitesInvalid(): boolean {
    return this.optionalNumberInvalid(this.form.suites, true);
  }

  standardAreaInvalid(): boolean {
    return this.optionalNumberInvalid(this.form.standardArea, false);
  }

  isValid(): boolean {
    return (
      !this.nameInvalid() &&
      !this.bedroomsInvalid() &&
      !this.suitesInvalid() &&
      !this.standardAreaInvalid() &&
      (this.isEditing || !!this.developmentId)
    );
  }

  requestClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  save(): void {
    this.submitted.set(true);
    if (!this.isValid() || this.saving()) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const bedrooms = this.parseOptionalNumber(this.form.bedrooms);
    const suites = this.parseOptionalNumber(this.form.suites);
    const standardArea = this.parseOptionalNumber(this.form.standardArea);
    let request: Observable<UnitType>;

    if (this.unitType) {
      const payload: UpdateUnitTypeInput = { name: this.form.name.trim() };
      this.setUpdateNumber(
        payload,
        'bedrooms',
        bedrooms,
        this.unitType.bedrooms,
      );
      this.setUpdateNumber(payload, 'suites', suites, this.unitType.suites);
      this.setUpdateNumber(
        payload,
        'standardArea',
        standardArea,
        this.unitType.standardArea,
      );
      request = this.unitTypeService.update(this.unitType.id, payload);
    } else {
      const payload: CreateUnitTypeInput = {
        developmentId: this.developmentId,
        name: this.form.name.trim(),
      };
      if (bedrooms !== null) {
        payload.bedrooms = bedrooms;
      }
      if (suites !== null) {
        payload.suites = suites;
      }
      if (standardArea !== null) {
        payload.standardArea = standardArea;
      }
      request = this.unitTypeService.create(payload);
    }

    request.subscribe({
      next: (unitType) => {
        this.saving.set(false);
        this.saved.emit(unitType);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if ((err as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(
            err,
            'Não foi possível salvar a tipologia. Verifique os dados.',
          ),
        );
      },
    });
  }

  private emptyForm(): UnitTypeForm {
    return {
      name: '',
      bedrooms: '',
      suites: '',
      standardArea: '',
    };
  }

  private focusFirstInvalid(): void {
    const target = this.nameInvalid()
      ? this.nameInput
      : this.bedroomsInvalid()
        ? this.bedroomsInput
        : this.suitesInvalid()
          ? this.suitesInput
          : this.standardAreaInvalid()
            ? this.standardAreaInput
            : this.nameInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private optionalNumberInvalid(value: string, integerOnly: boolean): boolean {
    if (!value.trim()) {
      return false;
    }

    const parsed = this.parseOptionalNumber(value);
    return (
      parsed === null ||
      parsed < 0 ||
      (integerOnly && !Number.isInteger(parsed))
    );
  }

  private parseOptionalNumber(value: string): number | null {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private setUpdateNumber(
    payload: UpdateUnitTypeInput,
    field: 'bedrooms' | 'suites' | 'standardArea',
    value: number | null,
    previousValue: number | null,
  ): void {
    if (value !== null) {
      payload[field] = value;
    } else if (previousValue !== null) {
      payload[field] = null;
    }
  }

  private toFormValue(value: number | null): string {
    return value === null ? '' : String(value);
  }
}
