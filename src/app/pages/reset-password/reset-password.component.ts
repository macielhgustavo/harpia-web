import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';
import { PasswordRequirementsComponent } from '../../shared/components/password-requirements/password-requirements.component';
import { extractError } from '../../shared/utils/http-error';
import { isPasswordPolicySatisfied } from '../../shared/utils/password-policy';

const passwordPolicyValidator: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null =>
  isPasswordPolicySatisfied(control.value) ? null : { passwordPolicy: true };

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthCardComponent,
    PasswordRequirementsComponent,
  ],
  template: `
    <app-auth-card
      title="Defina uma nova senha"
      subtitle="Crie uma senha forte para recuperar o acesso à sua conta."
      titleId="reset-password-title"
    >
      @if (!hasToken) {
        <div
          class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          role="alert"
        >
          Este link de redefinição está incompleto. Solicite um novo link para
          continuar.
        </div>
        <a
          routerLink="/forgot-password"
          class="mt-5 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Solicitar novo link
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
              for="new-password"
              class="mb-1 block text-sm font-medium text-ink"
            >
              Nova senha
            </label>
            <input
              id="new-password"
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              maxlength="128"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              [class.border-red-400]="newPasswordInvalid()"
              [attr.aria-invalid]="newPasswordInvalid()"
              aria-describedby="reset-password-requirements"
            />
          </div>

          <div id="reset-password-requirements">
            <app-password-requirements
              [password]="form.controls.newPassword.value"
            />
            <p class="mt-2 text-xs leading-5 text-muted">
              A senha também não pode conter o e-mail completo da conta.
            </p>
          </div>

          <div>
            <label
              for="confirm-password"
              class="mb-1 block text-sm font-medium text-ink"
            >
              Confirme a nova senha
            </label>
            <input
              id="confirm-password"
              type="password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              maxlength="128"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              [class.border-red-400]="confirmationInvalid()"
              [attr.aria-invalid]="confirmationInvalid()"
              [attr.aria-describedby]="
                confirmationInvalid() ? 'confirm-password-error' : null
              "
            />
            @if (confirmationInvalid()) {
              <p id="confirm-password-error" class="mt-1 text-xs text-red-700">
                @if (form.controls.confirmPassword.errors?.['required']) {
                  Confirme a nova senha.
                } @else {
                  As senhas não coincidem.
                }
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

          @if (invalidToken()) {
            <a
              routerLink="/forgot-password"
              class="flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-warm"
            >
              Solicitar novo link
            </a>
          }

          <button
            type="submit"
            [disabled]="!canSubmit()"
            class="w-full rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading() ? 'Redefinindo...' : 'Redefinir senha' }}
          </button>
        </form>

        <p class="mt-5 text-center text-sm text-muted">
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
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly resetToken =
    this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';

  readonly hasToken = this.resetToken.length > 0;
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly invalidToken = signal(false);
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, passwordPolicyValidator]],
    confirmPassword: ['', Validators.required],
  });

  newPasswordInvalid(): boolean {
    const password = this.form.controls.newPassword;
    return password.invalid && (password.touched || this.submitted());
  }

  confirmationInvalid(): boolean {
    const confirmation = this.form.controls.confirmPassword;
    return (
      (confirmation.invalid ||
        confirmation.value !== this.form.controls.newPassword.value) &&
      (confirmation.touched || this.submitted())
    );
  }

  canSubmit(): boolean {
    return (
      this.hasToken &&
      this.form.valid &&
      !this.confirmationInvalidValue() &&
      !this.loading()
    );
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.invalidToken.set(false);

    this.authService
      .resetPassword({
        token: this.resetToken,
        newPassword: this.form.controls.newPassword.value,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          const message =
            error instanceof HttpErrorResponse && error.status === 429
              ? 'Muitas tentativas. Aguarde um momento e solicite um novo link.'
              : extractError(
                  error,
                  'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.',
                );
          this.errorMessage.set(message);
          this.invalidToken.set(
            message.toLocaleLowerCase('pt-BR').includes('token de redefinição'),
          );
        },
      });
  }

  private confirmationInvalidValue(): boolean {
    return (
      this.form.controls.confirmPassword.value !==
      this.form.controls.newPassword.value
    );
  }
}
