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
  BankAccount,
  BankAccountListItem,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../../core/models/bank-account.model';
import { CompanyListItem } from '../../core/models/company.model';
import { BankAccountService } from '../../core/services/bank-account.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

interface BankAccountForm {
  bank: string;
  agency: string;
  account: string;
  companyId: string;
}

@Component({
  selector: 'app-bank-account-form-modal',
  standalone: true,
  imports: [DialogFocusDirective, FormsModule, LucideAngularModule],
  templateUrl: './bank-account-form-modal.component.html',
})
export class BankAccountFormModalComponent implements OnInit {
  private readonly bankAccountService = inject(BankAccountService);

  @Input() bankAccount: BankAccountListItem | null = null;
  @Input() companies: CompanyListItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<BankAccount>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('bankInput') private bankInput?: ElementRef<HTMLInputElement>;
  @ViewChild('agencyInput') private agencyInput?: ElementRef<HTMLInputElement>;
  @ViewChild('accountInput')
  private accountInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  form: BankAccountForm = this.emptyForm();

  get isEditing(): boolean {
    return this.bankAccount !== null;
  }

  get sortedCompanies(): CompanyListItem[] {
    return [...this.companies].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  ngOnInit(): void {
    if (!this.bankAccount) return;
    this.form = {
      bank: this.bankAccount.bank,
      agency: this.bankAccount.agency,
      account: this.bankAccount.account,
      companyId: this.bankAccount.companyId ?? '',
    };
  }

  bankInvalid(): boolean {
    return !this.form.bank.trim();
  }

  agencyInvalid(): boolean {
    return !this.form.agency.trim();
  }

  accountInvalid(): boolean {
    return !this.form.account.trim();
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    if (
      this.saving() ||
      this.bankInvalid() ||
      this.agencyInvalid() ||
      this.accountInvalid()
    ) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const common = {
      bank: this.form.bank.trim(),
      agency: this.form.agency.trim(),
      account: this.form.account.trim(),
    };
    let request: Observable<BankAccount>;
    if (this.bankAccount) {
      const payload: UpdateBankAccountInput = {
        ...common,
        companyId: this.form.companyId || null,
      };
      request = this.bankAccountService.update(this.bankAccount.id, payload);
    } else {
      const payload: CreateBankAccountInput = { ...common };
      if (this.form.companyId) payload.companyId = this.form.companyId;
      request = this.bankAccountService.create(payload);
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (account) => {
        this.saving.set(false);
        this.saved.emit(account);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível salvar a conta bancária.'),
        );
      },
    });
  }

  private focusFirstInvalid(): void {
    const target = this.bankInvalid()
      ? this.bankInput
      : this.agencyInvalid()
        ? this.agencyInput
        : this.accountInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private emptyForm(): BankAccountForm {
    return { bank: '', agency: '', account: '', companyId: '' };
  }
}
