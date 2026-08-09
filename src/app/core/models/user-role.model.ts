export const USER_ROLES = [
  'OWNER',
  'ADMIN',
  'FINANCEIRO',
  'COMERCIAL',
  'OPERACIONAL',
  'LEITURA',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserRoleOption {
  value: UserRole;
  label: string;
  description: string;
}

export const USER_ROLE_LABELS = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  FINANCEIRO: 'Financeiro',
  COMERCIAL: 'Comercial',
  OPERACIONAL: 'Operacional',
  LEITURA: 'Leitura',
} as const satisfies Readonly<Record<UserRole, string>>;

export const USER_ROLE_OPTIONS = [
  {
    value: 'OWNER',
    label: USER_ROLE_LABELS.OWNER,
    description: 'Acesso total, incluindo usuários, auditoria e finanças.',
  },
  {
    value: 'ADMIN',
    label: USER_ROLE_LABELS.ADMIN,
    description: 'Administra a organização, exceto contas de proprietário.',
  },
  {
    value: 'FINANCEIRO',
    label: USER_ROLE_LABELS.FINANCEIRO,
    description: 'Consulta a operação e gerencia dados financeiros.',
  },
  {
    value: 'COMERCIAL',
    label: USER_ROLE_LABELS.COMERCIAL,
    description: 'Gerencia pessoas, documentos e interações comerciais.',
  },
  {
    value: 'OPERACIONAL',
    label: USER_ROLE_LABELS.OPERACIONAL,
    description: 'Gerencia empreendimentos, unidades, preços e documentos.',
  },
  {
    value: 'LEITURA',
    label: USER_ROLE_LABELS.LEITURA,
    description: 'Consulta dados não financeiros sem permissão de alteração.',
  },
] as const satisfies readonly UserRoleOption[];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/**
 * Returns only the roles that the current actor may select in user and
 * invitation forms. The backend remains authoritative for every mutation.
 */
export function manageableUserRoleOptions(
  actorRole: unknown,
): readonly UserRoleOption[] {
  if (actorRole === 'OWNER') {
    return USER_ROLE_OPTIONS;
  }

  if (actorRole === 'ADMIN') {
    return USER_ROLE_OPTIONS.filter((option) => option.value !== 'OWNER');
  }

  return [];
}
