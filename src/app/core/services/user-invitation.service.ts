import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateUserInvitationRequest,
  UserInvitation,
} from '../models/user-invitation.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserInvitationService {
  private readonly api = inject(ApiService);

  list(): Observable<UserInvitation[]> {
    return this.api.get<UserInvitation[]>('/users/invitations');
  }

  create(request: CreateUserInvitationRequest): Observable<UserInvitation> {
    return this.api.post<UserInvitation>('/users/invitations', request);
  }

  revoke(id: string): Observable<UserInvitation> {
    return this.api.post<UserInvitation>(
      `/users/invitations/${id}/revoke`,
      null,
    );
  }
}
