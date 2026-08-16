import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Coins,
  HandCoins,
  LucideAngularModule,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-angular';
import { DashboardOverview } from '../../core/models/dashboard.model';
import { InteractionType } from '../../core/models/interaction.model';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  DEVELOPMENT_STATUS_OPTIONS,
  UNIT_STATUS_OPTIONS,
  formatDate,
} from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private loadSequence = 0;

  readonly overview = signal<DashboardOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly developmentStatuses = DEVELOPMENT_STATUS_OPTIONS;
  readonly unitStatuses = UNIT_STATUS_OPTIONS;
  readonly formatDate = formatDate;

  readonly AlertIcon = AlertTriangle;
  readonly AllocationIcon = HandCoins;
  readonly CashIcon = WalletCards;
  readonly DevelopmentIcon = Building2;
  readonly InteractionIcon = MessageSquare;
  readonly InvestorIcon = Users;
  readonly RefreshIcon = RefreshCw;
  readonly ReturnIcon = CalendarClock;
  readonly SalesIcon = CircleDollarSign;
  readonly TotalIcon = TrendingUp;
  readonly PaidIcon = Coins;

  readonly maxDevelopmentFunding = computed(() =>
    Math.max(
      0,
      ...(this.overview()?.captacaoPorEmpreendimento ?? []).map(
        (item) => item.totalCaptado,
      ),
    ),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.dashboardService.getOverview().subscribe({
      next: (overview) => {
        if (sequence !== this.loadSequence) return;
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar o dashboard.'),
        );
      },
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  developmentCount(status: string): number {
    return (
      this.overview()?.empreendimentosPorStatus[
        status as keyof DashboardOverview['empreendimentosPorStatus']
      ] ?? 0
    );
  }

  unitCount(status: string): number {
    return (
      this.overview()?.unidadesPorStatus[
        status as keyof DashboardOverview['unidadesPorStatus']
      ] ?? 0
    );
  }

  percentage(value: number, total: number): number {
    if (total <= 0 || value <= 0) return 0;
    return Math.min(100, Math.max(3, (value / total) * 100));
  }

  interactionTypeLabel(type: InteractionType): string {
    const labels: Record<InteractionType, string> = {
      REUNIAO: 'Reunião',
      LIGACAO: 'Ligação',
      WHATSAPP: 'WhatsApp',
      EMAIL: 'E-mail',
      OUTRO: 'Outro',
    };
    return labels[type];
  }
}
