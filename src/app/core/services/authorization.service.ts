import { Injectable, inject } from '@angular/core';
import {
  ACCESS_DENIED_ROUTE,
  AppPermission,
  ROLE_PERMISSIONS,
  firstAccessibleRouteForRole,
  roleHasPermission,
} from '../config/rbac.config';
import { UserRole, isUserRole } from '../models/user-role.model';
import { AuthSessionService } from './auth-session.service';

/**
 * Provides permission hints for frontend UX only. API authorization remains
 * authoritative and reloads the account role for every protected request.
 */
@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly session = inject(AuthSessionService);

  get role(): UserRole | null {
    const role: unknown = this.session.getClaims()?.role;
    return isUserRole(role) ? role : null;
  }

  get permissions(): readonly AppPermission[] {
    const role = this.role;
    return role ? ROLE_PERMISSIONS[role] : [];
  }

  hasPermission(permission: AppPermission): boolean {
    const role = this.role;
    return role ? roleHasPermission(role, permission) : false;
  }

  hasAnyPermission(permissions: readonly AppPermission[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: readonly AppPermission[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  firstAccessibleRoute(): string {
    return firstAccessibleRouteForRole(this.role);
  }

  canAccessApplication(): boolean {
    return this.firstAccessibleRoute() !== ACCESS_DENIED_ROUTE;
  }
}
