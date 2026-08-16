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
import {
  ChartNoAxesColumnIncreasing,
  Eye,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  PriceTable,
  PriceTableDetail,
  PriceTableListItem,
} from '../../core/models/price-table.model';
import { UnitListItem } from '../../core/models/unit.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { PriceTableService } from '../../core/services/price-table.service';
import { UnitService } from '../../core/services/unit.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';
import { PriceTableDetailModalComponent } from './price-table-detail-modal.component';
import { PriceTableFormModalComponent } from './price-table-form-modal.component';

@Component({
  selector: 'app-price-tables-section',
  standalone: true,
  imports: [
    DialogFocusDirective,
    LucideAngularModule,
    PriceTableDetailModalComponent,
    PriceTableFormModalComponent,
  ],
  templateUrl: './price-tables-section.component.html',
})
export class PriceTablesSectionComponent implements OnInit {
  private readonly priceTableService = inject(PriceTableService);
  private readonly unitService = inject(UnitService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;
  private priceRefreshSequence = 0;
  private focusHeadingAfterLoad = false;

  @Input() developmentId = '';
  @Output() readonly changed = new EventEmitter<string>();
  @ViewChild('sectionHeading') private sectionHeading?: ElementRef<HTMLElement>;

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.PRICES_WRITE,
  );
  readonly tables = signal<PriceTableListItem[]>([]);
  readonly details = signal<Record<string, PriceTableDetail>>({});
  readonly units = signal<UnitListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<PriceTableListItem | null>(null);
  readonly detailOpen = signal<PriceTableDetail | null>(null);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<PriceTableListItem | null>(null);
  readonly deleteError = signal('');

  readonly PriceIcon = ChartNoAxesColumnIncreasing;
  readonly PlusIcon = Plus;
  readonly ViewIcon = Eye;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly RefreshIcon = RefreshCw;
  readonly CloseIcon = X;
  readonly formatCurrency = formatBrl;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.developmentId) return;
    const sequence = ++this.loadSequence;
    this.priceRefreshSequence += 1;
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      tables: this.priceTableService.list(this.developmentId),
      units: this.unitService.list({ developmentId: this.developmentId }),
    }).subscribe({
      next: ({ tables, units }) => {
        if (sequence !== this.loadSequence) return;
        const requests = tables.map((table) =>
          this.priceTableService.getById(table.id),
        );
        (requests.length ? forkJoin(requests) : of([])).subscribe({
          next: (details) => {
            if (sequence !== this.loadSequence) return;
            this.tables.set(tables);
            this.units.set(units);
            this.details.set(
              Object.fromEntries(details.map((detail) => [detail.id, detail])),
            );
            this.loading.set(false);
            this.restoreFocusIfNeeded();
          },
          error: (error: unknown) => this.handleLoadError(error, sequence),
        });
      },
      error: (error: unknown) => this.handleLoadError(error, sequence),
    });
  }

  openCreate(): void {
    if (!this.canWrite || this.loading()) return;
    this.feedback.set('');
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(table: PriceTableListItem): void {
    if (!this.canWrite || this.loading()) return;
    this.feedback.set('');
    this.editing.set(table);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(table: PriceTable): void {
    const wasEditing = this.editing() !== null;
    this.closeForm();
    const message = wasEditing
      ? `Tabela “${table.name}” atualizada com sucesso.`
      : `Tabela “${table.name}” criada com sucesso.`;
    this.feedback.set(message);
    this.changed.emit(message);
    this.focusHeadingAfterLoad = true;
    this.reload();
  }

  openDetail(table: PriceTableListItem): void {
    const detail = this.details()[table.id];
    if (detail) this.detailOpen.set(detail);
  }

  closeDetail(): void {
    this.detailOpen.set(null);
  }

  onPricesChanged(message: string): void {
    this.feedback.set(message);
    this.changed.emit(message);
    const selected = this.detailOpen();
    if (!selected) return;
    const sequence = ++this.priceRefreshSequence;
    this.priceTableService.getById(selected.id).subscribe({
      next: (detail) => {
        if (sequence !== this.priceRefreshSequence) return;
        this.details.update((details) => ({ ...details, [detail.id]: detail }));
        this.tables.update((tables) =>
          tables.map((table) =>
            table.id === detail.id
              ? { ...table, _count: { unitPrices: detail.unitPrices.length } }
              : table,
          ),
        );
      },
      error: (error: unknown) => {
        if (sequence !== this.priceRefreshSequence) return;
        this.feedback.set(
          `${message} ${extractError(
            error,
            'Não foi possível atualizar os indicadores da tabela.',
          )}`,
        );
      },
    });
  }

  reconcileStale(
    message = 'A tabela não existe mais e a lista será atualizada.',
  ): void {
    this.closeForm();
    this.closeDetail();
    this.deleteTarget.set(null);
    this.feedback.set(message);
    this.focusHeadingAfterLoad = true;
    this.reload();
  }

  requestDelete(table: PriceTableListItem): void {
    if (!this.canWrite || this.loading()) return;
    this.deleteError.set('');
    this.deleteTarget.set(table);
  }

  closeDelete(): void {
    if (!this.deleting()) this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || !this.canWrite || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.priceTableService.remove(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        const message = `Tabela “${target.name}” removida com sucesso.`;
        this.feedback.set(message);
        this.changed.emit(message);
        this.focusHeadingAfterLoad = true;
        this.reload();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.reconcileStale();
          return;
        }
        this.deleteError.set(
          extractError(error, 'Não foi possível remover a tabela de preço.'),
        );
      },
    });
  }

  minPrice(tableId: string): number | null {
    const values = this.priceValues(tableId);
    return values.length ? Math.min(...values) : null;
  }

  maxPrice(tableId: string): number | null {
    const values = this.priceValues(tableId);
    return values.length ? Math.max(...values) : null;
  }

  averagePrice(tableId: string): number | null {
    const values = this.priceValues(tableId);
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }

  private priceValues(tableId: string): number[] {
    return (this.details()[tableId]?.unitPrices ?? []).map(
      (price) => price.value,
    );
  }

  private handleLoadError(error: unknown, sequence: number): void {
    if (sequence !== this.loadSequence) return;
    this.error.set(
      extractError(error, 'Não foi possível carregar as tabelas de preço.'),
    );
    this.loading.set(false);
    this.restoreFocusIfNeeded();
  }

  private restoreFocusIfNeeded(): void {
    if (!this.focusHeadingAfterLoad) return;
    this.focusHeadingAfterLoad = false;
    queueMicrotask(() => this.sectionHeading?.nativeElement.focus());
  }
}
