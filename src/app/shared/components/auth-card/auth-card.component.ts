import { Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  template: `
    <main
      class="flex min-h-screen items-center justify-center bg-surface px-4 py-8 sm:px-6"
    >
      <section
        class="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-card sm:p-8"
        [attr.aria-labelledby]="titleId()"
      >
        <div class="mb-7 text-center">
          <div
            class="mb-5 inline-flex items-center gap-2.5"
            aria-label="Harpia"
          >
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-bold text-white"
              aria-hidden="true"
            >
              H
            </span>
            <span class="text-2xl font-bold tracking-tight text-ink"
              >Harpia</span
            >
          </div>

          <h1 [id]="titleId()" class="text-2xl font-semibold text-ink">
            {{ title() }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-muted">{{ subtitle() }}</p>
        </div>

        <ng-content />
      </section>
    </main>
  `,
})
export class AuthCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly titleId = input('auth-page-title');
}
