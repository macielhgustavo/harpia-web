import type { UserRole } from './user-role.model';

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  personId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  role?: UserRole | '';
  isActive?: boolean;
  search?: string;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}
