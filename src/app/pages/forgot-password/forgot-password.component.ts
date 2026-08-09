import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';
import { extractError } from '../../shared/utils/http-error';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card
      title="Recupere seu acesso"
      subtitle="Informe seu e-mail para receber as instruções de redefinição."
      titleId="forgot-password-title"
    >
      @if (successMessage()) {
        <div
          class="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-primary"
          role="status"
          aria-live="polite"
        >
          {{ successMessage() }}
        </div>

        <a
          routerLink="/login"
          class="mt-5 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Voltar para entrar
        </a>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="space-y-5"
          novalidate
        >
          <div>
            <label
              for="recovery-email"
              class="mb-1 block text-sm font-medium text-ink"
            >
              E-mail
            </label>
            <input
              id="recovery-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              [class.border-red-400]="emailInvalid()"
              [attr.aria-invalid]="emailInvalid()"
              [attr.aria-describedby]="
                emailInvalid() ? 'recovery-email-error' : null
              "
              placeholder="seu@email.com"
            />
            @if (emailInvalid()) {
              <p id="recovery-email-error" class="mt-1 text-xs text-red-700">
                @if (form.controls.email.errors?.['required']) {
                  Informe seu e-mail.
                } @else {
                  Informe um e-mail válido.
                }
              </p>
            }
          </div>

          <p class="text-xs leading-5 text-muted">
            Por segurança, a confirmação será a mesma mesmo que o e-mail não
            esteja cadastrado.
          </p>

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
            {{ loading() ? 'Enviando...' : 'Enviar instruções' }}
          </button>
        </form>

        <p class="mt-5 text-center text-sm text-muted">
          Lembrou sua senha?
          <a
            routerLink="/login"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Voltar para entrar
          </a>
        </p>
      }
    </app-auth-card>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
  });

  emailInvalid(): boolean {
    const email = this.form.controls.email;
    return email.invalid && email.touched;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.forgotPassword(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage.set(response.message);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 429
            ? 'Muitas solicitações. Aguarde um momento e tente novamente.'
            : extractError(
                error,
                'Não foi possível solicitar a redefinição. Tente novamente.',
              ),
        );
      },
    });
  }
}
