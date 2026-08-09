import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let session: jasmine.SpyObj<AuthSessionService>;
  let router: jasmine.SpyObj<Router>;
  let loginTree: UrlTree;

  beforeEach(() => {
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', [
      'getToken',
      'isAuthenticated',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    loginTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(loginTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: session },
        { provide: Router, useValue: router },
      ],
    });
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('allows a valid session', () => {
    session.getToken.and.returnValue('valid-token');
    session.isAuthenticated.and.returnValue(true);

    expect(runGuard('/dashboard')).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects a missing session without an expiration reason', () => {
    session.getToken.and.returnValue(null);
    session.isAuthenticated.and.returnValue(false);

    expect(runGuard('/developments?page=2')).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { returnUrl: '/developments?page=2' },
    });
  });

  it('marks a present but invalid token as an expired session', () => {
    session.getToken.and.returnValue('expired-or-malformed-token');
    session.isAuthenticated.and.returnValue(false);

    expect(runGuard('/account/security')).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: {
        reason: 'session-expired',
        returnUrl: '/account/security',
      },
    });
  });

  it('drops an unsafe return URL', () => {
    session.getToken.and.returnValue(null);
    session.isAuthenticated.and.returnValue(false);

    expect(runGuard('//attacker.example')).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: undefined,
    });
  });
});
