import type { UserRole } from './user-role.model';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AuditActor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: JsonValue;
  createdAt: string;
  actor: AuditActor | null;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditLogPage {
  data: AuditLog[];
  pagination: Pagination;
}
