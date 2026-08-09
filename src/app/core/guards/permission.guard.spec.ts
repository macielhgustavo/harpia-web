import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { APP_PERMISSIONS } from '../config/rbac.config';
import { AuthorizationService } from '../services/authorization.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  let authorization: jasmine.SpyObj<AuthorizationService>;
  let router: jasmine.SpyObj<Router>;
  let accessDeniedTree: UrlTree;

  beforeEach(() => {
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    accessDeniedTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(accessDeniedTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthorizationService, useValue: authorization },
        { provide: Router, useValue: router },
      ],
    });
  });

  function runGuard(permission?: unknown) {
    const route = {
      data:
        permission === undefined
          ? {}
          : {
              permission,
            },
    } as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(() =>
      permissionGuard(route, {} as RouterStateSnapshot),
    );
  }

  it('allows a route when its declared permission is granted', () => {
    authorization.hasPermission.and.returnValue(true);

    expect(runGuard(APP_PERMISSIONS.USERS_MANAGE)).toBeTrue();
    expect(authorization.hasPermission).toHaveBeenCalledOnceWith(
      APP_PERMISSIONS.USERS_MANAGE,
    );
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects a denied permission to access-denied', () => {
    authorization.hasPermission.and.returnValue(false);

    expect(runGuard(APP_PERMISSIONS.AUDIT_READ)).toBe(accessDeniedTree);
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/access-denied']);
  });

  it('fails closed when permission metadata is missing or unknown', () => {
    expect(runGuard()).toBe(accessDeniedTree);
    expect(authorization.hasPermission).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/access-denied']);

    router.createUrlTree.calls.reset();
    expect(runGuard('SUPER_PERMISSION')).toBe(accessDeniedTree);
    expect(authorization.hasPermission).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/access-denied']);
  });
});
