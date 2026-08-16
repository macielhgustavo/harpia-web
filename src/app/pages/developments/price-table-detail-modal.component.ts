import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Save, Search, Trash2, X } from 'lucide-angular';
import {
  Observable,
  catchError,
  concatMap,
  from,
  map,
  of,
  tap,
  toArray,
} from 'rxjs';
import {
  PriceTableDetail,
  UnitPriceRecord,
} from '../../core/models/price-table.model';
import { UnitListItem, UnitStatus } from '../../core/models/unit.model';
import { PriceTableService } from '../../core/services/price-table.service';
import { CurrencyMaskDirective } from '../../shared/directives/currency-mask.directive';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';
import {
  UNIT_STATUS_OPTIONS,
  unitStatusLabel,
} from '../../shared/utils/development';

type PriceFilter = 'ALL' | 'PRICED' | 'UNPRICED';

interface PriceChange {
  unitId: string;
  desiredValue: number | null;
  existing: UnitPriceRecord | null;
}

interface PriceChangeResult {
  change: PriceChange;
  error?: unknown;
  ok: boolean;
}

@Component({
  selector: 'app-price-table-detail-modal',
  standalone: true,
  imports: [
    CurrencyMaskDirective,
    DialogFocusDirective,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './price-table-detail-modal.component.html',
})
export class PriceTableDetailModalComponent implements OnInit {
  private readonly priceTableService = inject(PriceTableService);

  @Input({ required: true }) priceTable!: PriceTableDetail;
  @Input() units: UnitListItem[] = [];
  @Input() canWrite = false;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly changed = new EventEmitter<string>();
  @Output() readonly stale = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly processed = signal(0);
  readonly totalToSave = signal(0);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly draftVersion = signal(0);

  readonly statusOptions = UNIT_STATUS_OPTIONS;
  readonly statusLabel = unitStatusLabel;
  readonly formatCurrency = formatBrl;
  readonly CloseIcon = X;
  readonly SearchIcon = Search;
  readonly SaveIcon = Save;
  readonly TrashIcon = Trash2;

  search = '';
  statusFilter: UnitStatus | '' = '';
  typeFilter = '';
  priceFilter: PriceFilter = 'ALL';
  draftValues: Record<string, number | null> = {};
  originalValues: Record<string, number | null> = {};
  private pricesByUnit: Record<string, UnitPriceRecord | undefined> = {};

  ngOnInit(): void {
    this.applyDetail(this.priceTable);
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  filteredUnits(): UnitListItem[] {
    this.draftVersion();
    const query = this.search.trim().toLocaleLowerCase('pt-BR');
    return this.units.filter((unit) => {
      const matchesSearch =
        !query ||
        unit.identifier.toLocaleLowerCase('pt-BR').includes(query) ||
        (unit.grouping ?? '').toLocaleLowerCase('pt-BR').includes(query) ||
        (unit.unitType?.name ?? '').toLocaleLowerCase('pt-BR').includes(query);
      const matchesStatus =
        !this.statusFilter || unit.status === this.statusFilter;
      const matchesType =
        !this.typeFilter || unit.unitTypeId === this.typeFilter;
      const hasPrice = this.originalValues[unit.id] !== null;
      const matchesPrice =
        this.priceFilter === 'ALL' ||
        (this.priceFilter === 'PRICED' && hasPrice) ||
        (this.priceFilter === 'UNPRICED' && !hasPrice);
      return matchesSearch && matchesStatus && matchesType && matchesPrice;
    });
  }

  unitTypes(): Array<{ id: string; name: string }> {
    const values = new Map<string, string>();
    for (const unit of this.units) {
      if (unit.unitType) values.set(unit.unitType.id, unit.unitType.name);
    }
    return [...values].map(([id, name]) => ({ id, name }));
  }

  pricedCount(): number {
    return Object.values(this.originalValues).filter((value) => value !== null)
      .length;
  }

  unpricedCount(): number {
    return this.units.length - this.pricedCount();
  }

  averagePrice(): number | null {
    const values = this.priceValues();
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }

  minPrice(): number | null {
    const values = this.priceValues();
    return values.length ? Math.min(...values) : null;
  }

  maxPrice(): number | null {
    const values = this.priceValues();
    return values.length ? Math.max(...values) : null;
  }

  draftChanged(): void {
    this.error.set('');
    this.feedback.set('');
    this.draftVersion.update((version) => version + 1);
  }

  dirtyCount(): number {
    this.draftVersion();
    return this.units.filter((unit) => this.isDirty(unit.id)).length;
  }

  isDirty(unitId: string): boolean {
    return this.draftValues[unitId] !== this.originalValues[unitId];
  }

  priceInvalid(unitId: string): boolean {
    const value = this.draftValues[unitId];
    return value !== null && (!Number.isFinite(value) || value <= 0);
  }

  clearPrice(unitId: string): void {
    if (!this.canWrite || this.saving()) return;
    this.draftValues[unitId] = null;
    this.draftChanged();
  }

  resetPrice(unitId: string): void {
    this.draftValues[unitId] = this.originalValues[unitId];
    this.draftChanged();
  }

  saveChanges(unitId?: string): void {
    if (!this.canWrite || this.saving()) return;
    const units = unitId
      ? this.units.filter((unit) => unit.id === unitId)
      : this.units;
    const invalidUnit = units.find(
      (unit) => this.isDirty(unit.id) && this.priceInvalid(unit.id),
    );
    if (invalidUnit) {
      this.error.set(
        `Informe um preço maior que zero para ${invalidUnit.identifier}.`,
      );
      return;
    }

    const changes = units
      .filter((unit) => this.isDirty(unit.id))
      .map((unit) => ({
        unitId: unit.id,
        desiredValue: this.draftValues[unit.id],
        existing: this.pricesByUnit[unit.id] ?? null,
      }));
    if (changes.length === 0) return;

    this.saving.set(true);
    this.processed.set(0);
    this.totalToSave.set(changes.length);
    this.error.set('');
    this.feedback.set('');

    from(changes)
      .pipe(
        concatMap((change) =>
          this.executeChange(change).pipe(
            map((): PriceChangeResult => ({ change, ok: true })),
            catchError((error: unknown) =>
              of<PriceChangeResult>({ change, error, ok: false }),
            ),
            tap(() => this.processed.update((value) => value + 1)),
          ),
        ),
        toArray(),
      )
      .subscribe((results) => this.finishSave(results));
  }

  private executeChange(change: PriceChange): Observable<unknown> {
    if (change.desiredValue === null && change.existing) {
      return this.priceTableService.removePrice(change.existing.id);
    }
    if (change.desiredValue !== null && change.existing) {
      return this.priceTableService.updatePrice(change.existing.id, {
        value: change.desiredValue,
      });
    }
    if (change.desiredValue !== null) {
      return this.priceTableService.setPrice(this.priceTable.id, {
        unitId: change.unitId,
        value: change.desiredValue,
      });
    }
    return of(null);
  }

  private finishSave(results: PriceChangeResult[]): void {
    const successes = results.filter((result) => result.ok);
    const failures = results.filter((result) => !result.ok);
    const message =
      successes.length === 1
        ? '1 preço salvo com sucesso.'
        : `${successes.length} preços salvos com sucesso.`;

    if (successes.length) this.changed.emit(message);
    if (failures.length) {
      this.error.set(
        `${failures.length} alteração(ões) não foram salvas. ${extractError(
          failures[0].error,
          'Tente novamente.',
        )}`,
      );
    } else {
      this.feedback.set(message);
    }

    const failedDrafts = new Map(
      failures.map((result) => [
        result.change.unitId,
        result.change.desiredValue,
      ]),
    );
    this.priceTableService.getById(this.priceTable.id).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        for (const [failedUnitId, desiredValue] of failedDrafts) {
          this.draftValues[failedUnitId] = desiredValue;
        }
        this.draftVersion.update((version) => version + 1);
        this.saving.set(false);
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
            'Os preços foram processados, mas a tabela não pôde ser atualizada.',
          ),
        );
      },
    });
  }

  private applyDetail(detail: PriceTableDetail): void {
    this.pricesByUnit = {};
    this.originalValues = {};
    this.draftValues = {};
    for (const unit of this.units) {
      const price = detail.unitPrices.find(
        (candidate) => candidate.unitId === unit.id,
      );
      this.pricesByUnit[unit.id] = price;
      this.originalValues[unit.id] = price?.value ?? null;
      this.draftValues[unit.id] = price?.value ?? null;
    }
    this.draftVersion.update((version) => version + 1);
  }

  private priceValues(): number[] {
    return Object.values(this.originalValues).filter(
      (value): value is number => value !== null,
    );
  }
}
