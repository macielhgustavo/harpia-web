import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Building2,
  CreditCard,
  Landmark,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  BankAccount,
  BankAccountListItem,
} from '../../core/models/bank-account.model';
import { CompanyListItem } from '../../core/models/company.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { BankAccountService } from '../../core/services/bank-account.service';
import { CompanyService } from '../../core/services/company.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';
import { BankAccountFormModalComponent } from './bank-account-form-modal.component';

@Component({
  selector: 'app-bank-accounts',
  standalone: true,
  imports: [
    BankAccountFormModalComponent,
    DialogFocusDirective,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './bank-accounts.component.html',
})
export class BankAccountsComponent implements OnInit {
  private readonly bankAccountService = inject(BankAccountService);
  private readonly companyService = inject(CompanyService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;
  private companyLoadSequence = 0;

  readonly accounts = signal<BankAccountListItem[]>([]);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly companiesLoading = signal(true);
  readonly companiesError = signal('');
  readonly feedback = signal('');
  readonly search = signal('');
  readonly companyFilter = signal('');
  readonly formOpen = signal(false);
  readonly selectedAccount = signal<BankAccountListItem | null>(null);
  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.BANK_ACCOUNTS_WRITE,
  );

  readonly AddIcon = Plus;
  readonly AccountIcon = CreditCard;
  readonly BankIcon = Landmark;
  readonly CompanyIcon = Building2;
  readonly UnlinkedIcon = Unlink;
  readonly SearchIcon = Search;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly RetryIcon = RefreshCw;
  readonly CloseIcon = X;

  readonly filterCompanies = computed(() => {
    const map = new Map<string, string>();
    for (const item of this.accounts()) {
      if (item.company) map.set(item.company.id, item.company.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  readonly filteredAccounts = computed(() => {
    const query = this.normalize(this.search());
    return this.accounts().filter((item) => {
      const companyFilter = this.companyFilter();
      if (companyFilter === 'UNLINKED' && item.companyId) return false;
      if (
        companyFilter &&
        companyFilter !== 'UNLINKED' &&
        item.companyId !== companyFilter
      ) {
        return false;
      }
      return (
        !query ||
        this.normalize(item.bank).includes(query) ||
        this.normalize(item.agency).includes(query) ||
        this.normalize(item.account).includes(query) ||
        this.normalize(item.company?.name ?? 'caixa geral').includes(query)
      );
    });
  });

  readonly linkedCompaniesCount = computed(
    () =>
      new Set(
        this.accounts()
          .map((item) => item.companyId)
          .filter((id): id is string => !!id),
      ).size,
  );
  readonly unlinkedCount = computed(
    () => this.accounts().filter((item) => !item.companyId).length,
  );

  ngOnInit(): void {
    this.loadAccounts();
    if (this.canWrite) this.loadCompanies();
    else this.companiesLoading.set(false);
  }

  loadAccounts(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.bankAccountService.list().subscribe({
      next: (accounts) => {
        if (sequence !== this.loadSequence) return;
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar as contas bancárias.'),
        );
      },
    });
  }

  loadCompanies(): void {
    if (!this.canWrite) return;
    const sequence = ++this.companyLoadSequence;
    this.companiesLoading.set(true);
    this.companiesError.set('');
    this.companyService.list().subscribe({
      next: (companies) => {
        if (sequence !== this.companyLoadSequence) return;
        this.companies.set(companies);
        this.companiesLoading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.companyLoadSequence) return;
        this.companiesLoading.set(false);
        this.companiesError.set(
          extractError(error, 'Não foi possível carregar as empresas.'),
        );
      },
    });
  }

  resetFilters(): void {
    this.search.set('');
    this.companyFilter.set('');
  }

  openCreate(): void {
    if (!this.canWrite || this.companiesLoading() || !!this.companiesError()) {
      return;
    }
    this.selectedAccount.set(null);
    this.formOpen.set(true);
  }

  openEdit(account: BankAccountListItem): void {
    if (!this.canWrite || this.companiesLoading() || !!this.companiesError()) {
      return;
    }
    this.selectedAccount.set(account);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.selectedAccount.set(null);
  }

  onSaved(_: BankAccount): void {
    const editing = !!this.selectedAccount();
    this.closeForm();
    this.feedback.set(
      editing
        ? 'Conta bancária atualizada com sucesso.'
        : 'Conta bancária criada com sucesso.',
    );
    this.loadAccounts();
  }

  onStale(): void {
    this.closeForm();
    this.feedback.set('A conta não existe mais. A lista será atualizada.');
    this.loadAccounts();
  }

  requestDelete(account: BankAccountListItem): void {
    if (!this.canWrite) return;
    this.selectedAccount.set(account);
    this.deleteError.set('');
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteOpen.set(false);
    this.selectedAccount.set(null);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    const account = this.selectedAccount();
    if (!this.canWrite || !account || this.deleting()) return;
    this.deleting.set(true);
    this.bankAccountService.remove(account.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.selectedAccount.set(null);
        this.feedback.set('Conta bancária excluída com sucesso.');
        this.loadAccounts();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.deleteOpen.set(false);
          this.selectedAccount.set(null);
          this.feedback.set(
            'A conta não existe mais. A lista será atualizada.',
          );
          this.loadAccounts();
          return;
        }
        this.deleteError.set(
          extractError(error, 'Não foi possível excluir a conta bancária.'),
        );
      },
    });
  }

  companyLabel(account: BankAccountListItem): string {
    return account.company?.name ?? 'Caixa geral da organização';
  }

  companyTypeLabel(account: BankAccountListItem): string {
    if (!account.company) return 'Sem empresa vinculada';
    return account.company.type === 'SPE' ? 'SPE' : 'Incorporadora';
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }
}
