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
import { CheckCircle2, LucideAngularModule, Save, X } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  CreateReturnInput,
  Return,
  ReturnListItem,
  UpdateReturnInput,
} from '../../core/models/return.model';
import { ReturnService } from '../../core/services/return.service';
import { CurrencyMaskDirective } from '../../shared/directives/currency-mask.directive';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

export interface ReturnAllocationOption {
  id: string;
  label: string;
}

export type ReturnFormMode = 'create' | 'edit' | 'pay';

interface ReturnForm {
  allocationId: string;
  amount: number | null;
  date: string;
}

@Component({
  selector: 'app-return-form-modal',
  standalone: true,
  imports: [
    CurrencyMaskDirective,
    DialogFocusDirective,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './return-form-modal.component.html',
})
export class ReturnFormModalComponent implements OnInit {
  private readonly returnService = inject(ReturnService);

  @Input() mode: ReturnFormMode = 'create';
  @Input() investmentReturn: ReturnListItem | null = null;
  @Input() allocations: ReturnAllocationOption[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Return>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('allocationInput')
  private allocationInput?: ElementRef<HTMLSelectElement>;
  @ViewChild('amountInput') private amountInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dateInput') private dateInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly PaidIcon = CheckCircle2;

  form: ReturnForm = this.emptyForm();

  get isCreate(): boolean {
    return this.mode === 'create';
  }

  get isPayment(): boolean {
    return this.mode === 'pay';
  }

  get title(): string {
    if (this.isPayment) return 'Marcar retorno como pago';
    return this.isCreate ? 'Programar retorno' : 'Editar retorno';
  }

  ngOnInit(): void {
    if (!this.investmentReturn) return;
    this.form = {
      allocationId: this.investmentReturn.allocationId,
      amount: this.isPayment
        ? (this.investmentReturn.realizedAmount ??
          this.investmentReturn.expectedAmount)
        : this.investmentReturn.expectedAmount,
      date: this.isPayment
        ? new Date().toISOString().slice(0, 10)
        : this.investmentReturn.expectedDate.slice(0, 10),
    };
  }

  allocationInvalid(): boolean {
    return this.isCreate && !this.form.allocationId;
  }

  amountInvalid(): boolean {
    return this.form.amount === null || this.form.amount <= 0;
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
      this.allocationInvalid() ||
      this.amountInvalid() ||
      this.dateInvalid()
    ) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const amount = this.form.amount as number;
    let request: Observable<Return>;
    if (this.isCreate) {
      const payload: CreateReturnInput = {
        allocationId: this.form.allocationId,
        expectedAmount: amount,
        expectedDate: this.form.date,
      };
      request = this.returnService.create(payload);
    } else if (this.isPayment && this.investmentReturn) {
      const payload: UpdateReturnInput = {
        realizedAmount: amount,
        realizedDate: this.form.date,
        status: 'PAGO',
      };
      request = this.returnService.update(this.investmentReturn.id, payload);
    } else if (this.investmentReturn) {
      const payload: UpdateReturnInput = {
        expectedAmount: amount,
        expectedDate: this.form.date,
      };
      request = this.returnService.update(this.investmentReturn.id, payload);
    } else {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (investmentReturn) => {
        this.saving.set(false);
        this.saved.emit(investmentReturn);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível salvar o retorno.'),
        );
      },
    });
  }

  private focusFirstInvalid(): void {
    const target = this.allocationInvalid()
      ? this.allocationInput
      : this.amountInvalid()
        ? this.amountInput
        : this.dateInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private emptyForm(): ReturnForm {
    return {
      allocationId: '',
      amount: null,
      date: new Date().toISOString().slice(0, 10),
    };
  }
}
