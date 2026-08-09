import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  HardHat,
  House,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { CompanyListItem } from '../../core/models/company.model';
import {
  Development,
  DevelopmentListItem,
  DevelopmentStatus,
  DevelopmentType,
} from '../../core/models/development.model';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import {
  DEVELOPMENT_STATUS_OPTIONS,
  DEVELOPMENT_TYPE_OPTIONS,
  developmentStatusBadge,
  developmentStatusLabel,
  developmentTypeLabel,
  formatDate,
} from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';
import { DevelopmentFormModalComponent } from './development-form-modal.component';

@Component({
  selector: 'app-developments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DevelopmentFormModalComponent,
  ],
  templateUrl: './developments.component.html',
})
export class DevelopmentsComponent implements OnInit {
  private readonly developmentService = inject(DevelopmentService);
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly authorization = inject(AuthorizationService);

  readonly canWriteDevelopments = this.authorization.hasPermission(
    APP_PERMISSIONS.DEVELOPMENTS_WRITE,
  );

  readonly developments = signal<DevelopmentListItem[]>([]);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly feedback = signal('');

  readonly search = signal('');
  readonly statusFilter = signal<DevelopmentStatus | ''>('');
  readonly typeFilter = signal<DevelopmentType | ''>('');
  readonly companyFilter = signal('');

  readonly formOpen = signal(false);
  readonly editingDevelopment = signal<Development | null>(null);
  readonly deleteTarget = signal<DevelopmentListItem | null>(null);
  readonly deleting = signal(false);

  readonly statusOptions = DEVELOPMENT_STATUS_OPTIONS;
  readonly typeOptions = DEVELOPMENT_TYPE_OPTIONS;
  readonly statusLabel = developmentStatusLabel;
  readonly statusBadge = developmentStatusBadge;
  readonly typeLabel = developmentTypeLabel;
  readonly formatDate = formatDate;

  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly BuildingIcon = Building2;
  readonly CaptureIcon = CircleDollarSign;
  readonly WorkIcon = HardHat;
  readonly CompleteIcon = CheckCircle2;
  readonly UnitIcon = House;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly ChevronIcon = ChevronRight;
  readonly RefreshIcon = RefreshCw;
  readonly XIcon = X;

  readonly sortedCompanies = computed(() =>
    [...this.companies()].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'SPE' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    }),
  );

  readonly filteredDevelopments = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('pt-BR');
    const status = this.statusFilter();
    const type = this.typeFilter();
    const companyId = this.companyFilter();

    return this.developments().filter((development) => {
      if (status && development.status !== status) return false;
      if (type && development.type !== type) return false;
      if (companyId && development.companyId !== companyId) return false;
      if (!query) return true;

      return [
        development.name,
        development.city,
        development.address,
        development.company?.name,
      ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(query));
    });
  });

  readonly totalDevelopments = computed(() => this.developments().length);
  readonly totalCapturing = computed(
    () =>
      this.developments().filter((item) => item.status === 'EM_CAPTACAO')
        .length,
  );
  readonly totalBuilding = computed(
    () =>
      this.developments().filter((item) => item.status === 'EM_OBRA').length,
  );
  readonly totalCompleted = computed(
    () =>
      this.developments().filter((item) =>
        ['PRONTO', 'ENTREGUE'].includes(item.status),
      ).length,
  );
  readonly totalUnits = computed(() =>
    this.developments().reduce((total, item) => total + item._count.units, 0),
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      developments: this.developmentService.list(),
      companies: this.companyService.list(),
    }).subscribe({
      next: ({ developments, companies }) => {
        this.developments.set(developments);
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loadError.set(
          extractError(
            err,
            'Não foi possível carregar os empreendimentos ou as empresas.',
          ),
        );
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    if (!this.canWriteDevelopments) return;
    this.clearMessages();
    this.editingDevelopment.set(null);
    this.formOpen.set(true);
  }

  openEdit(development: Development, event?: Event): void {
    event?.stopPropagation();
    if (!this.canWriteDevelopments) return;
    this.clearMessages();
    this.editingDevelopment.set(development);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingDevelopment.set(null);
  }

  onSaved(development: Development): void {
    const editing = !!this.editingDevelopment();
    this.closeForm();
    this.feedback.set(
      editing
        ? `Empreendimento “${development.name}” atualizado com sucesso.`
        : `Empreendimento “${development.name}” criado com sucesso.`,
    );
    this.loadData();
  }

  requestDelete(development: DevelopmentListItem, event?: Event): void {
    event?.stopPropagation();
    if (!this.canWriteDevelopments) return;
    this.clearMessages();
    this.deleteTarget.set(development);
  }

  closeDelete(): void {
    if (!this.deleting()) this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const development = this.deleteTarget();
    if (!this.canWriteDevelopments || !development || this.deleting()) return;

    this.deleting.set(true);
    this.actionError.set('');
    this.developmentService.remove(development.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.feedback.set(
          `Empreendimento “${development.name}” removido com sucesso.`,
        );
        this.loadData();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const status = (err as HttpErrorResponse).status;
        if (status === 404) {
          this.deleteTarget.set(null);
          this.actionError.set(
            'Empreendimento não encontrado. A lista foi atualizada.',
          );
          this.loadData();
          return;
        }
        this.actionError.set(
          extractError(
            err,
            status === 409
              ? 'Existem investimentos ou alocações vinculados a este empreendimento.'
              : 'Não foi possível remover o empreendimento.',
          ),
        );
      },
    });
  }

  openDetail(id: string): void {
    void this.router.navigate(['/developments', id]);
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.companyFilter.set('');
  }

  companyLabel(company: CompanyListItem): string {
    return `${company.name} — ${company.type === 'SPE' ? 'SPE' : 'Incorporadora'}`;
  }

  private clearMessages(): void {
    this.feedback.set('');
    this.actionError.set('');
  }
}
