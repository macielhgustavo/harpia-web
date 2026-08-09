export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MAX_UTF8_BYTES = 72;

export type PasswordRequirementKey =
  | 'length'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'special'
  | 'surrounding-whitespace'
  | 'utf8-bytes'
  | 'email';

export interface PasswordRequirementState {
  readonly key: PasswordRequirementKey;
  readonly label: string;
  readonly met: boolean;
}

export interface PasswordPolicyEvaluation {
  readonly isValid: boolean;
  readonly utf8ByteLength: number;
  readonly requirements: readonly PasswordRequirementState[];
}

const utf8Encoder = new TextEncoder();

/**
 * Avalia no cliente a mesma política usada pelo backend para novas senhas.
 * A regra de e-mail só é incluída quando o e-mail da conta é conhecido.
 */
export function evaluatePasswordPolicy(
  password: string,
  email?: string | null,
): PasswordPolicyEvaluation {
  const utf8ByteLength = utf8Encoder.encode(password).length;
  const normalizedEmail = email?.trim().toLowerCase() ?? '';

  const requirements: PasswordRequirementState[] = [
    {
      key: 'length',
      label: `Entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres`,
      met:
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      key: 'uppercase',
      label: 'Uma letra maiúscula',
      met: /[A-Z]/.test(password),
    },
    {
      key: 'lowercase',
      label: 'Uma letra minúscula',
      met: /[a-z]/.test(password),
    },
    {
      key: 'number',
      label: 'Um número',
      met: /[0-9]/.test(password),
    },
    {
      key: 'special',
      label: 'Um caractere especial',
      met: /[^A-Za-z0-9]/.test(password),
    },
    {
      key: 'surrounding-whitespace',
      label: 'Sem espaços no início ou no fim',
      met: password === password.trim(),
    },
    {
      key: 'utf8-bytes',
      label: `No máximo ${PASSWORD_MAX_UTF8_BYTES} bytes em UTF-8`,
      met: utf8ByteLength <= PASSWORD_MAX_UTF8_BYTES,
    },
  ];

  if (normalizedEmail) {
    requirements.push({
      key: 'email',
      label: 'Não contém o e-mail completo da conta',
      met: !password.toLowerCase().includes(normalizedEmail),
    });
  }

  return {
    isValid: requirements.every((requirement) => requirement.met),
    utf8ByteLength,
    requirements,
  };
}

export function isPasswordPolicySatisfied(
  password: string,
  email?: string | null,
): boolean {
  return evaluatePasswordPolicy(password, email).isValid;
}
