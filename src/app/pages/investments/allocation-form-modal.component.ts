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
  AllocationDetail,
  AllocationWithDevelopment,
  CreateAllocationInput,
  UpdateAllocationInput,
} from '../../core/models/allocation.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { AllocationService } from '../../core/services/allocation.service';
import { CurrencyMaskDirective } from '../../shared/directives/currency-mask.directive';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

interface AllocationForm {
  developmentId: string;
  amount: number | null;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-allocation-form-modal',
  standalone: true,
  imports: [
    CurrencyMaskDirective,
    DialogFocusDirective,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './allocation-form-modal.component.html',
})
export class AllocationFormModalComponent implements OnInit {
  private readonly allocationService = inject(AllocationService);

  @Input() investmentId = '';
  @Input() investmentAmount = 0;
  @Input() allocatedAmount = 0;
  @Input() allocation: AllocationDetail | null = null;
  @Input() developments: DevelopmentListItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<AllocationWithDevelopment>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('destinationInput')
  private destinationInput?: ElementRef<HTMLSelectElement>;
  @ViewChild('amountInput') private amountInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dateInput') private dateInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly formatCurrency = formatBrl;

  form: AllocationForm = this.emptyForm();

  get isEditing(): boolean {
    return this.allocation !== null;
  }

  get sortedDevelopments(): DevelopmentListItem[] {
    return [...this.developments].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  get availableForForm(): number {
    return Math.max(
      0,
      this.investmentAmount -
        this.allocatedAmount +
        (this.allocation?.amount ?? 0),
    );
  }

  ngOnInit(): void {
    if (!this.allocation) return;
    this.form = {
      developmentId: this.allocation.developmentId ?? '',
      amount: this.allocation.amount,
      date: this.allocation.date.slice(0, 10),
      notes: this.allocation.notes ?? '',
    };
  }

  amountInvalid(): boolean {
    return (
      this.form.amount === null ||
      this.form.amount <= 0 ||
      this.form.amount > this.availableForForm
    );
  }

  dateInvalid(): boolean {
    return !this.form.date;
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    if (
      this.saving() ||
      !this.investmentId ||
      this.amountInvalid() ||
      this.dateInvalid()
    ) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const amount = this.form.amount as number;
    const notes = this.form.notes.trim();
    let request: Observable<AllocationWithDevelopment>;

    if (this.allocation) {
      const payload: UpdateAllocationInput = {};
      const previousDestination = this.allocation.developmentId ?? '';
      if (this.form.developmentId !== previousDestination) {
        payload.developmentId = this.form.developmentId || null;
      }
      if (amount !== this.allocation.amount) payload.amount = amount;
      if (this.form.date !== this.allocation.date.slice(0, 10)) {
        payload.date = this.form.date;
      }
      if (notes !== (this.allocation.notes ?? '')) payload.notes = notes;
      request =
        Object.keys(payload).length === 0
          ? of(this.allocation)
          : this.allocationService.update(this.allocation.id, payload);
    } else {
      const payload: CreateAllocationInput = {
        investmentId: this.investmentId,
        amount,
        date: this.form.date,
      };
      if (this.form.developmentId) {
        payload.developmentId = this.form.developmentId;
      }
      if (notes) payload.notes = notes;
      request = this.allocationService.create(payload);
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (allocation) => {
        this.saving.set(false);
        this.saved.emit(allocation);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível salvar a alocação.'),
        );
      },
    });
  }

  private focusFirstInvalid(): void {
    const target = this.amountInvalid()
      ? this.amountInput
      : this.dateInvalid()
        ? this.dateInput
        : this.destinationInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private emptyForm(): AllocationForm {
    return {
      developmentId: '',
      amount: null,
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    };
  }
}
