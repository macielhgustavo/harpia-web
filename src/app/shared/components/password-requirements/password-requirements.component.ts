import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { evaluatePasswordPolicy } from '../../utils/password-policy';

@Component({
  selector: 'app-password-requirements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-lg border border-border bg-surface-warm p-3"
      aria-label="Requisitos da senha"
    >
      <p class="text-xs font-semibold text-ink">A senha deve conter:</p>
      <ul class="mt-2 grid gap-1.5 text-xs" role="list" aria-live="polite">
        @for (requirement of evaluation().requirements; track requirement.key) {
          <li
            class="flex items-start gap-2"
            [class.text-primary]="requirement.met"
            [class.text-muted]="!requirement.met"
            [attr.data-requirement]="requirement.key"
            [attr.data-state]="requirement.met ? 'met' : 'unmet'"
          >
            <span
              class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
              [class.border-primary]="requirement.met"
              [class.bg-primary]="requirement.met"
              [class.text-white]="requirement.met"
              [class.border-border]="!requirement.met"
              aria-hidden="true"
            >
              {{ requirement.met ? '✓' : '·' }}
            </span>
            <span>{{ requirement.label }}</span>
            <span class="sr-only">
              {{
                requirement.met
                  ? 'Requisito atendido'
                  : 'Requisito não atendido'
              }}
            </span>
          </li>
        }
      </ul>
    </section>
  `,
})
export class PasswordRequirementsComponent {
  readonly password = input('');
  readonly email = input<string | null>(null);

  readonly evaluation = computed(() =>
    evaluatePasswordPolicy(this.password(), this.email()),
  );

  readonly isValid = computed(() => this.evaluation().isValid);
}
