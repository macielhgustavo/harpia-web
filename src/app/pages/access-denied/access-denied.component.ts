import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorizationService } from '../../core/services/authorization.service';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section
      class="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center"
      aria-labelledby="access-denied-title"
    >
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-surface-warm text-xl font-bold text-primary"
        aria-hidden="true"
        >!</span
      >
      <h1 id="access-denied-title" class="mt-5 text-2xl font-bold text-ink">
        Acesso não permitido
      </h1>
      <p class="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Seu perfil não possui permissão para abrir esta página. Se você precisa
        desse acesso, fale com um administrador da organização.
      </p>
      <a
        [routerLink]="fallbackRoute"
        class="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Ir para uma página disponível
      </a>
    </section>
  `,
})
export class AccessDeniedComponent {
  private readonly authorization = inject(AuthorizationService);
  readonly fallbackRoute = this.authorization.firstAccessibleRoute();
}
