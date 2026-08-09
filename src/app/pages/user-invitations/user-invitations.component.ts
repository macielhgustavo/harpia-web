import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ArrowLeft,
  LucideAngularModule,
  MailPlus,
  RefreshCw,
  Search,
  X,
} from 'lucide-angular';
import {
  InvitationStatus,
  UserInvitation,
  getInvitationStatus,
} from '../../core/models/user-invitation.model';
import { UserRole } from '../../core/models/user-role.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UserInvitationService } from '../../core/services/user-invitation.service';
import { extractError } from '../../shared/utils/http-error';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import {
  asUserRole,
  manageableUserRoles,
  userRoleBadge,
  userRoleLabel,
} from '../users/user-role-ui';

type InvitationStatusFilter = InvitationStatus | 'ALL';

@Component({
  selector: 'app-user-invitations',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    DialogFocusDirective,
  ],
  templateUrl: './user-invitations.component.html',
})
export class UserInvitationsComponent implements OnInit {
  private readonly invitationService = inject(UserInvitationService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly invitations = signal<UserInvitation[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<InvitationStatusFilter>('ALL');
  readonly createOpen = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly revokeTarget = signal<UserInvitation | null>(null);
  readonly revoking = signal(false);
  readonly revokeError = signal('');

  readonly currentRole = asUserRole(this.session.getClaims()?.role);
  readonly roleOptions = manageableUserRoles(this.currentRole);
  readonly filteredInvitations = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('pt-BR');
    const status = this.statusFilter();

    return this.invitations().filter((invitation) => {
      const matchesSearch =
        !search ||
        invitation.email.toLocaleLowerCase('pt-BR').includes(search) ||
        invitation.invitedBy.name.toLocaleLowerCase('pt-BR').includes(search);
      const matchesStatus =
        status === 'ALL' || getInvitationStatus(invitation) === status;
      return matchesSearch && matchesStatus;
    });
  });

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    role: ['LEITURA' as UserRole, Validators.required],
  });

  readonly BackIcon = ArrowLeft;
  readonly SearchIcon = Search;
  readonly InviteIcon = MailPlus;
  readonly RetryIcon = RefreshCw;
  readonly CloseIcon = X;
  readonly roleLabel = userRoleLabel;
  readonly roleBadge = userRoleBadge;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');

    this.invitationService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitations) => {
          this.invitations.set(invitations);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(
            extractError(
              error,
              'Não foi possível carregar os convites. Verifique sua permissão e tente novamente.',
            ),
          );
          this.loading.set(false);
        },
      });
  }

  onStatusChange(value: string): void {
    const statuses: readonly InvitationStatusFilter[] = [
      'ALL',
      'PENDING',
      'ACCEPTED',
      'REVOKED',
      'EXPIRED',
    ];
    this.statusFilter.set(
      statuses.includes(value as InvitationStatusFilter)
        ? (value as InvitationStatusFilter)
        : 'ALL',
    );
  }

  openCreate(): void {
    if (!this.canManageInvitations() || this.loading()) return;
    this.form.reset({ email: '', role: 'LEITURA' });
    this.createError.set('');
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (!this.creating()) {
      this.createOpen.set(false);
      this.createError.set('');
    }
  }

  createInvitation(): void {
    if (this.form.invalid || this.creating() || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.createError.set('');
    this.feedback.set('');
    const request = this.form.getRawValue();

    this.invitationService
      .create(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitation) => {
          this.invitations.update((current) => [
            invitation,
            ...current.filter((item) => item.id !== invitation.id),
          ]);
          this.creating.set(false);
          this.createOpen.set(false);
          this.feedback.set(
            `Convite registrado para ${invitation.email}. O envio por e-mail ainda não está habilitado.`,
          );
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(
            extractError(
              error,
              'Não foi possível registrar o convite. Verifique sua permissão e tente novamente.',
            ),
          );
        },
      });
  }

  requestRevoke(invitation: UserInvitation): void {
    if (!this.canRevokeInvitation(invitation)) return;
    this.revokeError.set('');
    this.revokeTarget.set(invitation);
  }

  closeRevoke(): void {
    if (!this.revoking()) {
      this.revokeTarget.set(null);
      this.revokeError.set('');
    }
  }

  confirmRevoke(): void {
    const invitation = this.revokeTarget();
    if (!invitation || this.revoking() || !this.isPending(invitation)) return;

    this.revoking.set(true);
    this.revokeError.set('');
    this.feedback.set('');

    this.invitationService
      .revoke(invitation.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedInvitation) => {
          this.invitations.update((current) =>
            current.map((item) =>
              item.id === updatedInvitation.id ? updatedInvitation : item,
            ),
          );
          this.revoking.set(false);
          this.revokeTarget.set(null);
          this.feedback.set(`Convite de ${updatedInvitation.email} revogado.`);
        },
        error: (error: unknown) => {
          this.revoking.set(false);
          this.revokeError.set(
            extractError(
              error,
              'Não foi possível revogar o convite. Ele pode não estar mais pendente.',
            ),
          );
        },
      });
  }

  canManageInvitations(): boolean {
    return this.currentRole === 'OWNER' || this.currentRole === 'ADMIN';
  }

  canRevokeInvitation(invitation: UserInvitation): boolean {
    return (
      this.canManageInvitations() &&
      this.isPending(invitation) &&
      !(this.currentRole === 'ADMIN' && invitation.role === 'OWNER')
    );
  }

  isPending(invitation: UserInvitation): boolean {
    return getInvitationStatus(invitation) === 'PENDING';
  }

  statusOf(invitation: UserInvitation): InvitationStatus {
    return getInvitationStatus(invitation);
  }

  statusLabel(status: InvitationStatus): string {
    const labels: Record<InvitationStatus, string> = {
      PENDING: 'Pendente',
      ACCEPTED: 'Aceito',
      REVOKED: 'Revogado',
      EXPIRED: 'Expirado',
    };
    return labels[status];
  }

  statusBadge(status: InvitationStatus): string {
    const badges: Record<InvitationStatus, string> = {
      PENDING: 'bg-amber-50 text-amber-800',
      ACCEPTED: 'bg-emerald-50 text-emerald-800',
      REVOKED: 'bg-red-50 text-red-800',
      EXPIRED: 'bg-surface-warm text-muted',
    };
    return badges[status];
  }

  statusDateLabel(invitation: UserInvitation): string {
    const status = this.statusOf(invitation);
    if (status === 'ACCEPTED') return 'Aceito em';
    if (status === 'REVOKED') return 'Revogado em';
    return 'Validade';
  }

  statusDate(invitation: UserInvitation): string {
    const status = this.statusOf(invitation);
    if (status === 'ACCEPTED')
      return invitation.acceptedAt ?? invitation.expiresAt;
    if (status === 'REVOKED')
      return invitation.revokedAt ?? invitation.expiresAt;
    return invitation.expiresAt;
  }

  emailInvalid(): boolean {
    const email = this.form.controls.email;
    return email.invalid && email.touched;
  }

  formatDate(value: string | null): string {
    if (!value) return 'Não informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informado';

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
