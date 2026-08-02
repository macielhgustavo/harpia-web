import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  LucideAngularModule,
  MapPin,
  Pencil,
  RefreshCw,
} from 'lucide-angular';
import { Company, CompanyDetail, CompanyType } from '../../core/models/company.model';
import { CompanyService } from '../../core/services/company.service';
import { formatCnpj } from '../../shared/utils/cnpj';
import { extractError } from '../../shared/utils/http-error';
import { CompanyFormModalComponent } from './company-form-modal.component';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, CompanyFormModalComponent],
  templateUrl: './company-detail.component.html',
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly companyService = inject(CompanyService);

  private companyId = '';

  readonly company = signal<CompanyDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly editOpen = signal(false);
  readonly feedback = signal('');

  readonly ArrowLeftIcon = ArrowLeft;
  readonly PencilIcon = Pencil;
  readonly LandmarkIcon = Landmark;
  readonly BuildingIcon = Building2;
  readonly CreditCardIcon = CreditCard;
  readonly MapPinIcon = MapPin;
  readonly CalendarIcon = CalendarDays;
  readonly WarningIcon = AlertTriangle;
  readonly RefreshIcon = RefreshCw;

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Empresa não encontrada.');
      this.loading.set(false);
      return;
    }

    this.companyId = id;
    this.loadCompany();
  }

  loadCompany(): void {
    this.loading.set(true);
    this.error.set('');
    this.companyService.getById(this.companyId).subscribe({
      next: (company) => {
        this.company.set(company);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const status = (err as HttpErrorResponse).status;
        this.error.set(
          status === 404
            ? 'Empresa não encontrada.'
            : extractError(err, 'Não foi possível carregar a empresa.'),
        );
        this.loading.set(false);
      },
    });
  }

  openEdit(): void {
    this.feedback.set('');
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
  }

  onSaved(company: Company): void {
    this.closeEdit();
    this.feedback.set(`Empresa “${company.name}” atualizada com sucesso.`);
    this.loadCompany();
  }

  typeLabel(type: CompanyType): string {
    return type === 'INCORPORADORA' ? 'Incorporadora' : 'SPE';
  }

  typeBadge(type: CompanyType): string {
    return type === 'INCORPORADORA'
      ? 'bg-green-100 text-green-800'
      : 'bg-blue-100 text-blue-800';
  }

  developmentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLANEJAMENTO: 'Planejamento',
      EM_CAPTACAO: 'Em captação',
      LANCAMENTO: 'Lançamento',
      EM_OBRA: 'Em obra',
      ENTREGUE: 'Entregue',
      CANCELADO: 'Cancelado',
    };
    return labels[status] ?? status.replaceAll('_', ' ');
  }

  formatCnpj(value?: string | null): string {
    return formatCnpj(value);
  }

  formatDate(value?: string | null): string {
    return value ? this.dateFormatter.format(new Date(value)) : '—';
  }
}
