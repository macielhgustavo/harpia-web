import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KeyRound, LucideAngularModule, ShieldCheck } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { PasswordRequirementsComponent } from '../../shared/components/password-requirements/password-requirements.component';
import { extractError } from '../../shared/utils/http-error';
import { isPasswordPolicySatisfied } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    PasswordRequirementsComponent,
  ],
  template: `
    <div class="mx-auto max-w-3xl space-y-6">
      <header>
        <p class="text-sm font-medium text-primary">Minha conta</p>
        <h1 class="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
          Segurança
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Atualize sua senha para manter o acesso à conta protegido.
        </p>
      </header>

      <section
        class="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
        aria-labelledby="change-password-title"
      >
        <div class="mb-6 flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-light text-gold-dark"
            aria-hidden="true"
          >
            <lucide-icon [img]="ShieldIcon" [size]="20"></lucide-icon>
          </span>
          <div>
            <h2 id="change-password-title" class="font-semibold text-ink">
              Alterar senha
            </h2>
            <p class="mt-1 text-sm leading-5 text-muted">
              Após a alteração, todas as sessões serão encerradas e você
              precisará entrar novamente.
            </p>
          </div>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="max-w-xl space-y-5"
          novalidate
        >
          <div>
            <label
              for="current-password"
              class="mb-1 block text-sm font-medium text-ink"
            >
              Senha atual
            </label>
            <input
              id="current-password"
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              [class.border-red-400]="currentPasswordInvalid()"
              [attr.aria-invalid]="currentPasswordInvalid()"
              [attr.aria-describedby]="
                currentPasswordInvalid() ? 'current-password-error' : null
              "
            />
            @if (currentPasswordInvalid()) {
              <p id="current-password-error" class="mt-1 text-xs text-red-700">
                Informe sua senha atual.
              </p>
            }
          </div>

          <div>
            <label
              for="account-new-password"
              class="mb-1 block text-sm font-medium text-ink"
            >
              Nova senha
            </label>
            <input
              id="account-new-password"
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              maxlength="128"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              [class.border-red-400]="newPasswordInvalid() || sameAsCurrent()"
              [attr.aria-invalid]="newPasswordInvalid() || sameAsCurrent()"
              aria-describedby="account-password-requirements"
              [attr.aria-errormessage]="
                sameAsCurrent() ? 'account-new-password-error' : null
              "
            />
            @if (sameAsCurrent()) {
              <p
                id="account-new-password-error"
                class="mt-1 text-xs text-red-700"
                role="alert"
              >
                A nova senha deve ser diferente da senha atual.
              </p>
            }
          </div>

          <div id="account-password-requirements">
            <app-password-requirements
              [password]="form.controls.newPassword.value"
              [email]="accountEmail"
            />
            @if (!accountEmail) {
              <p class="mt-2 text-xs leading-5 text-muted">
                A senha também não pode conter o e-mail completo da conta.
              </p>
            }
          </div>

          <div>
            <label
              for="account-confirm-password"
              class="mb-1 block text-sm font-medium text-ink"
            >
              Confirme a nova senha
            </label>
            <input
              id="account-confirm-password"
              type="password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              maxlength="128"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              [class.border-red-400]="confirmationInvalid()"
              [attr.aria-invalid]="confirmationInvalid()"
              [attr.aria-describedby]="
                confirmationInvalid() ? 'account-confirm-password-error' : null
              "
            />
            @if (confirmationInvalid()) {
              <p
                id="account-confirm-password-error"
                class="mt-1 text-xs text-red-700"
              >
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

          <div
            class="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end"
          >
            <a
              routerLink="/dashboard"
              class="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-surface-warm"
            >
              Cancelar
            </a>
            <button
              type="submit"
              [disabled]="!canSubmit()"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <lucide-icon [img]="KeyIcon" [size]="17"></lucide-icon>
              {{ loading() ? 'Alterando...' : 'Alterar senha' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class AccountSecurityComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly session = inject(AuthSessionService);

  readonly ShieldIcon = ShieldCheck;
  readonly KeyIcon = KeyRound;
  readonly accountEmail = this.session.getClaims()?.email ?? null;
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);

  private readonly passwordPolicyValidator: ValidatorFn = (
    control: AbstractControl<string>,
  ): ValidationErrors | null =>
    isPasswordPolicySatisfied(control.value, this.accountEmail)
      ? null
      : { passwordPolicy: true };

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, this.passwordPolicyValidator]],
    confirmPassword: ['', Validators.required],
  });

  currentPasswordInvalid(): boolean {
    const currentPassword = this.form.controls.currentPassword;
    return (
      currentPassword.invalid && (currentPassword.touched || this.submitted())
    );
  }

  newPasswordInvalid(): boolean {
    const newPassword = this.form.controls.newPassword;
    return newPassword.invalid && (newPassword.touched || this.submitted());
  }

  sameAsCurrent(): boolean {
    const { currentPassword, newPassword } = this.form.getRawValue();
    return (
      newPassword.length > 0 &&
      newPassword === currentPassword &&
      (this.form.controls.newPassword.touched || this.submitted())
    );
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
      this.form.valid &&
      !this.sameAsCurrentValue() &&
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

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.authService
      .changePassword({ currentPassword, newPassword })
      .subscribe({
        next: () => this.loading.set(false),
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(
            extractError(
              error,
              'Não foi possível alterar a senha. Verifique a senha atual e tente novamente.',
            ),
          );
        },
      });
  }

  private sameAsCurrentValue(): boolean {
    const { currentPassword, newPassword } = this.form.getRawValue();
    return newPassword.length > 0 && newPassword === currentPassword;
  }

  private confirmationInvalidValue(): boolean {
    return (
      this.form.controls.confirmPassword.value !==
      this.form.controls.newPassword.value
    );
  }
}
