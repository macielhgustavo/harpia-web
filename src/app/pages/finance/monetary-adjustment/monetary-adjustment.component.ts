import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../../core/config/rbac.config';
import {
  AdjustmentPeriodicity,
  AdjustmentPreview,
  MonetaryIndex,
  MonetaryIndexInput,
  MonetaryIndexValue,
  MonetaryIndexValueInput,
  ReceivableAdjustment,
  ReceivableAdjustmentPolicy,
  ReceivableAdjustmentPolicyInput,
} from '../../../core/models/monetary-adjustment.model';
import { Receivable } from '../../../core/models/receivable.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { MonetaryAdjustmentService } from '../../../core/services/monetary-adjustment.service';
import { ReceivableService } from '../../../core/services/receivable.service';
import { formatBrl } from '../../../shared/utils/currency';
import { extractError } from '../../../shared/utils/http-error';

type Tab = 'indices' | 'values' | 'policy' | 'adjustments';

const EMPTY_INDEX: MonetaryIndexInput = {
  name: '',
  code: '',
  description: '',
  active: true,
  periodicity: 'MONTHLY',
};

const EMPTY_VALUE: MonetaryIndexValueInput = {
  competence: '',
  percentage: 0,
  source: '',
  publishedAt: '',
};

@Component({
  selector: 'app-monetary-adjustment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './monetary-adjustment.component.html',
})
export class MonetaryAdjustmentComponent implements OnInit {
  private readonly monetary = inject(MonetaryAdjustmentService);
  private readonly receivablesService = inject(ReceivableService);
  private readonly authorization = inject(AuthorizationService);

  readonly indices = signal<MonetaryIndex[]>([]);
  readonly values = signal<MonetaryIndexValue[]>([]);
  readonly receivables = signal<Receivable[]>([]);
  readonly policies = signal<ReceivableAdjustmentPolicy[]>([]);
  readonly adjustments = signal<ReceivableAdjustment[]>([]);
  readonly selectedIndex = signal<MonetaryIndex | null>(null);
  readonly selectedReceivable = signal<Receivable | null>(null);
  readonly previewResult = signal<AdjustmentPreview | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly canWrite = this.authorization.hasPermission(APP_PERMISSIONS.FINANCE_WRITE);
  activeTab: Tab = 'indices';
  editingIndexId: string | null = null;
  editingValueId: string | null = null;
  editingPolicyId: string | null = null;
  indexForm: MonetaryIndexInput = { ...EMPTY_INDEX };
  valueForm: MonetaryIndexValueInput = { ...EMPTY_VALUE };
  policyForm: ReceivableAdjustmentPolicyInput = {
    monetaryIndexId: '',
    baseDate: '',
    periodicity: 'MONTHLY',
    lag: 0,
    active: true,
  };
  period = { startCompetence: '', endCompetence: '' };

  ngOnInit(): void {
    this.loadInitial();
  }

