import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserInvitation } from '../models/user-invitation.model';
import { ApiService } from './api.service';
import { UserInvitationService } from './user-invitation.service';

describe('UserInvitationService', () => {
  let service: UserInvitationService;
  let api: jasmine.SpyObj<ApiService>;
  const invitation: UserInvitation = {
    id: 'invitation-1',
    email: 'invite@example.com',
    role: 'LEITURA',
    expiresAt: '2026-08-10T00:00:00.000Z',
    acceptedAt: null,
    revokedAt: null,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    invitedBy: { id: 'owner-1', name: 'Owner' },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.returnValue(of([invitation]));
    api.post.and.returnValue(of(invitation));

    TestBed.configureTestingModule({
      providers: [
        UserInvitationService,
        { provide: ApiService, useValue: api },
      ],
    });
    service = TestBed.inject(UserInvitationService);
  });

  it('lista convites pelo endpoint estático', () => {
    service.list().subscribe();

    expect(api.get).toHaveBeenCalledOnceWith('/users/invitations');
  });

  it('cria convite sem aceitar organização no payload', () => {
    const request = {
      email: 'invite@example.com',
      role: 'FINANCEIRO' as const,
    };

    service.create(request).subscribe();

    expect(api.post).toHaveBeenCalledOnceWith('/users/invitations', request);
    expect(Object.keys(request)).not.toContain('organizationId');
  });

  it('revoga com POST e sem corpo de domínio', () => {
    service.revoke('invitation-1').subscribe();

    expect(api.post).toHaveBeenCalledOnceWith(
      '/users/invitations/invitation-1/revoke',
      null,
    );
  });
});
