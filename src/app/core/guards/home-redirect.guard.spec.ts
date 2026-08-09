import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { AuthorizationService } from '../services/authorization.service';
import { homeRedirectGuard } from './home-redirect.guard';

describe('homeRedirectGuard', () => {
  let authenticated: boolean;
  let firstAccessibleRoute: jasmine.Spy;

  beforeEach(() => {
    authenticated = true;
    firstAccessibleRoute = jasmine.createSpy().and.returnValue('/people');

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: { isAuthenticated: () => authenticated },
        },
        {
          provide: AuthorizationService,
          useValue: { firstAccessibleRoute },
        },
      ],
    });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() =>
      homeRedirectGuard({} as never, {} as never),
    );
  }

  it('redireciona a raiz para a primeira rota permitida', () => {
    const router = TestBed.inject(Router);
    const result = runGuard();

    expect(router.serializeUrl(result as never)).toBe('/people');
    expect(firstAccessibleRoute).toHaveBeenCalled();
  });

  it('manda sessão ausente para o login sem consultar permissões', () => {
    authenticated = false;
    const router = TestBed.inject(Router);
    const result = runGuard();

    expect(router.serializeUrl(result as never)).toBe('/login');
    expect(firstAccessibleRoute).not.toHaveBeenCalled();
  });
});
