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
import { Observable, of } from 'rxjs';
import {
  CreatePriceTableInput,
  PriceTable,
  UpdatePriceTableInput,
} from '../../core/models/price-table.model';
import { PriceTableService } from '../../core/services/price-table.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

@Component({
  selector: 'app-price-table-form-modal',
  standalone: true,
  imports: [DialogFocusDirective, FormsModule, LucideAngularModule],
  templateUrl: './price-table-form-modal.component.html',
})
export class PriceTableFormModalComponent implements OnInit {
  private readonly priceTableService = inject(PriceTableService);

  @Input() developmentId = '';
  @Input() priceTable: PriceTable | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<PriceTable>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('phaseInput') private phaseInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly CloseIcon = X;
  readonly SaveIcon = Save;

  form = { name: '', phase: '', active: true };

  get isEditing(): boolean {
    return this.priceTable !== null;
  }

  ngOnInit(): void {
    if (this.priceTable) {
      this.form = {
        name: this.priceTable.name,
        phase: this.priceTable.phase,
        active: this.priceTable.active,
      };
    }
  }

  nameInvalid(): boolean {
    return !this.form.name.trim();
  }

  phaseInvalid(): boolean {
    return !this.form.phase.trim();
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    if (this.saving() || this.nameInvalid() || this.phaseInvalid()) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const name = this.form.name.trim();
    const phase = this.form.phase.trim();
    let request: Observable<PriceTable>;

    if (this.priceTable) {
      const payload: UpdatePriceTableInput = {};
      if (name !== this.priceTable.name) payload.name = name;
      if (phase !== this.priceTable.phase) payload.phase = phase;
      if (this.form.active !== this.priceTable.active) {
        payload.active = this.form.active;
      }
      if (Object.keys(payload).length === 0) {
        request = of(this.priceTable);
      } else {
        request = this.priceTableService.update(this.priceTable.id, payload);
      }
    } else {
      const payload: CreatePriceTableInput = {
        developmentId: this.developmentId,
        name,
        phase,
        active: this.form.active,
      };
      request = this.priceTableService.create(payload);
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (priceTable) => {
        this.saving.set(false);
        this.saved.emit(priceTable);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível salvar a tabela de preço.'),
        );
      },
    });
  }

  private focusFirstInvalid(): void {
    const target = this.nameInvalid() ? this.nameInput : this.phaseInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }
}