  loadInitial(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      indices: this.monetary.indices(),
      receivables: this.receivablesService.list({ page: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ indices, receivables }) => {
        this.indices.set(indices);
        this.receivables.set(receivables.data);
        this.loading.set(false);
        if (indices.length) this.chooseIndex(indices[0].id);
        if (receivables.data.length) this.chooseReceivable(receivables.data[0].id);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(extractError(error, 'N\u00e3o foi poss\u00edvel carregar a corre\u00e7\u00e3o monet\u00e1ria.'));
      },
    });
  }

  chooseIndex(id: string): void {
    const selected = this.indices().find((item) => item.id === id) ?? null;
    this.selectedIndex.set(selected);
    this.values.set([]);
    if (!selected) return;
    this.monetary.values(selected.id).subscribe({
      next: (values) => this.values.set(values),
      error: (error: unknown) => this.error.set(extractError(error)),
    });
  }

  chooseReceivable(id: string): void {
    const selected = this.receivables().find((item) => item.id === id) ?? null;
    this.selectedReceivable.set(selected);
    this.previewResult.set(null);
    this.policies.set([]);
    this.adjustments.set([]);
    if (!selected) return;
    forkJoin({
      policies: this.monetary.policies(selected.id),
      adjustments: this.monetary.adjustments(selected.id),
    }).subscribe({
      next: ({ policies, adjustments }) => {
        this.policies.set(policies);
        this.adjustments.set(adjustments);
      },
      error: (error: unknown) => this.error.set(extractError(error)),
    });
  }

  editIndex(index: MonetaryIndex): void {
    this.editingIndexId = index.id;
    this.indexForm = {
      name: index.name,
      code: index.code,
      description: index.description ?? '',
      active: index.active,
      periodicity: index.periodicity,
    };
  }

  saveIndex(): void {
    if (!this.indexForm.name.trim() || !this.indexForm.code.trim()) {
      this.error.set('Informe nome e c\u00f3digo do \u00edndice.');
      return;
    }
    this.runSave(
      this.editingIndexId
        ? this.monetary.updateIndex(this.editingIndexId, this.indexForm)
        : this.monetary.createIndex(this.indexForm),
      this.editingIndexId ? '\u00cdndice atualizado.' : '\u00cdndice criado.',
      () => {
        this.editingIndexId = null;
        this.indexForm = { ...EMPTY_INDEX };
        this.reloadIndices();
      },
    );
  }

  toggleIndex(index: MonetaryIndex): void {
    this.runSave(this.monetary.updateIndex(index.id, { active: !index.active }), index.active ? '\u00cdndice desativado.' : '\u00cdndice ativado.', () => this.reloadIndices());
  }

  editValue(value: MonetaryIndexValue): void {
    this.editingValueId = value.id;
    this.valueForm = {
      competence: value.competence.slice(0, 7),
      percentage: Number(value.percentage) * 100,
      source: value.source ?? '',
      publishedAt: value.publishedAt?.slice(0, 10) ?? '',
    };
  }

  saveValue(): void {
    const index = this.selectedIndex();
    if (!index || !this.valueForm.competence) {
      this.error.set('Selecione o \u00edndice e informe a compet\u00eancia.');
      return;
    }
    const input: MonetaryIndexValueInput = {
      ...this.valueForm,
      percentage: Number(this.valueForm.percentage) / 100,
      source: this.valueForm.source || undefined,
      publishedAt: this.valueForm.publishedAt || undefined,
    };
    this.runSave(
      this.editingValueId
        ? this.monetary.updateValue(index.id, this.editingValueId, input)
        : this.monetary.createValue(index.id, input),
      this.editingValueId ? 'Valor atualizado.' : 'Valor inclu\u00eddo.',
      () => {
        this.editingValueId = null;
        this.valueForm = { ...EMPTY_VALUE };
        this.chooseIndex(index.id);
      },
    );
  }

  editPolicy(policy: ReceivableAdjustmentPolicy): void {
    this.editingPolicyId = policy.id;
    this.policyForm = {
      monetaryIndexId: policy.monetaryIndexId,
      baseDate: policy.baseDate.slice(0, 10),
      periodicity: policy.periodicity,
      lag: policy.lag ?? 0,
      active: policy.active,
    };
  }

  savePolicy(): void {
    const receivable = this.selectedReceivable();
    if (!receivable || !this.policyForm.monetaryIndexId || !this.policyForm.baseDate) {
      this.error.set('Selecione o receb\u00edvel, o \u00edndice e a data-base.');
      return;
    }
    this.runSave(
      this.editingPolicyId
        ? this.monetary.updatePolicy(receivable.id, this.editingPolicyId, this.policyForm)
        : this.monetary.createPolicy(receivable.id, this.policyForm),
      this.editingPolicyId ? 'Pol\u00edtica atualizada.' : 'Pol\u00edtica criada.',
      () => {
        this.editingPolicyId = null;
        this.resetPolicyForm();
        this.chooseReceivable(receivable.id);
      },
    );
  }

  deletePolicy(policy: ReceivableAdjustmentPolicy): void {
    const receivable = this.selectedReceivable();
    if (!receivable || !confirm('Excluir esta pol\u00edtica de corre\u00e7\u00e3o?')) return;
    this.runSave(this.monetary.deletePolicy(receivable.id, policy.id), 'Pol\u00edtica exclu\u00edda.', () => this.chooseReceivable(receivable.id));
  }

  preview(): void {
    const receivable = this.selectedReceivable();
    if (!receivable || !this.validPeriod()) return;
    this.saving.set(true);
    this.error.set('');
    this.monetary.preview(receivable.id, this.period).subscribe({
      next: (result) => {
        this.previewResult.set(result);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(extractError(error));
      },
    });
  }

  applyAdjustment(): void {
    const receivable = this.selectedReceivable();
    if (!receivable || !this.previewResult() || !confirm('Aplicar esta corre\u00e7\u00e3o ao receb\u00edvel?')) return;
    this.runSave(this.monetary.apply(receivable.id, this.period), 'Corre\u00e7\u00e3o aplicada e registrada.', () => {
      this.previewResult.set(null);
      this.chooseReceivable(receivable.id);
    });
  }

  cancelEdit(): void {
    this.editingIndexId = null;
    this.editingValueId = null;
    this.editingPolicyId = null;
    this.indexForm = { ...EMPTY_INDEX };
    this.valueForm = { ...EMPTY_VALUE };
    this.resetPolicyForm();
  }

  percentage(value: string): string {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(Number(value));
  }

  money(value: string): string { return formatBrl(Number(value)); }
  month(value: string): string { return value.slice(0, 7); }
  date(value: string | null): string {
    return value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '\u2014';
  }

  setPeriodicity(value: string, target: 'index' | 'policy'): void {
    const periodicity = value as AdjustmentPeriodicity;
    if (target === 'index') this.indexForm.periodicity = periodicity;
    else this.policyForm.periodicity = periodicity;
  }

  private reloadIndices(): void {
    const selectedId = this.selectedIndex()?.id;
    this.monetary.indices().subscribe({
      next: (indices) => {
        this.indices.set(indices);
        this.chooseIndex(selectedId && indices.some((item) => item.id === selectedId) ? selectedId : indices[0]?.id ?? '');
      },
      error: (error: unknown) => this.error.set(extractError(error)),
    });
  }

  private validPeriod(): boolean {
    if (!this.period.startCompetence || !this.period.endCompetence) {
      this.error.set('Informe as compet\u00eancias inicial e final.');
      return false;
    }
    if (this.period.startCompetence > this.period.endCompetence) {
      this.error.set('A compet\u00eancia inicial deve ser anterior \u00e0 final.');
      return false;
    }
    return true;
  }

  private resetPolicyForm(): void {
    this.policyForm = {
      monetaryIndexId: this.selectedIndex()?.id ?? '',
      baseDate: '',
      periodicity: 'MONTHLY',
      lag: 0,
      active: true,
    };
  }

  private runSave<T>(request: import('rxjs').Observable<T>, message: string, done: () => void): void {
    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set(message);
        done();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(extractError(error));
      },
    });
  }
}
