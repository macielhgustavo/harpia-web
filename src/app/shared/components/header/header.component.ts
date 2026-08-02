import { Component, EventEmitter, Output, inject } from '@angular/core';
import { LogOut, LucideAngularModule, Menu } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <header class="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6 md:justify-end">
      <button
        type="button"
        (click)="menuToggle.emit()"
        class="rounded-lg border border-border p-2 text-ink transition-colors hover:bg-surface-warm md:hidden"
        aria-label="Abrir navegação"
      >
        <lucide-icon [img]="MenuIcon" [size]="18"></lucide-icon>
      </button>
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          A
        </div>
        <span class="text-sm font-medium text-ink">{{ userName }}</span>
      </div>
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
  @Output() readonly menuToggle = new EventEmitter<void>();

  readonly userName = 'Admin Harpia';
  readonly LogOutIcon = LogOut;
  readonly MenuIcon = Menu;

  logout(): void {
    this.authService.logout();
  }
}
