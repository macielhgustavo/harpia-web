import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CircleAlert,
  MailCheck,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  CollectionDispatch,
  CollectionDispatchPage,
  CollectionDispatchStatus,
  CollectionRule,
  CollectionRuleInput,
} from '../../core/models/collection.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CollectionService } from '../../core/services/collection.service';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_FORM: CollectionRuleInput = {
  name: '',
  daysOffset: 0,
  subject: '',
  message: '',
  active: false,
};

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './collections.component.html',
})
export class CollectionsComponent implements OnInit {
  private readonly collections = inject(CollectionService);
  private readonly authorization = inject(AuthorizationService);
  readonly rules = signal<CollectionRule[]>([]);
  readonly page = signal<CollectionDispatchPage | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly processing = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly actingId = signal<string | null>(null);
  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.FINANCE_WRITE,
  );
  filterStatus: CollectionDispatchStatus | '' = '';
  filterRuleId = '';
  search = '';
  currentPage = 1;
  form: CollectionRuleInput = { ...EMPTY_FORM };

  readonly AddIcon = Plus;
  readonly EditIcon = Pencil;
  readonly RunIcon = Play;
  readonly RetryIcon = RefreshCw;
  readonly ResendIcon = RotateCcw;
  readonly CloseIcon = X;
  readonly MailIcon = MailCheck;
  readonly AlertIcon = CircleAlert;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      rules: this.collections.rules(),
      page: this.collections.dispatches({
        page: this.currentPage,
        pageSize: 20,
        status: this.filterStatus,
        ruleId: this.filterRuleId,
        search: this.search.trim(),
      }),
    }).subscribe({
      next: ({ rules, page }) => {
        this.rules.set(rules);
        this.page.set(page);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar as cobranças.'),
        );
      },
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > (this.page()?.pagination.totalPages || 1)) return;
    this.currentPage = page;
    this.load();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = { ...EMPTY_FORM };
    this.modalOpen.set(true);
  }

  openEdit(rule: CollectionRule): void {
    this.editingId.set(rule.id);
    this.form = {
      name: rule.name,
      daysOffset: rule.daysOffset,
      subject: rule.subject,
      message: rule.message,
      active: rule.active,
    };
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  saveRule(): void {
    if (
      !this.form.name.trim() ||
      !this.form.subject.trim() ||
      !this.form.message.trim()
    ) {
      this.error.set('Preencha nome, assunto e mensagem da régua.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const id = this.editingId();
    const request = id
      ? this.collections.updateRule(id, this.form)
      : this.collections.createRule(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.notice.set(id ? 'Régua atualizada.' : 'Régua criada.');
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(extractError(error));
      },
    });
  }

  toggleRule(rule: CollectionRule): void {
    if (!this.canWrite || this.actingId()) return;
    this.actingId.set(rule.id);
    this.collections.updateRule(rule.id, { active: !rule.active }).subscribe({
      next: () => {
        this.actingId.set(null);
        this.notice.set(
          rule.active ? 'Régua pausada.' : 'Régua ativada com segurança.',
        );
        this.load();
      },
      error: (error: unknown) => {
        this.actingId.set(null);
        this.error.set(extractError(error));
      },
    });
  }

  runNow(): void {
    if (!this.canWrite || this.processing()) return;
    this.processing.set(true);
    this.error.set('');
    this.collections.run().subscribe({
      next: (result) => {
        this.processing.set(false);
        this.notice.set(
          `${result.generated} cobrança(s) gerada(s), ${result.sent} enviada(s) e ${result.failed} com falha.`,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.processing.set(false);
        this.error.set(extractError(error, 'Falha ao processar as cobranças.'));
      },
    });
  }

  retry(dispatch: CollectionDispatch): void {
    this.actOnDispatch(dispatch.id, 'retry');
  }

  cancel(dispatch: CollectionDispatch): void {
    this.actOnDispatch(dispatch.id, 'cancel');
  }

  private actOnDispatch(id: string, action: 'retry' | 'cancel'): void {
    if (!this.canWrite || this.actingId()) return;
    this.actingId.set(id);
    const request =
      action === 'retry'
        ? this.collections.retry(id)
        : this.collections.cancel(id);
    request.subscribe({
      next: () => {
        this.actingId.set(null);
        this.notice.set(
          action === 'retry'
            ? 'Nova tentativa concluída.'
            : 'Cobrança cancelada.',
        );
        this.load();
      },
      error: (error: unknown) => {
        this.actingId.set(null);
        this.error.set(extractError(error));
      },
    });
  }

  offsetLabel(days: number): string {
    if (days === 0) return 'No vencimento';
    if (days < 0) return `${Math.abs(days)} dia(s) antes`;
    return `${days} dia(s) depois`;
  }

  statusLabel(status: CollectionDispatchStatus): string {
    return {
      PENDENTE: 'Pendente',
      ENVIANDO: 'Enviando',
      ENVIADO: 'Enviado',
      FALHOU: 'Falhou',
      CANCELADO: 'Cancelado',
    }[status];
  }

  statusClass(status: CollectionDispatchStatus): string {
    return {
      PENDENTE: 'bg-amber-100 text-amber-800',
      ENVIANDO: 'bg-blue-100 text-blue-800',
      ENVIADO: 'bg-emerald-100 text-emerald-800',
      FALHOU: 'bg-red-100 text-red-800',
      CANCELADO: 'bg-slate-100 text-slate-700',
    }[status];
  }

  money(value: string): string {
    return formatBrl(Number(value));
  }

  date(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
    }).format(new Date(value));
  }
}
