import type { UserRole } from './user-role.model';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface UserInvitationActor {
  id: string;
  name: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  invitedBy: UserInvitationActor;
}

export interface CreateUserInvitationRequest {
  email: string;
  role: UserRole;
}

export function getInvitationStatus(
  invitation: Pick<UserInvitation, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
  now: Date | number = Date.now(),
): InvitationStatus {
  if (invitation.acceptedAt) {
    return 'ACCEPTED';
  }

  if (invitation.revokedAt) {
    return 'REVOKED';
  }

  const nowTimestamp = typeof now === 'number' ? now : now.getTime();
  return Date.parse(invitation.expiresAt) <= nowTimestamp
    ? 'EXPIRED'
    : 'PENDING';
}
