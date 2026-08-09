import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogOut, LucideAngularModule, Menu } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <header
      class="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6 md:justify-end"
    >
      <button
        type="button"
        (click)="menuToggle.emit()"
        [attr.aria-expanded]="menuOpen"
        aria-controls="mobile-navigation-dialog"
        class="rounded-lg border border-border p-2 text-ink transition-colors hover:bg-surface-warm md:hidden"
        aria-label="Abrir navegação"
      >
        <lucide-icon [img]="MenuIcon" [size]="18"></lucide-icon>
      </button>
      <a
        routerLink="/account/security"
        class="flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-warm"
        aria-label="Abrir segurança da conta"
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
        >
          {{ initials }}
        </div>
        <span class="hidden text-sm font-medium text-ink sm:inline">{{
          userEmail
        }}</span>
      </a>
      <button
        type="button"
        (click)="logout()"
        class="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-warm transition-colors"
      >
        <lucide-icon [img]="LogOutIcon" [size]="16"></lucide-icon>
        Sair
      </button>
    </header>
  `,
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly session = inject(AuthSessionService);
  @Output() readonly menuToggle = new EventEmitter<void>();
  @Input() menuOpen = false;

  readonly userEmail = this.session.getClaims()?.email ?? 'Conta Harpia';
  readonly initials = this.userEmail.slice(0, 2).toUpperCase();
  readonly LogOutIcon = LogOut;
  readonly MenuIcon = Menu;

  logout(): void {
    this.authService.logout();
  }
}
