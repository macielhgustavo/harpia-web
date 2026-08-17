export type UnitReservationStatus =
  'ATIVA' | 'CANCELADA' | 'EXPIRADA' | 'CONVERTIDA';

export interface ReservationUserSummary {
  id: string;
  name: string;
}

export interface UnitReservation {
  id: string;
  organizationId: string;
  unitId: string;
  personId: string;
  opportunityId: string | null;
  createdByUserId: string;
  startsAt: string;
  expiresAt: string;
  status: UnitReservationStatus;
  notes: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  convertedAt: string | null;
  convertedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  unit: {
    id: string;
    identifier: string;
    status: string;
    development: { id: string; name: string };
  };
  person: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  opportunity: {
    id: string;
    source: string | null;
    stage: { id: string; name: string };
  } | null;
  createdByUser: ReservationUserSummary;
  cancelledByUser: ReservationUserSummary | null;
  convertedByUser: ReservationUserSummary | null;
}

export interface ReservationFilters {
  unitId?: string;
  personId?: string;
  opportunityId?: string;
  developmentId?: string;
  status?: UnitReservationStatus;
  page?: number;
  pageSize?: number;
}

export interface ReservationPage {
  data: UnitReservation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReservationInput {
  unitId: string;
  personId: string;
  opportunityId?: string;
  expiresAt: string;
  notes?: string;
}

export interface CancelReservationInput {
  reason: string;
}
