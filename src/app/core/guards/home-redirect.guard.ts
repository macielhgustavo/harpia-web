import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { AuthorizationService } from '../services/authorization.service';

/** Sends the entry route to the first page available for the current role. */
export const homeRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(AuthSessionService);
  const authorization = inject(AuthorizationService);

  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return router.parseUrl(authorization.firstAccessibleRoute());
};
