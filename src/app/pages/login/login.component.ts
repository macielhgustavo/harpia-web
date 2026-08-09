import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { safeInternalReturnUrl } from '../../core/services/auth-session.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';
import { extractError } from '../../shared/utils/http-error';

const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/forgot-password',
  '/reset-password',
]);

function safeLoginReturnUrl(value: string | null): string | null {
  const safeUrl = safeInternalReturnUrl(value);
  if (!safeUrl) {
    return null;
  }

  const decodedUrl = decodeURIComponent(safeUrl);
  const path = decodedUrl.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return PUBLIC_AUTH_PATHS.has(path) ? null : safeUrl;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card
      title="Acesse sua conta"
      subtitle="Entre para continuar na gestão de investidores."
      titleId="login-title"
    >
      @if (feedbackMessage()) {
        <div
          class="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-primary"
          role="status"
          aria-live="polite"
        >
          {{ feedbackMessage() }}
        </div>
      }

      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="space-y-5"
        novalidate
      >
        <div>
          <label for="email" class="mb-1 block text-sm font-medium text-ink"
            >E-mail</label
          >
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            [class.border-red-400]="isInvalid('email')"
            [attr.aria-invalid]="isInvalid('email')"
            [attr.aria-describedby]="
              isInvalid('email') ? 'login-email-error' : null
            "
            placeholder="seu@email.com"
          />
          @if (isInvalid('email')) {
            <p id="login-email-error" class="mt-1 text-xs text-red-700">
              @if (form.controls.email.errors?.['required']) {
                Informe seu e-mail.
              } @else {
                Informe um e-mail válido.
              }
            </p>
          }
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between gap-3">
            <label for="password" class="block text-sm font-medium text-ink"
              >Senha</label
            >
            <a
              routerLink="/forgot-password"
              class="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </a>
          </div>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            [class.border-red-400]="isInvalid('password')"
            [attr.aria-invalid]="isInvalid('password')"
            [attr.aria-describedby]="
              isInvalid('password') ? 'login-password-error' : null
            "
            placeholder="••••••••"
          />
          @if (isInvalid('password')) {
            <p id="login-password-error" class="mt-1 text-xs text-red-700">
              Informe sua senha.
            </p>
          }
        </div>

        @if (errorMessage()) {
          <div
            class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="w-full rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </app-auth-card>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly feedbackMessage = signal(
    this.feedbackFor(this.route.snapshot.queryParamMap.get('reason')),
  );

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: ['', Validators.required],
  });

  isInvalid(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = safeLoginReturnUrl(
          this.route.snapshot.queryParamMap.get('returnUrl'),
        );
        void this.router.navigateByUrl(returnUrl ?? '/dashboard', {
          replaceUrl: true,
        });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.errorMessage.set('E-mail ou senha inválidos.');
        } else if (error instanceof HttpErrorResponse && error.status === 429) {
          this.errorMessage.set(
            'Muitas tentativas. Aguarde um momento e tente novamente.',
          );
        } else if (error instanceof HttpErrorResponse && error.status === 400) {
          this.errorMessage.set(
            extractError(
              error,
              'Verifique os dados informados e tente novamente.',
            ),
          );
        } else {
          this.errorMessage.set(
            'Não foi possível acessar o Harpia agora. Tente novamente em instantes.',
          );
        }
      },
    });
  }

  private feedbackFor(reason: string | null): string {
    switch (reason) {
      case 'password-changed':
        return 'Senha alterada com sucesso. Entre novamente para continuar.';
      case 'password-reset':
        return 'Senha redefinida com sucesso. Entre com sua nova senha.';
      case 'session-expired':
        return 'Sua sessão expirou ou foi revogada. Entre novamente.';
      default:
        return '';
    }
  }
}
