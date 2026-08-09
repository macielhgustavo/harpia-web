import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let api: jasmine.SpyObj<ApiService>;
  let session: jasmine.SpyObj<AuthSessionService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['post']);
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', [
      'setToken',
      'getToken',
      'clearToken',
      'isAuthenticated',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    session.getToken.and.returnValue('current-token');

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthSessionService, useValue: session },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('stores the JWT returned by login', () => {
    const request = { email: 'user@example.com', password: 'password' };
    api.post.and.returnValue(of({ access_token: 'signed-token' }));

    service.login(request).subscribe();

    expect(api.post).toHaveBeenCalledWith('/auth/login', request);
    expect(session.setToken).toHaveBeenCalledOnceWith('signed-token');
  });

  it('uses the password recovery contracts exposed by the API', () => {
    const forgotRequest = { email: 'user@example.com' };
    const resetRequest = { token: 'reset-token', newPassword: 'SenhaNova1!' };
    api.post.and.returnValue(of({ message: 'ok' }));

    service.forgotPassword(forgotRequest).subscribe();
    service.resetPassword(resetRequest).subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/auth/forgot-password',
      forgotRequest,
    );
    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', resetRequest);
    expect(session.clearToken).toHaveBeenCalledOnceWith('current-token');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { reason: 'password-reset' },
      replaceUrl: true,
    });
  });

  it('clears the revoked JWT and redirects after a successful password change', () => {
    const request = {
      currentPassword: 'SenhaAtual1!',
      newPassword: 'SenhaNova1!',
    };
    api.post.and.returnValue(of({ message: 'Senha alterada.' }));

    service.changePassword(request).subscribe();

    expect(api.post).toHaveBeenCalledWith('/auth/change-password', request);
    expect(session.clearToken).toHaveBeenCalledOnceWith('current-token');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { reason: 'password-changed' },
      replaceUrl: true,
    });
  });

  it('preserves a newer login when a delayed password reset finishes', () => {
    const response = new Subject<{ message: string }>();
    let storedToken: string | null = 'token-before-reset';
    session.getToken.and.callFake(() => storedToken);
    session.clearToken.and.callFake((expectedToken?: string | null) => {
      if (
        !storedToken ||
        (expectedToken !== undefined && storedToken !== expectedToken)
      ) {
        return false;
      }
      storedToken = null;
      return true;
    });
    api.post.and.returnValue(response);

    service
      .resetPassword({ token: 'reset-token', newPassword: 'SenhaNova1!' })
      .subscribe();
    storedToken = 'newer-login-token';
    response.next({ message: 'ok' });

    expect(storedToken).toBe('newer-login-token');
    expect(session.clearToken).toHaveBeenCalledOnceWith('token-before-reset');
  });

  it('preserves a newer login when a delayed password change finishes', () => {
    const response = new Subject<{ message: string }>();
    let storedToken: string | null = 'token-before-change';
    session.getToken.and.callFake(() => storedToken);
    session.clearToken.and.callFake((expectedToken?: string | null) => {
      if (
        !storedToken ||
        (expectedToken !== undefined && storedToken !== expectedToken)
      ) {
        return false;
      }
      storedToken = null;
      return true;
    });
    api.post.and.returnValue(response);

    service
      .changePassword({
        currentPassword: 'SenhaAtual1!',
        newPassword: 'SenhaNova1!',
      })
      .subscribe();
    storedToken = 'newer-login-token';
    response.next({ message: 'ok' });

    expect(storedToken).toBe('newer-login-token');
    expect(session.clearToken).toHaveBeenCalledOnceWith('token-before-change');
  });

  it('does not keep an unsafe return URL during logout', () => {
    service.logout('session-expired', '//attacker.example');

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { reason: 'session-expired' },
      replaceUrl: true,
    });
  });

  it('delegates session state and token access to the central store', () => {
    session.isAuthenticated.and.returnValue(true);
    session.getToken.and.returnValue('signed-token');

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getToken()).toBe('signed-token');
  });
});
