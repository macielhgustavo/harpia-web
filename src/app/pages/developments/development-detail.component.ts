import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  LucideAngularModule,
  MapPin,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { CompanyListItem } from '../../core/models/company.model';
import {
  Development,
  DevelopmentDetail,
} from '../../core/models/development.model';
import { CompanyService } from '../../core/services/company.service';
import { DevelopmentService } from '../../core/services/development.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import {
  developmentStatusBadge,
  developmentStatusLabel,
  developmentTypeLabel,
  formatDate,
} from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';
import { DevelopmentFormModalComponent } from './development-form-modal.component';
import { PriceTablesSectionComponent } from './price-tables-section.component';
import { UnitTypesSectionComponent } from './unit-types-section.component';
import { UnitsSectionComponent } from './units-section.component';

@Component({
  selector: 'app-development-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    DevelopmentFormModalComponent,
    PriceTablesSectionComponent,
    UnitTypesSectionComponent,
    UnitsSectionComponent,
  ],
  templateUrl: './development-detail.component.html',
})
export class DevelopmentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly developmentService = inject(DevelopmentService);
  private readonly companyService = inject(CompanyService);
  private readonly authorization = inject(AuthorizationService);

  private developmentId = '';
  private developmentRefreshSequence = 0;

  readonly canWriteDevelopments = this.authorization.hasPermission(
    APP_PERMISSIONS.DEVELOPMENTS_WRITE,
  );

  readonly development = signal<DevelopmentDetail | null>(null);
  readonly companies = signal<CompanyListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly editOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly statusLabel = developmentStatusLabel;
  readonly statusBadge = developmentStatusBadge;
  readonly typeLabel = developmentTypeLabel;
  readonly formatDate = formatDate;

  readonly ArrowLeftIcon = ArrowLeft;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly BuildingIcon = Building2;
  readonly MapIcon = MapPin;
  readonly CalendarIcon = CalendarDays;
  readonly WarningIcon = AlertTriangle;
  readonly RefreshIcon = RefreshCw;
  readonly XIcon = X;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Empreendimento não encontrado.');
      this.loading.set(false);
      return;
    }
    this.developmentId = id;
    this.loadData();
  }

  loadData(): void {
    this.developmentRefreshSequence += 1;
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      development: this.developmentService.getById(this.developmentId),
      companies: this.companyService.list(),
    }).subscribe({
      next: ({ development, companies }) => {
        this.development.set(development);
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const status = (err as HttpErrorResponse).status;
        this.error.set(
          status === 404
            ? 'Empreendimento não encontrado.'
            : extractError(
                err,
                'Não foi possível carregar o empreendimento ou as empresas.',
              ),
        );
        this.loading.set(false);
      },
    });
  }

  openEdit(): void {
    if (!this.canWriteDevelopments) return;
    this.feedback.set('');
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
  }

  onSaved(development: Development): void {
    this.closeEdit();
    this.feedback.set(
      `Empreendimento “${development.name}” atualizado com sucesso.`,
    );
    this.loadData();
  }

  onUnitTypesChanged(message: string): void {
    this.feedback.set(message);
    const sequence = ++this.developmentRefreshSequence;
    this.developmentService.getById(this.developmentId).subscribe({
      next: (development) => {
        if (sequence !== this.developmentRefreshSequence) return;
        this.development.set(development);
      },
      error: (error: unknown) => {
        if (sequence !== this.developmentRefreshSequence) return;
        this.feedback.set(
          `${message} ${extractError(
            error,
            'Não foi possível atualizar os resumos do empreendimento.',
          )}`,
        );
      },
    });
  }

  onUnitsChanged(message: string): void {
    this.feedback.set(message);
    const sequence = ++this.developmentRefreshSequence;
    this.developmentService.getById(this.developmentId).subscribe({
      next: (development) => {
        if (sequence !== this.developmentRefreshSequence) return;
        this.development.set(development);
      },
      error: (error: unknown) => {
        if (sequence !== this.developmentRefreshSequence) return;
        this.feedback.set(
          `${message} ${extractError(
            error,
            'Não foi possível atualizar os resumos do empreendimento.',
          )}`,
        );
      },
    });
  }

  onPriceTablesChanged(message: string): void {
    this.feedback.set(message);
    const sequence = ++this.developmentRefreshSequence;
    this.developmentService.getById(this.developmentId).subscribe({
      next: (development) => {
        if (sequence !== this.developmentRefreshSequence) return;
        this.development.set(development);
      },
      error: (error: unknown) => {
        if (sequence !== this.developmentRefreshSequence) return;
        this.feedback.set(
          `${message} ${extractError(
            error,
            'Não foi possível atualizar os resumos do empreendimento.',
          )}`,
        );
      },
    });
  }

  requestDelete(): void {
    if (!this.canWriteDevelopments) return;
    this.deleteError.set('');
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    if (!this.deleting()) this.deleteOpen.set(false);
  }

  confirmDelete(): void {
    if (!this.canWriteDevelopments || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.developmentService.remove(this.developmentId).subscribe({
      next: () => {
        this.deleting.set(false);
        void this.router.navigate(['/developments'], {
          state: { feedback: 'Empreendimento removido com sucesso.' },
        });
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        const status = (err as HttpErrorResponse).status;
        this.deleteError.set(
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
}
