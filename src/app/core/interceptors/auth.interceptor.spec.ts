import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../services/auth-session.service';
import { authInterceptor } from './auth.interceptor';

function encodeSegment(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(exp = Math.floor(Date.now() / 1000) + 300): string {
  return `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment({
    sub: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-1',
    tokenVersion: 1,
    role: 'OWNER',
    exp,
  })}.signature`;
}

describe('authInterceptor', () => {
  let httpTesting: HttpTestingController;
  let http: HttpClient;
  let session: AuthSessionService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      url: '/developments?page=2',
    });
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('adds Bearer only to protected requests sent to the configured API', () => {
    const token = makeToken();
    session.setToken(token);

    http.get(`${environment.apiUrl}/companies`).subscribe();
    const apiRequest = httpTesting.expectOne(`${environment.apiUrl}/companies`);
    expect(apiRequest.request.headers.get('Authorization')).toBe(
      `Bearer ${token}`,
    );
    apiRequest.flush({});

    http.get('https://example.com/public-data').subscribe();
    const externalRequest = httpTesting.expectOne(
      'https://example.com/public-data',
    );
    expect(externalRequest.request.headers.has('Authorization')).toBeFalse();
    externalRequest.flush({});
  });

  it('does not attach Bearer or expire the session on public auth requests', () => {
    const token = makeToken();
    session.setToken(token);

    for (const path of [
      '/auth/register',
      '/auth/login',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/accept-invitation',
    ]) {
      http
        .post(`${environment.apiUrl}${path}`, {})
        .subscribe({ error: () => undefined });
      const request = httpTesting.expectOne(`${environment.apiUrl}${path}`);
      expect(request.request.headers.has('Authorization')).toBeFalse();
      request.flush(
        { message: 'Credenciais inválidas' },
        { status: 401, statusText: 'Unauthorized' },
      );
    }

    expect(session.getToken()).toBe(token);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ends a revoked protected session and redirects only once for concurrent 401s', () => {
    const token = makeToken();
    session.setToken(token);

    http
      .get(`${environment.apiUrl}/companies`)
      .subscribe({ error: () => undefined });
    http
      .get(`${environment.apiUrl}/developments`)
      .subscribe({ error: () => undefined });
    const requests = httpTesting.match((request) =>
      request.url.startsWith(environment.apiUrl),
    );

    requests.forEach((request) =>
      request.flush(
        { message: 'Sessão inválida' },
        { status: 401, statusText: 'Unauthorized' },
      ),
    );

    expect(session.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: {
        reason: 'session-expired',
        returnUrl: '/developments?page=2',
      },
      replaceUrl: true,
    });
  });

  it('redirects only once when concurrent protected 401s arrive after another tab removed the token', () => {
    http
      .get(`${environment.apiUrl}/companies`)
      .subscribe({ error: () => undefined });
    http
      .get(`${environment.apiUrl}/developments`)
      .subscribe({ error: () => undefined });
    const requests = httpTesting.match((request) =>
      request.url.startsWith(environment.apiUrl),
    );

    requests.forEach((request) =>
      request.flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      ),
    );

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: {
        reason: 'session-expired',
        returnUrl: '/developments?page=2',
      },
      replaceUrl: true,
    });
  });

  it('preserves a newer login created after a tokenless request started', () => {
    http
      .get(`${environment.apiUrl}/companies`)
      .subscribe({ error: () => undefined });
    const request = httpTesting.expectOne(`${environment.apiUrl}/companies`);
    const newerToken = makeToken(Math.floor(Date.now() / 1000) + 600);
    session.setToken(newerToken);

    request.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(session.getToken()).toBe(newerToken);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps the session when change-password reports the exact current-password error', () => {
    const token = makeToken();
    session.setToken(token);

    http
      .post(`${environment.apiUrl}/auth/change-password`, {})
      .subscribe({ error: () => undefined });
    const request = httpTesting.expectOne(
      `${environment.apiUrl}/auth/change-password`,
    );
    request.flush(
      { message: 'Senha atual inválida' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(session.getToken()).toBe(token);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ends the session for any other change-password 401', () => {
    session.setToken(makeToken());

    http
      .post(`${environment.apiUrl}/auth/change-password`, {})
      .subscribe({ error: () => undefined });
    const request = httpTesting.expectOne(
      `${environment.apiUrl}/auth/change-password`,
    );
    request.flush(
      { message: 'Sessão inválida' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(session.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('preserves the session on 403', () => {
    const token = makeToken();
    session.setToken(token);

    http
      .get(`${environment.apiUrl}/audit-logs`)
      .subscribe({ error: () => undefined });
    const request = httpTesting.expectOne(`${environment.apiUrl}/audit-logs`);
    request.flush(
      { message: 'Forbidden resource' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(session.getToken()).toBe(token);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('removes an expired JWT before an API request and redirects without attaching it', () => {
    session.setToken(makeToken(Math.floor(Date.now() / 1000) - 1));

    http.get(`${environment.apiUrl}/companies`).subscribe();
    const request = httpTesting.expectOne(`${environment.apiUrl}/companies`);

    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(session.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: {
        reason: 'session-expired',
        returnUrl: '/developments?page=2',
      },
      replaceUrl: true,
    });
    request.flush({});
  });
});
