import { getInvitationStatus, UserInvitation } from './user-invitation.model';

describe('getInvitationStatus', () => {
  const invitation = (
    overrides: Partial<UserInvitation> = {},
  ): UserInvitation => ({
    id: 'invitation-1',
    email: 'invite@example.com',
    role: 'LEITURA',
    expiresAt: '2026-08-10T12:00:00.000Z',
    acceptedAt: null,
    revokedAt: null,
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    invitedBy: { id: 'owner-1', name: 'Owner' },
    ...overrides,
  });

  it('deriva os estados pendente e expirado pelo instante atual', () => {
    const beforeExpiry = new Date('2026-08-10T11:59:59.999Z');
    const atExpiry = new Date('2026-08-10T12:00:00.000Z');

    expect(getInvitationStatus(invitation(), beforeExpiry)).toBe('PENDING');
    expect(getInvitationStatus(invitation(), atExpiry)).toBe('EXPIRED');
  });

  it('prioriza aceite e revogação sobre a expiração calculada', () => {
    const afterExpiry = new Date('2026-08-11T12:00:00.000Z');

    expect(
      getInvitationStatus(
        invitation({ acceptedAt: '2026-08-04T12:00:00.000Z' }),
        afterExpiry,
      ),
    ).toBe('ACCEPTED');
    expect(
      getInvitationStatus(
        invitation({ revokedAt: '2026-08-04T12:00:00.000Z' }),
        afterExpiry,
      ),
    ).toBe('REVOKED');
  });
});
