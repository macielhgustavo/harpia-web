import { TestBed } from '@angular/core/testing';
import {
  AuthSessionService,
  safeInternalReturnUrl,
} from './auth-session.service';

function encodeSegment(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(
  exp: number,
  overrides: Record<string, unknown> = {},
): string {
  const header = encodeSegment({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeSegment({
    sub: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-1',
    tokenVersion: 1,
    role: 'OWNER',
    exp,
    ...overrides,
  });
  return `${header}.${payload}.signature`;
}

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => localStorage.clear());

  it('stores and accepts a well-formed unexpired JWT', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 300);

    service.setToken(token);

    expect(service.getToken()).toBe(token);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getClaims()?.sub).toBe('user-1');
  });

  it('rejects and removes an expired JWT', () => {
    service.setToken(makeToken(Math.floor(Date.now() / 1000) - 1));

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('rejects and removes malformed or incomplete JWTs', () => {
    service.setToken('not-a-jwt');
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();

    service.setToken(makeToken(Number.NaN, { exp: undefined }));
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('only clears the token that initiated session invalidation', () => {
    const oldToken = makeToken(Math.floor(Date.now() / 1000) + 300);
    const newToken = makeToken(Math.floor(Date.now() / 1000) + 600, {
      tokenVersion: 2,
    });
    service.setToken(newToken);

    expect(service.clearToken(null)).toBeFalse();
    expect(service.getToken()).toBe(newToken);
    expect(service.clearToken(oldToken)).toBeFalse();
    expect(service.getToken()).toBe(newToken);
    expect(service.clearToken(newToken)).toBeTrue();
    expect(service.clearToken(newToken)).toBeFalse();
  });
});

describe('safeInternalReturnUrl', () => {
  it('accepts application-relative URLs with query strings', () => {
    expect(safeInternalReturnUrl('/developments?page=2')).toBe(
      '/developments?page=2',
    );
  });

  it('rejects absolute, protocol-relative, backslash and malformed URLs', () => {
    expect(safeInternalReturnUrl('https://example.com')).toBeNull();
    expect(safeInternalReturnUrl('//example.com')).toBeNull();
    expect(safeInternalReturnUrl('/\\example.com')).toBeNull();
    expect(safeInternalReturnUrl('/%5cexample.com')).toBeNull();
    expect(safeInternalReturnUrl('/%not-encoded')).toBeNull();
  });
});
