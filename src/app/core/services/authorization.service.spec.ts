import { TestBed } from '@angular/core/testing';
import { ALL_APP_PERMISSIONS, APP_PERMISSIONS } from '../config/rbac.config';
import { AuthTokenClaims } from '../models/auth.model';
import { AuthSessionService } from './auth-session.service';
import { AuthorizationService } from './authorization.service';

function claims(role: unknown): AuthTokenClaims {
  return {
    sub: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-1',
    tokenVersion: 1,
    role,
    exp: Math.floor(Date.now() / 1000) + 300,
  } as AuthTokenClaims;
}

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let session: jasmine.SpyObj<AuthSessionService>;

  beforeEach(() => {
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', [
      'getClaims',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthSessionService, useValue: session }],
    });
    service = TestBed.inject(AuthorizationService);
  });

  it('grants permissions from the current recognized role', () => {
    session.getClaims.and.returnValue(claims('OWNER'));

    expect(service.role).toBe('OWNER');
    expect(service.permissions).toEqual(ALL_APP_PERMISSIONS);
    expect(service.hasPermission(APP_PERMISSIONS.USERS_MANAGE)).toBeTrue();
    expect(
      service.hasAllPermissions([
        APP_PERMISSIONS.USERS_MANAGE,
        APP_PERMISSIONS.AUDIT_READ,
      ]),
    ).toBeTrue();
  });

  it('denies permissions that are absent from a recognized role', () => {
    session.getClaims.and.returnValue(claims('LEITURA'));

    expect(service.hasPermission(APP_PERMISSIONS.PEOPLE_READ)).toBeTrue();
    expect(service.hasPermission(APP_PERMISSIONS.DASHBOARD_READ)).toBeFalse();
    expect(
      service.hasAnyPermission([
        APP_PERMISSIONS.DASHBOARD_READ,
        APP_PERMISSIONS.USERS_MANAGE,
      ]),
    ).toBeFalse();
    expect(service.firstAccessibleRoute()).toBe('/people');
  });

  it('fails closed when claims are missing or carry an unknown role', () => {
    session.getClaims.and.returnValue(claims('SUPER_ADMIN'));

    expect(service.role).toBeNull();
    expect(service.permissions).toEqual([]);
    expect(service.hasPermission(APP_PERMISSIONS.PEOPLE_READ)).toBeFalse();
    expect(service.firstAccessibleRoute()).toBe('/access-denied');
    expect(service.canAccessApplication()).toBeFalse();

    session.getClaims.and.returnValue(null);
    expect(service.hasPermission(APP_PERMISSIONS.PEOPLE_READ)).toBeFalse();
  });
});
