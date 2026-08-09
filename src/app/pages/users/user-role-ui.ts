import {
  UserRole,
  isUserRole,
  manageableUserRoleOptions,
  userRoleLabel as sharedUserRoleLabel,
} from '../../core/models/user-role.model';

const ROLE_BADGES: Record<UserRole, string> = {
  OWNER: 'bg-gold-light text-gold-dark',
  ADMIN: 'bg-primary/10 text-primary',
  FINANCEIRO: 'bg-blue-50 text-blue-800',
  COMERCIAL: 'bg-violet-50 text-violet-800',
  OPERACIONAL: 'bg-amber-50 text-amber-800',
  LEITURA: 'bg-surface-warm text-muted',
};

export function userRoleLabel(role: UserRole): string {
  return sharedUserRoleLabel(role);
}

export function userRoleBadge(role: UserRole): string {
  return ROLE_BADGES[role];
}

export function manageableUserRoles(
  actorRole: UserRole | null,
): readonly UserRole[] {
  return manageableUserRoleOptions(actorRole).map((option) => option.value);
}

export function asUserRole(value: string | null | undefined): UserRole | null {
  return isUserRole(value) ? value : null;
}
