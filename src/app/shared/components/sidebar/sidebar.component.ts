import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  Building2,
  Bell,
  CircleDollarSign,
  ChartNoAxesCombined,
  Coins,
  Columns3,
  FileSpreadsheet,
  Landmark,
  ListChecks,
  MailCheck,
  LayoutDashboard,
  LucideAngularModule,
  LucideIconData,
  MessageSquare,
  HandCoins,
  ReceiptText,
  ScrollText,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-angular';
import { NAVIGATION } from '../../../core/config/navigation.config';
import { userRoleLabel } from '../../../core/models/user-role.model';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { AuthorizationService } from '../../../core/services/authorization.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <aside class="flex h-screen w-64 flex-col border-r border-border bg-card">
      <!-- Logo -->
      <div class="flex items-center gap-2.5 px-6 py-6">
        <span
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
        >
          H
        </span>
        <span class="text-xl font-bold tracking-tight text-ink">Harpia</span>
      </div>

      <!-- Navegação -->
      <nav class="flex-1 overflow-y-auto px-3 py-2">
        @for (group of navigation; track group.label) {
          <div class="mb-4">
            @if (group.label) {
              <p
                class="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {{ group.label }}
              </p>
            }
            <div class="space-y-1">
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-gold-light text-gold-dark border-gold"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  class="flex items-center gap-3 rounded-r px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-warm transition-colors border-l-2 border-transparent"
                >
                  <lucide-icon
                    [img]="iconOf(item.icon)"
                    [size]="18"
                  ></lucide-icon>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
        }
      </nav>

      <!-- Perfil do usuário -->
      <div class="flex items-center gap-3 border-t border-border px-4 py-4">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
        >
          {{ initials }}
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-ink">{{ userEmail }}</p>
          <p class="text-xs text-muted">{{ roleLabel }}</p>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  private readonly authorization = inject(AuthorizationService);
  private readonly session = inject(AuthSessionService);
  private readonly claims = this.session.getClaims();

  readonly navigation = NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      this.authorization.hasPermission(item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  readonly userEmail = this.claims?.email ?? 'Conta Harpia';
  readonly initials = this.userEmail.slice(0, 2).toUpperCase();
  readonly roleLabel = this.claims
    ? userRoleLabel(this.claims.role)
    : 'Perfil indisponível';

  private readonly icons: Record<string, LucideIconData> = {
    LayoutDashboard,
    Users,
    MessageSquare,
    Building2,
    TrendingUp,
    Coins,
    Columns3,
    FileSpreadsheet,
    Landmark,
    Wallet,
    UserCog,
    UserPlus,
    ScrollText,
    CircleDollarSign,
    ReceiptText,
    HandCoins,
    ChartNoAxesCombined,
    ListChecks,
    MailCheck,
    Bell,
  };

  iconOf(name: string): LucideIconData {
    return this.icons[name] ?? LayoutDashboard;
  }
}
