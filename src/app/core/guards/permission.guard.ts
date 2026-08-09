import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
  ACCESS_DENIED_ROUTE,
  PERMISSION_ROUTE_DATA_KEY,
  isAppPermission,
} from '../config/rbac.config';
import { AuthorizationService } from '../services/authorization.service';

export const permissionGuard: CanActivateFn = (route) => {
  const authorization = inject(AuthorizationService);
  const router = inject(Router);
  const permission: unknown = route.data[PERMISSION_ROUTE_DATA_KEY];

  if (
    !isAppPermission(permission) ||
    !authorization.hasPermission(permission)
  ) {
    return router.createUrlTree([ACCESS_DENIED_ROUTE]);
  }

  return true;
};
