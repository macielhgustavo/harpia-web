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
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlertTriangle,
  Layers3,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { UnitType, UnitTypeListItem } from '../../core/models/unit-type.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';
import { UnitTypeFormModalComponent } from './unit-type-form-modal.component';

@Component({
  selector: 'app-unit-types-section',
  standalone: true,
  imports: [
    LucideAngularModule,
    DialogFocusDirective,
    UnitTypeFormModalComponent,
  ],
  templateUrl: './unit-types-section.component.html',
})
export class UnitTypesSectionComponent implements OnInit {
  private readonly unitTypeService = inject(UnitTypeService);
  private readonly authorization = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);
  private loadSequence = 0;
  private focusHeadingOnLoad = false;

  @ViewChild('sectionHeading')
  private sectionHeading?: ElementRef<HTMLHeadingElement>;

  @Input({ required: true }) developmentId = '';
  @Output() readonly changed = new EventEmitter<string>();

  readonly unitTypes = signal<UnitTypeListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<UnitTypeListItem | null>(null);
  readonly deleteTarget = signal<UnitTypeListItem | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.UNITS_WRITE,
  );

  readonly UnitTypeIcon = Layers3;
  readonly AddIcon = Plus;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly RetryIcon = RefreshCw;
  readonly WarningIcon = AlertTriangle;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.developmentId) {
      this.error.set('Empreendimento inválido para listar tipologias.');
      this.loading.set(false);
      return;
    }

    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');

    this.unitTypeService
      .list(this.developmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (unitTypes) => {
          if (sequence !== this.loadSequence) return;
          this.unitTypes.set(unitTypes);
          this.loading.set(false);
          this.restoreSectionFocusIfNeeded();
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.error.set(
            extractError(error, 'Não foi possível carregar as tipologias.'),
          );
          this.loading.set(false);
          this.restoreSectionFocusIfNeeded();
        },
      });
  }

  openCreate(): void {
    if (!this.canWrite || this.loading()) return;
    this.feedback.set('');
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(unitType: UnitTypeListItem): void {
    if (!this.canWrite) return;
    this.feedback.set('');
    this.editing.set(unitType);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(unitType: UnitType): void {
    const action = this.editing() ? 'atualizada' : 'criada';
    const message = `Tipologia “${unitType.name}” ${action} com sucesso.`;
    this.closeForm();
    this.feedback.set(message);
    this.focusHeadingOnLoad = true;
    this.reload();
    this.changed.emit(message);
  }

  onStaleUnitType(): void {
    const message = 'A tipologia não existe mais.';
    this.closeForm();
    this.feedback.set(message);
    this.focusHeadingOnLoad = true;
    this.reload();
    this.changed.emit(message);
  }

  requestDelete(unitType: UnitTypeListItem): void {
    if (!this.canWrite) return;
    this.feedback.set('');
    this.deleteError.set('');
    this.deleteTarget.set(unitType);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    const unitType = this.deleteTarget();
    if (!unitType || this.deleting() || !this.canWrite) return;

    this.deleting.set(true);
    this.deleteError.set('');

    this.unitTypeService
      .remove(unitType.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const message = `Tipologia “${unitType.name}” removida com sucesso.`;
          this.deleting.set(false);
          this.deleteTarget.set(null);
          this.feedback.set(message);
          this.focusHeadingOnLoad = true;
          this.reload();
          this.changed.emit(message);
        },
        error: (error: unknown) => {
          this.deleting.set(false);
          const status = (error as HttpErrorResponse).status;
          if (status === 404) {
            const message = 'A tipologia não existe mais.';
            this.deleteTarget.set(null);
            this.feedback.set(message);
            this.focusHeadingOnLoad = true;
            this.reload();
            this.changed.emit(message);
            return;
          }
          this.deleteError.set(
            extractError(error, 'Não foi possível remover a tipologia.'),
          );
        },
      });
  }

  affectedUnitsMessage(unitType: UnitTypeListItem): string {
    const count = unitType._count.units;
    if (count === 0) {
      return 'Nenhuma unidade será afetada.';
    }
    if (count === 1) {
      return '1 unidade permanecerá cadastrada e ficará sem tipologia.';
    }
    return `${count} unidades permanecerão cadastradas e ficarão sem tipologia.`;
  }

  formatArea(value: number | null): string {
    return value == null
      ? 'Não informada'
      : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} m²`;
  }

  private restoreSectionFocusIfNeeded(): void {
    if (!this.focusHeadingOnLoad) return;
    this.focusHeadingOnLoad = false;
    setTimeout(() => this.sectionHeading?.nativeElement.focus());
  }
}
