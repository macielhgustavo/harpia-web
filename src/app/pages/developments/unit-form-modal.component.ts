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
  CreateUnitInput,
  Unit,
  UnitCategory,
  UnitStatus,
  UpdateUnitInput,
} from '../../core/models/unit.model';
import { UnitType } from '../../core/models/unit-type.model';
import { UnitService } from '../../core/services/unit.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import {
  UNIT_CATEGORY_OPTIONS,
  UNIT_STATUS_OPTIONS,
} from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';

interface UnitForm {
  identifier: string;
  grouping: string;
  category: UnitCategory;
  unitTypeId: string;
  builtArea: string;
  landArea: string;
  parkingSpots: string;
  status: UnitStatus;
  notes: string;
}

@Component({
  selector: 'app-unit-form-modal',
  standalone: true,
  imports: [DialogFocusDirective, FormsModule, LucideAngularModule],
  templateUrl: './unit-form-modal.component.html',
})
export class UnitFormModalComponent implements OnInit {
  private readonly unitService = inject(UnitService);

  @Input({ required: true }) developmentId = '';
  @Input() unitTypes: UnitType[] = [];
  @Input() unit: Unit | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Unit>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('identifierInput')
  private identifierInput?: ElementRef<HTMLInputElement>;
  @ViewChild('builtAreaInput')
  private builtAreaInput?: ElementRef<HTMLInputElement>;
  @ViewChild('landAreaInput')
  private landAreaInput?: ElementRef<HTMLInputElement>;
  @ViewChild('parkingSpotsInput')
  private parkingSpotsInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly categoryOptions = UNIT_CATEGORY_OPTIONS;
  readonly statusOptions = UNIT_STATUS_OPTIONS;
  readonly identifierMaxLength = 120;

  form: UnitForm = this.emptyForm();

  get isEditing(): boolean {
    return this.unit !== null;
  }

  ngOnInit(): void {
    if (!this.unit) return;
    this.form = {
      identifier: this.unit.identifier,
      grouping: this.unit.grouping ?? '',
      category: this.unit.category,
      unitTypeId: this.unit.unitTypeId ?? '',
      builtArea: this.toFormValue(this.unit.builtArea),
      landArea: this.toFormValue(this.unit.landArea),
      parkingSpots: this.toFormValue(this.unit.parkingSpots),
      status: this.unit.status,
      notes: this.unit.notes ?? '',
    };
  }

  identifierInvalid(): boolean {
    const value = this.form.identifier.trim();
    return !value || value.length > this.identifierMaxLength;
  }

  builtAreaInvalid(): boolean {
    return this.optionalNumberInvalid(this.form.builtArea, false);
  }

  landAreaInvalid(): boolean {
    return this.optionalNumberInvalid(this.form.landArea, false);
  }

  parkingSpotsInvalid(): boolean {
    return this.optionalNumberInvalid(this.form.parkingSpots, true);
  }

  isValid(): boolean {
    return (
      !!this.developmentId &&
      !this.identifierInvalid() &&
      !this.builtAreaInvalid() &&
      !this.landAreaInvalid() &&
      !this.parkingSpotsInvalid()
    );
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    if (!this.isValid() || this.saving()) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const builtArea = this.parseOptionalNumber(this.form.builtArea);
    const landArea = this.parseOptionalNumber(this.form.landArea);
    const parkingSpots = this.parseOptionalNumber(this.form.parkingSpots);
    let request: Observable<Unit>;

    if (this.unit) {
      const payload = this.buildUpdatePayload(
        this.unit,
        builtArea,
        landArea,
        parkingSpots,
      );
      if (Object.keys(payload).length === 0) {
        this.closed.emit();
        return;
      }
      request = this.unitService.update(this.unit.id, payload);
    } else {
      const payload: CreateUnitInput = {
        developmentId: this.developmentId,
        identifier: this.form.identifier.trim(),
        category: this.form.category,
        status: this.form.status,
      };
      const grouping = this.form.grouping.trim();
      const notes = this.form.notes.trim();
      if (this.form.unitTypeId) payload.unitTypeId = this.form.unitTypeId;
      if (grouping) payload.grouping = grouping;
      if (builtArea !== null) payload.builtArea = builtArea;
      if (landArea !== null) payload.landArea = landArea;
      if (parkingSpots !== null) payload.parkingSpots = parkingSpots;
      if (notes) payload.notes = notes;
      request = this.unitService.create(payload);
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (unit) => {
        this.saving.set(false);
        this.saved.emit(unit);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(
            error,
            'Não foi possível salvar a unidade. Verifique os dados.',
          ),
        );
      },
    });
  }

  private buildUpdatePayload(
    unit: Unit,
    builtArea: number | null,
    landArea: number | null,
    parkingSpots: number | null,
  ): UpdateUnitInput {
    const payload: UpdateUnitInput = {};
    const identifier = this.form.identifier.trim();
    const grouping = this.form.grouping.trim() || null;
    const unitTypeId = this.form.unitTypeId || null;
    const notes = this.form.notes.trim() || null;

    if (identifier !== unit.identifier) payload.identifier = identifier;
    if (grouping !== unit.grouping) payload.grouping = grouping;
    if (unitTypeId !== unit.unitTypeId) payload.unitTypeId = unitTypeId;
    if (this.form.category !== unit.category) {
      payload.category = this.form.category;
    }
    if (builtArea !== unit.builtArea) payload.builtArea = builtArea;
    if (landArea !== unit.landArea) payload.landArea = landArea;
    if (parkingSpots !== unit.parkingSpots) {
      payload.parkingSpots = parkingSpots;
    }
    if (this.form.status !== unit.status) payload.status = this.form.status;
    if (notes !== unit.notes) payload.notes = notes;
    return payload;
  }

  private focusFirstInvalid(): void {
    const target = this.identifierInvalid()
      ? this.identifierInput
      : this.builtAreaInvalid()
        ? this.builtAreaInput
        : this.landAreaInvalid()
          ? this.landAreaInput
          : this.parkingSpotsInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private optionalNumberInvalid(value: string, integerOnly: boolean): boolean {
    if (!value.trim()) return false;
    const parsed = this.parseOptionalNumber(value);
    return (
      parsed === null ||
      parsed < 0 ||
      (integerOnly && !Number.isInteger(parsed))
    );
  }

  private parseOptionalNumber(value: string): number | null {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toFormValue(value: number | null): string {
    return value === null ? '' : String(value);
  }

  private emptyForm(): UnitForm {
    return {
      identifier: '',
      grouping: '',
      category: 'APARTAMENTO',
      unitTypeId: '',
      builtArea: '',
      landArea: '',
      parkingSpots: '',
      status: 'DISPONIVEL',
      notes: '',
    };
  }
}
