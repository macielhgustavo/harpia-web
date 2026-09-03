import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Link2,
  LucideAngularModule,
  RefreshCw,
  Search,
  Unlink,
  Upload,
  X,
} from 'lucide-angular';
import { BankAccountListItem } from '../../core/models/bank-account.model';
import {
  BankReconciliationStatus,
  BankStatementEntry,
  BankStatementEntryType,
  ImportStatementInput,
  ReconciliationCandidate,
  ReconciliationListResult,
} from '../../core/models/bank-reconciliation.model';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { AuthorizationService } from '../../core/services/authorization.service';
import { BankAccountService } from '../../core/services/bank-account.service';
import { FinanceService } from '../../core/services/finance.service';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './bank-reconciliation.component.html',
})
export class BankReconciliationComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly accountsService = inject(BankAccountService);
  private readonly authorization = inject(AuthorizationService);

  readonly result = signal<ReconciliationListResult | null>(null);
  readonly accounts = signal<BankAccountListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly importError = signal('');
  readonly selected = signal<BankStatementEntry | null>(null);
  readonly candidates = signal<ReconciliationCandidate[]>([]);
  readonly candidatesLoading = signal(false);
  readonly actionId = signal('');

  search = '';
  status: BankReconciliationStatus | '' = 'PENDENTE';
  bankAccountId = '';
  startDate = '';
  endDate = '';
  page = 1;
  pageSize = 20;
  importBankAccountId = '';
  importText = '';

  readonly SearchIcon = Search;
  readonly RefreshIcon = RefreshCw;
  readonly ImportIcon = Upload;
  readonly MatchIcon = Link2;
  readonly UnmatchIcon = Unlink;
  readonly IgnoreIcon = Ban;
  readonly RestoreIcon = BadgeCheck;
  readonly CloseIcon = X;
  readonly PreviousIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;

  get canWrite(): boolean {
    return this.authorization.hasPermission(APP_PERMISSIONS.FINANCE_WRITE);
  }

  ngOnInit(): void {
    this.accountsService.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        if (accounts.length === 1) this.importBankAccountId = accounts[0].id;
      },
    });
    this.load();
  }

  load(resetPage = false): void {
    if (resetPage) this.page = 1;
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.error.set('A data inicial deve ser anterior à data final.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.finance
      .reconciliation({
        page: this.page,
        pageSize: this.pageSize,
        status: this.status,
        bankAccountId: this.bankAccountId,
        startDate: this.startDate,
        endDate: this.endDate,
        search: this.search.trim(),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(
            extractError(error, 'Não foi possível carregar a conciliação.'),
          );
        },
      });
  }

  clear(): void {
    this.search = '';
    this.status = 'PENDENTE';
    this.bankAccountId = '';
    this.startDate = '';
    this.endDate = '';
    this.load(true);
  }

  changePage(page: number): void {
    const total = this.result()?.pagination.totalPages ?? 1;
    if (page < 1 || page > total || page === this.page) return;
    this.page = page;
    this.load();
  }

  openImport(): void {
    if (!this.canWrite) return;
    this.importError.set('');
    this.importOpen.set(true);
  }

  closeImport(): void {
    if (this.importing()) return;
    this.importOpen.set(false);
    this.importError.set('');
  }

  readFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.importText = String(reader.result ?? ''));
    reader.onerror = () =>
      this.importError.set('Não foi possível ler o arquivo selecionado.');
    reader.readAsText(file, 'UTF-8');
  }

  importStatement(): void {
    if (this.importing()) return;
    this.importError.set('');
    if (!this.importBankAccountId) {
      this.importError.set('Selecione a conta bancária do extrato.');
      return;
    }
    let entries: ImportStatementInput['entries'];
    try {
      entries = this.parseStatement(this.importText);
    } catch (error) {
      this.importError.set(
        error instanceof Error ? error.message : 'Arquivo inválido.',
      );
      return;
    }
    this.importing.set(true);
    this.finance
      .importStatement({
        bankAccountId: this.importBankAccountId,
        entries,
      })
      .subscribe({
        next: (result) => {
          this.importing.set(false);
          this.importOpen.set(false);
          this.importText = '';
          this.feedback.set(
            `${result.imported} lançamento(s) importado(s); ${result.skipped} duplicado(s) ignorado(s).`,
          );
          this.status = 'PENDENTE';
          this.bankAccountId = this.importBankAccountId;
          this.load(true);
        },
        error: (error: unknown) => {
          this.importing.set(false);
          this.importError.set(
            extractError(error, 'Não foi possível importar o extrato.'),
          );
        },
      });
  }

  openMatch(entry: BankStatementEntry): void {
    if (!this.canWrite || entry.status !== 'PENDENTE') return;
    this.selected.set(entry);
    this.candidates.set([]);
    this.candidatesLoading.set(true);
    this.finance.reconciliationCandidates(entry.id).subscribe({
      next: (candidates) => {
        this.candidates.set(candidates);
        this.candidatesLoading.set(false);
      },
      error: (error: unknown) => {
        this.candidatesLoading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível procurar correspondências.'),
        );
      },
    });
  }

  closeMatch(): void {
    if (this.actionId()) return;
    this.selected.set(null);
    this.candidates.set([]);
  }

  match(candidate: ReconciliationCandidate): void {
    const entry = this.selected();
    if (!entry || this.actionId()) return;
    this.actionId.set(entry.id);
    this.finance.matchReconciliation(entry.id, candidate.id).subscribe({
      next: () => {
        this.actionId.set('');
        this.closeMatch();
        this.feedback.set('Lançamento conciliado com sucesso.');
        this.load();
      },
      error: (error: unknown) => {
        this.actionId.set('');
        this.error.set(extractError(error, 'Não foi possível conciliar.'));
      },
    });
  }

  unmatch(entry: BankStatementEntry): void {
    this.runAction(
      entry,
      this.finance.unmatchReconciliation(entry.id),
      'Conciliação desfeita.',
    );
  }

  ignore(entry: BankStatementEntry): void {
    this.runAction(
      entry,
      this.finance.ignoreReconciliation(entry.id),
      'Lançamento marcado para ignorar.',
    );
  }

  restore(entry: BankStatementEntry): void {
    this.runAction(
      entry,
      this.finance.restoreReconciliation(entry.id),
      'Lançamento restaurado para pendentes.',
    );
  }

  formatCurrency(value: string | number): string {
    return formatBrl(Number(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }

  accountLabel(account: BankAccountListItem): string {
    return `${account.bank} · Ag. ${account.agency} · ${account.account}`;
  }

  statusLabel(status: BankReconciliationStatus): string {
    return {
      PENDENTE: 'Pendente',
      CONCILIADO: 'Conciliado',
      IGNORADO: 'Ignorado',
    }[status];
  }

  statusClass(status: BankReconciliationStatus): string {
    return {
      PENDENTE: 'bg-amber-100 text-amber-800',
      CONCILIADO: 'bg-emerald-100 text-emerald-800',
      IGNORADO: 'bg-surface-warm text-muted',
    }[status];
  }

  private runAction(
    entry: BankStatementEntry,
    request: ReturnType<FinanceService['unmatchReconciliation']>,
    message: string,
  ): void {
    if (!this.canWrite || this.actionId()) return;
    this.actionId.set(entry.id);
    this.error.set('');
    request.subscribe({
      next: () => {
        this.actionId.set('');
        this.feedback.set(message);
        this.load();
      },
      error: (error: unknown) => {
        this.actionId.set('');
        this.error.set(
          extractError(error, 'Não foi possível concluir a ação.'),
        );
      },
    });
  }

  private parseStatement(content: string): ImportStatementInput['entries'] {
    const lines = content
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0)
      throw new Error('Cole ou selecione um extrato CSV.');
    const first = this.csvColumns(lines[0]).map((value) =>
      value.toLocaleLowerCase('pt-BR'),
    );
    const hasHeader = first.some((value) =>
      ['data', 'descricao', 'descrição', 'tipo', 'valor'].includes(value),
    );
    const rows = hasHeader ? lines.slice(1) : lines;
    if (rows.length === 0) throw new Error('O extrato não possui lançamentos.');
    if (rows.length > 500)
      throw new Error('Importe no máximo 500 lançamentos por vez.');

    return rows.map((line, index) => {
      const [rawDate, description, rawType, rawAmount, externalId] =
        this.csvColumns(line);
      const lineNumber = index + (hasHeader ? 2 : 1);
      if (!rawDate || !description || !rawAmount) {
        throw new Error(
          `Linha ${lineNumber}: data, descrição e valor são obrigatórios.`,
        );
      }
      const signedAmount = this.money(rawAmount);
      const type = this.entryType(rawType, signedAmount, lineNumber);
      return {
        ...(externalId?.trim() ? { externalId: externalId.trim() } : {}),
        date: this.date(rawDate, lineNumber),
        description: description.trim(),
        type,
        amount: Math.abs(signedAmount).toFixed(2),
      };
    });
  }

  private csvColumns(line: string): string[] {
    const columns: string[] = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (character === ';' && !quoted) {
        columns.push(current.trim());
        current = '';
      } else current += character;
    }
    columns.push(current.trim());
    return columns;
  }

  private money(value: string): number {
    const compact = value.replace(/R\$/gi, '').replace(/\s/g, '');
    const normalized = compact.includes(',')
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact;
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount === 0)
      throw new Error(`Valor inválido: ${value}.`);
    return amount;
  }

  private entryType(
    value: string,
    amount: number,
    line: number,
  ): BankStatementEntryType {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
    if (!normalized) return amount < 0 ? 'DEBITO' : 'CREDITO';
    if (['CREDITO', 'CREDIT', 'C', 'ENTRADA', '+'].includes(normalized))
      return 'CREDITO';
    if (['DEBITO', 'DEBIT', 'D', 'SAIDA', '-'].includes(normalized))
      return 'DEBITO';
    throw new Error(`Linha ${line}: tipo deve ser crédito ou débito.`);
  }

  private date(value: string, line: number): string {
    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    throw new Error(`Linha ${line}: data inválida.`);
  }
}
