import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Landmark,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
  X,
} from 'lucide-angular';
import { Company, CompanyListItem, CompanyType } from '../../core/models/company.model';
import { CompanyService } from '../../core/services/company.service';
import { formatCnpj } from '../../shared/utils/cnpj';
import { extractError } from '../../shared/utils/http-error';
import { CompanyFormModalComponent } from './company-form-modal.component';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CompanyFormModalComponent],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);

  readonly companies = signal<CompanyListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly feedback = signal('');

  readonly typeFilter = signal<CompanyType | ''>('');
  readonly search = signal('');

  readonly formOpen = signal(false);
  readonly editingCompany = signal<Company | null>(null);
  readonly deleteTarget = signal<CompanyListItem | null>(null);
  readonly deleting = signal(false);

  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly LandmarkIcon = Landmark;
  readonly BuildingIcon = Building2;
  readonly WalletIcon = WalletCards;
  readonly CalendarIcon = CalendarDays;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly ChevronIcon = ChevronRight;
  readonly RefreshIcon = RefreshCw;
  readonly XIcon = X;

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR');

  readonly filteredCompanies = computed(() => {
    const type = this.typeFilter();
    const query = this.search().trim().toLocaleLowerCase('pt-BR');
    const queryDigits = query.replace(/\D/g, '');

    return this.companies().filter((company) => {
      if (type && company.type !== type) {
        return false;
      }
      if (!query) {
        return true;
      }

      const nameMatches = company.name.toLocaleLowerCase('pt-BR').includes(query);
      const cnpjMatches = queryDigits.length > 0 && company.cnpj.replace(/\D/g, '').includes(queryDigits);
      return nameMatches || cnpjMatches;
    });
  });

  readonly totalCompanies = computed(() => this.companies().length);
  readonly totalDevelopers = computed(
    () => this.companies().filter((company) => company.type === 'INCORPORADORA').length,
  );
  readonly totalSpes = computed(
    () => this.companies().filter((company) => company.type === 'SPE').length,
  );
  readonly totalDevelopments = computed(() =>
    this.companies().reduce((total, company) => total + company._count.developments, 0),
  );

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.companyService.list().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loadError.set(extractError(err, 'Não foi possível carregar as empresas.'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.clearMessages();
    this.editingCompany.set(null);
    this.formOpen.set(true);
  }

  openEdit(company: Company, event?: Event): void {
    event?.stopPropagation();
    this.clearMessages();
    this.editingCompany.set(company);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingCompany.set(null);
  }

  onSaved(company: Company): void {
    const wasEditing = !!this.editingCompany();
    this.closeForm();
    this.feedback.set(
      wasEditing
        ? `Empresa “${company.name}” atualizada com sucesso.`
        : `Empresa “${company.name}” criada com sucesso.`,
    );
    this.loadCompanies();
  }

  requestDelete(company: CompanyListItem, event?: Event): void {
    event?.stopPropagation();
    this.clearMessages();
    this.deleteTarget.set(company);
  }

  closeDelete(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const company = this.deleteTarget();
    if (!company || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.actionError.set('');
    this.companyService.remove(company.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.feedback.set(`Empresa “${company.name}” removida com sucesso.`);
        this.loadCompanies();
      },
      error: (err: unknown) => {
        const status = (err as HttpErrorResponse).status;
        this.deleting.set(false);

        if (status === 404) {
          this.deleteTarget.set(null);
          this.actionError.set('Empresa não encontrada. A lista foi atualizada.');
          this.loadCompanies();
          return;
        }

        this.actionError.set(
          extractError(err, 'Não foi possível remover a empresa. Tente novamente.'),
        );
      },
    });
  }

  openDetail(id: string): void {
    void this.router.navigate(['/companies', id]);
  }

  clearFilters(): void {
    this.typeFilter.set('');
    this.search.set('');
  }

  typeLabel(type: CompanyType): string {
    return type === 'INCORPORADORA' ? 'Incorporadora' : 'SPE';
  }

  typeBadge(type: CompanyType): string {
    return type === 'INCORPORADORA'
      ? 'bg-green-100 text-green-800'
      : 'bg-blue-100 text-blue-800';
  }

  formatCnpj(value?: string | null): string {
    return formatCnpj(value);
  }

  formatDate(value?: string | null): string {
    return value ? this.dateFormatter.format(new Date(value)) : '—';
  }

  private clearMessages(): void {
    this.feedback.set('');
    this.actionError.set('');
  }
}
