import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith, tap } from 'rxjs';
import { LucideAngularModule, X } from 'lucide-angular';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, LucideAngularModule],
  template: `
    @if (isLoginPage()) {
      <router-outlet />
    } @else {
      <div class="flex h-screen overflow-hidden">
        <div class="hidden shrink-0 md:block">
          <app-sidebar />
        </div>

        @if (mobileMenuOpen()) {
          <div
            class="fixed inset-0 z-50 bg-black/40 md:hidden"
            role="presentation"
            (click)="closeMobileMenu()"
          >
            <div class="relative h-full w-64" (click)="$event.stopPropagation()">
              <app-sidebar />
              <button
                type="button"
                (click)="closeMobileMenu()"
                class="absolute right-3 top-3 rounded-lg border border-border bg-card p-2 text-ink shadow-card"
                aria-label="Fechar navegação"
              >
                <lucide-icon [img]="XIcon" [size]="17"></lucide-icon>
              </button>
            </div>
          </div>
        }

        <div class="flex flex-1 flex-col overflow-hidden">
          <app-header (menuToggle)="openMobileMenu()" />
          <main class="flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:p-8">
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
})
export class AppComponent {
  private readonly router = inject(Router);
  readonly mobileMenuOpen = signal(false);
  readonly XIcon = X;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      tap(() => this.mobileMenuOpen.set(false)),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  isLoginPage(): boolean {
    return this.currentUrl().startsWith('/login');
  }

  openMobileMenu(): void {
    this.mobileMenuOpen.set(true);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
