import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlertTriangle,
  Files,
  House,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Unit,
  UnitCategory,
  UnitListItem,
  UnitStatus,
} from '../../core/models/unit.model';
import { UnitType } from '../../core/models/unit-type.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { UnitService } from '../../core/services/unit.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import {
  UNIT_CATEGORY_OPTIONS,
  UNIT_STATUS_OPTIONS,
  unitCategoryLabel,
  unitStatusBadge,
  unitStatusLabel,
} from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';
import { DocumentsSectionComponent } from '../documents/documents-section.component';
import { UnitFormModalComponent } from './unit-form-modal.component';

@Component({
  selector: 'app-units-section',
  standalone: true,
  imports: [
    DialogFocusDirective,
    DocumentsSectionComponent,
    FormsModule,
    LucideAngularModule,
    UnitFormModalComponent,
  ],
  templateUrl: './units-section.component.html',
})
export class UnitsSectionComponent implements OnInit {
  private readonly unitService = inject(UnitService);
  private readonly authorization = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);
  private loadSequence = 0;
  private focusHeadingOnLoad = false;

  @ViewChild('sectionHeading')
  private sectionHeading?: ElementRef<HTMLHeadingElement>;

  @Input({ required: true }) developmentId = '';
  @Input() unitTypes: UnitType[] = [];
  @Output() readonly changed = new EventEmitter<string>();

  readonly units = signal<UnitListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<UnitStatus | ''>('');
  readonly categoryFilter = signal<UnitCategory | ''>('');
  readonly unitTypeFilter = signal('');
  readonly groupingFilter = signal('');

  readonly formOpen = signal(false);
  readonly editing = signal<UnitListItem | null>(null);
  readonly statusTarget = signal<UnitListItem | null>(null);
  readonly selectedStatus = signal<UnitStatus>('DISPONIVEL');
  readonly statusSaving = signal(false);
  readonly statusError = signal('');
  readonly deleteTarget = signal<UnitListItem | null>(null);
  readonly documentsTarget = signal<UnitListItem | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.UNITS_WRITE,
  );
  readonly categoryOptions = UNIT_CATEGORY_OPTIONS;
  readonly statusOptions = UNIT_STATUS_OPTIONS;
  readonly statusLabel = unitStatusLabel;
  readonly statusBadge = unitStatusBadge;
  readonly categoryLabel = unitCategoryLabel;

  readonly UnitIcon = House;
  readonly AddIcon = Plus;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly DocumentsIcon = Files;
  readonly RetryIcon = RefreshCw;
  readonly ResetIcon = RotateCcw;
  readonly SearchIcon = Search;
  readonly WarningIcon = AlertTriangle;

  readonly groupingOptions = computed(() =>
    [
      ...new Set(
        this.units()
          .map((unit) => unit.grouping)
          .filter(Boolean),
      ),
    ]
      .map((value) => value as string)
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );

  readonly stats = computed(() => {
    const units = this.units();
    return {
      total: units.length,
      available: units.filter((unit) => unit.status === 'DISPONIVEL').length,
      reserved: units.filter((unit) => unit.status === 'RESERVADA').length,
      sold: units.filter((unit) => ['VENDIDA', 'QUITADA'].includes(unit.status))
        .length,
    };
  });

  readonly hasFilters = computed(
    () =>
      !!this.search().trim() ||
      !!this.statusFilter() ||
      !!this.categoryFilter() ||
      !!this.unitTypeFilter() ||
      !!this.groupingFilter(),
  );

  readonly filteredUnits = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('pt-BR');
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const unitTypeId = this.unitTypeFilter();
    const grouping = this.groupingFilter();

    return this.units().filter((unit) => {
      const searchable = [
        unit.identifier,
        unit.grouping ?? '',
        unit.unitType?.name ?? '',
        unit.notes ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return (
        (!search || searchable.includes(search)) &&
        (!status || unit.status === status) &&
        (!category || unit.category === category) &&
        (!unitTypeId ||
          (unitTypeId === 'none'
            ? unit.unitTypeId === null
            : unit.unitTypeId === unitTypeId)) &&
        (!grouping || unit.grouping === grouping)
      );
    });
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.developmentId) {
      this.error.set('Empreendimento inválido para listar unidades.');
      this.loading.set(false);
      return;
    }

    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.unitService
      .list({ developmentId: this.developmentId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (units) => {
          if (sequence !== this.loadSequence) return;
          this.units.set(units);
          this.loading.set(false);
          this.restoreSectionFocusIfNeeded();
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.error.set(
            extractError(error, 'Não foi possível carregar as unidades.'),
          );
          this.loading.set(false);
          this.restoreSectionFocusIfNeeded();
        },
      });
  }

  resetFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.categoryFilter.set('');
    this.unitTypeFilter.set('');
    this.groupingFilter.set('');
  }

  openCreate(): void {
    if (!this.canWrite || this.loading()) return;
    this.feedback.set('');
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(unit: UnitListItem): void {
    if (!this.canWrite) return;
    this.feedback.set('');
    this.editing.set(unit);
    this.formOpen.set(true);
  }

  openDocuments(unit: UnitListItem): void {
    this.documentsTarget.set(unit);
  }

  closeDocuments(): void {
    this.documentsTarget.set(null);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(unit: Unit): void {
    const action = this.editing() ? 'atualizada' : 'criada';
    const message = `Unidade “${unit.identifier}” ${action} com sucesso.`;
    this.closeForm();
    this.afterMutation(message);
  }

  onStaleUnit(): void {
    this.closeForm();
    this.reconcileStaleUnit();
  }

  openStatus(unit: UnitListItem): void {
    if (!this.canWrite) return;
    this.feedback.set('');
    this.statusError.set('');
    this.selectedStatus.set(unit.status);
    this.statusTarget.set(unit);
  }

  closeStatus(): void {
    if (this.statusSaving()) return;
    this.statusTarget.set(null);
    this.statusError.set('');
  }

  saveStatus(): void {
    const unit = this.statusTarget();
    if (!unit || !this.canWrite || this.statusSaving()) return;
    const status = this.selectedStatus();
    if (status === unit.status) {
      this.closeStatus();
      return;
    }

    this.statusSaving.set(true);
    this.statusError.set('');
    this.unitService
      .update(unit.id, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.statusSaving.set(false);
          this.statusTarget.set(null);
          this.afterMutation(
            `Status da unidade “${unit.identifier}” alterado para ${this.statusLabel(status)}.`,
          );
        },
        error: (error: unknown) => {
          this.statusSaving.set(false);
          if ((error as HttpErrorResponse).status === 404) {
            this.statusTarget.set(null);
            this.reconcileStaleUnit();
            return;
          }
          this.statusError.set(
            extractError(error, 'Não foi possível alterar o status.'),
          );
        },
      });
  }

  requestDelete(unit: UnitListItem): void {
    if (!this.canWrite) return;
    this.feedback.set('');
    this.deleteError.set('');
    this.deleteTarget.set(unit);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    const unit = this.deleteTarget();
    if (!unit || !this.canWrite || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.unitService
      .remove(unit.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteTarget.set(null);
          this.afterMutation(
            `Unidade “${unit.identifier}” removida com sucesso.`,
          );
        },
        error: (error: unknown) => {
          this.deleting.set(false);
          if ((error as HttpErrorResponse).status === 404) {
            this.deleteTarget.set(null);
            this.reconcileStaleUnit();
            return;
          }
          this.deleteError.set(
            extractError(error, 'Não foi possível remover a unidade.'),
          );
        },
      });
  }

  areaLabel(unit: UnitListItem): string {
    const value = unit.builtArea ?? unit.landArea;
    if (value === null) return 'Não informada';
    return `${new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(value)} m²`;
  }

  priceImpactMessage(unit: UnitListItem): string {
    const count = unit.prices.length;
    if (count === 0) {
      return 'Não há preços vinculados a esta unidade.';
    }
    return `${count} ${count === 1 ? 'preço será removido' : 'preços serão removidos'} junto com a unidade.`;
  }

  private afterMutation(message: string): void {
    this.feedback.set(message);
    this.focusHeadingOnLoad = true;
    this.reload();
    this.changed.emit(message);
  }

  private reconcileStaleUnit(): void {
    const message = 'A unidade não existe mais.';
    this.feedback.set(message);
    this.focusHeadingOnLoad = true;
    this.reload();
    this.changed.emit(message);
  }

  private restoreSectionFocusIfNeeded(): void {
    if (!this.focusHeadingOnLoad) return;
    this.focusHeadingOnLoad = false;
    setTimeout(() => this.sectionHeading?.nativeElement.focus());
  }
}
