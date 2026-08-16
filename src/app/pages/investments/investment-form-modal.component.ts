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
  CreateInvestmentInput,
  Investment,
  InvestmentType,
  UpdateInvestmentInput,
} from '../../core/models/investment.model';
import { Person } from '../../core/models/person.model';
import { InvestmentService } from '../../core/services/investment.service';
import { CurrencyMaskDirective } from '../../shared/directives/currency-mask.directive';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { INVESTMENT_TYPE_OPTIONS } from '../../shared/utils/investment';
import { extractError } from '../../shared/utils/http-error';

interface InvestmentForm {
  investorId: string;
  amount: number | null;
  date: string;
  type: InvestmentType;
  notes: string;
}

@Component({
  selector: 'app-investment-form-modal',
  standalone: true,
  imports: [
    CurrencyMaskDirective,
    DialogFocusDirective,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './investment-form-modal.component.html',
})
export class InvestmentFormModalComponent implements OnInit {
  private readonly investmentService = inject(InvestmentService);

  @Input() investment: Investment | null = null;
  @Input() investorName = '';
  @Input() investors: Person[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Investment>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('investorInput')
  private investorInput?: ElementRef<HTMLSelectElement>;
  @ViewChild('amountInput') private amountInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dateInput') private dateInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly typeOptions = INVESTMENT_TYPE_OPTIONS;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;

  form: InvestmentForm = this.emptyForm();

  get isEditing(): boolean {
    return this.investment !== null;
  }

  get sortedInvestors(): Person[] {
    return [...this.investors].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  ngOnInit(): void {
    if (!this.investment) return;
    this.form = {
      investorId: this.investment.investorId,
      amount: this.investment.amount,
      date: this.investment.date.slice(0, 10),
      type: this.investment.type,
      notes: this.investment.notes ?? '',
    };
  }

  investorInvalid(): boolean {
    return !this.isEditing && !this.form.investorId;
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
      this.investorInvalid() ||
      this.amountInvalid() ||
      this.dateInvalid()
    ) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const amount = this.form.amount as number;
    const notes = this.form.notes.trim();
    let request: Observable<Investment>;

    if (this.investment) {
      const payload: UpdateInvestmentInput = {};
      if (amount !== this.investment.amount) payload.amount = amount;
      if (this.form.date !== this.investment.date.slice(0, 10)) {
        payload.date = this.form.date;
      }
      if (this.form.type !== this.investment.type) {
        payload.type = this.form.type;
      }
      if (notes !== (this.investment.notes ?? '')) payload.notes = notes;
      request =
        Object.keys(payload).length === 0
          ? of(this.investment)
          : this.investmentService.update(this.investment.id, payload);
    } else {
      const payload: CreateInvestmentInput = {
        investorId: this.form.investorId,
        amount,
        date: this.form.date,
        type: this.form.type,
      };
      if (notes) payload.notes = notes;
      request = this.investmentService.create(payload);
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (investment) => {
        this.saving.set(false);
        this.saved.emit(investment);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível salvar o investimento.'),
        );
      },
    });
  }

  private focusFirstInvalid(): void {
    const target = this.investorInvalid()
      ? this.investorInput
      : this.amountInvalid()
        ? this.amountInput
        : this.dateInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private emptyForm(): InvestmentForm {
    return {
      investorId: '',
      amount: null,
      date: new Date().toISOString().slice(0, 10),
      type: 'FINANCEIRO',
      notes: '',
    };
  }
}
