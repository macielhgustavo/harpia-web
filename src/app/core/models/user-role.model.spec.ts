import {
  USER_ROLES,
  USER_ROLE_OPTIONS,
  isUserRole,
  manageableUserRoleOptions,
  userRoleLabel,
} from './user-role.model';

describe('user roles', () => {
  it('recognizes only the six backend roles', () => {
    for (const role of USER_ROLES) {
      expect(isUserRole(role)).toBeTrue();
    }

    expect(isUserRole('SUPER_ADMIN')).toBeFalse();
    expect(isUserRole('owner')).toBeFalse();
    expect(isUserRole(null)).toBeFalse();
  });

  it('provides one labelled option for every role', () => {
    expect(USER_ROLE_OPTIONS.map(({ value }) => value)).toEqual([
      ...USER_ROLES,
    ]);
    expect(userRoleLabel('FINANCEIRO')).toBe('Financeiro');
  });

  it('keeps OWNER unavailable to ADMIN and all role options unavailable to other actors', () => {
    expect(manageableUserRoleOptions('OWNER')).toEqual(USER_ROLE_OPTIONS);
    expect(
      manageableUserRoleOptions('ADMIN').map(({ value }) => value),
    ).toEqual(['ADMIN', 'FINANCEIRO', 'COMERCIAL', 'OPERACIONAL', 'LEITURA']);
    expect(manageableUserRoleOptions('FINANCEIRO')).toEqual([]);
    expect(manageableUserRoleOptions('UNKNOWN')).toEqual([]);
  });
});
