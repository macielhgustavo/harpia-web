import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
  AuthSessionService,
  safeInternalReturnUrl,
} from '../services/auth-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const hadToken = session.getToken() !== null;

  if (session.isAuthenticated()) {
    return true;
  }

  const returnUrl = safeInternalReturnUrl(state.url);
  const queryParams = {
    ...(hadToken ? { reason: 'session-expired' } : {}),
    ...(returnUrl ? { returnUrl } : {}),
  };

  return router.createUrlTree(['/login'], {
    queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });
};
