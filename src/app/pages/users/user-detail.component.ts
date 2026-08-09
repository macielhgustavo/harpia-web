import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  LucideAngularModule,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-angular';
import { Observable } from 'rxjs';
import { ManagedUser } from '../../core/models/user-management.model';
import { UserRole } from '../../core/models/user-role.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { extractError } from '../../shared/utils/http-error';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import {
  asUserRole,
  manageableUserRoles,
  userRoleBadge,
  userRoleLabel,
} from './user-role-ui';

type PendingAction =
  | { type: 'ROLE'; nextRole: UserRole }
  | { type: 'STATUS'; nextActive: boolean };

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DialogFocusDirective],
  templateUrl: './user-detail.component.html',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserManagementService);
  private readonly authService = inject(AuthService);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly claims = this.session.getClaims();

  readonly user = signal<ManagedUser | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly actionError = signal('');
  readonly actionLoading = signal(false);
  readonly selectedRole = signal<UserRole>('LEITURA');
  readonly pendingAction = signal<PendingAction | null>(null);

  readonly currentUserId = this.claims?.sub ?? null;
  readonly currentRole = asUserRole(this.claims?.role);
  readonly roleOptions = manageableUserRoles(this.currentRole);

  readonly BackIcon = ArrowLeft;
  readonly RetryIcon = RefreshCw;
  readonly ShieldIcon = ShieldCheck;
  readonly ActivateIcon = UserCheck;
  readonly DeactivateIcon = UserX;
  readonly roleLabel = userRoleLabel;
  readonly roleBadge = userRoleBadge;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.userId) {
      this.loading.set(false);
      this.error.set('Usuário não encontrado.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.userService
      .getById(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.selectedRole.set(user.role);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(
            extractError(
              error,
              'Não foi possível carregar o usuário. Verifique sua permissão e tente novamente.',
            ),
          );
          this.loading.set(false);
        },
      });
  }

  onRoleChange(value: string): void {
    const role = asUserRole(value);
    if (role) this.selectedRole.set(role);
  }

  requestRoleChange(): void {
    const user = this.user();
    if (!user || !this.canChangeRole() || this.selectedRole() === user.role)
      return;

    this.actionError.set('');
    this.pendingAction.set({ type: 'ROLE', nextRole: this.selectedRole() });
  }

  requestStatusChange(): void {
    const user = this.user();
    if (!user || !this.canToggleStatus()) return;

    this.actionError.set('');
    this.pendingAction.set({ type: 'STATUS', nextActive: !user.isActive });
  }

  closeConfirmation(): void {
    if (!this.actionLoading()) {
      this.pendingAction.set(null);
      this.actionError.set('');
    }
  }

  confirmAction(): void {
    const action = this.pendingAction();
    const user = this.user();
    if (!action || !user || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.actionError.set('');
    this.feedback.set('');
    const tokenAtStart = this.session.getToken();

    const request: Observable<ManagedUser> =
      action.type === 'ROLE'
        ? this.userService.updateRole(user.id, { role: action.nextRole })
        : this.userService.updateStatus(user.id, {
            isActive: action.nextActive,
          });

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedUser) => {
        const changedOwnRole =
          action.type === 'ROLE' &&
          user.id === this.currentUserId &&
          user.role !== updatedUser.role;

        this.user.set(updatedUser);
        this.selectedRole.set(updatedUser.role);
        this.actionLoading.set(false);
        this.pendingAction.set(null);
        this.feedback.set(
          action.type === 'ROLE'
            ? 'Papel atualizado com sucesso.'
            : updatedUser.isActive
              ? 'Usuário ativado com sucesso.'
              : 'Usuário desativado com sucesso.',
        );

        if (changedOwnRole) {
          this.authService.logoutIfCurrentToken(
            tokenAtStart,
            'session-expired',
          );
        }
      },
      error: (error: unknown) => {
        this.actionLoading.set(false);
        this.actionError.set(
          extractError(
            error,
            'Não foi possível concluir a alteração. Verifique sua permissão e tente novamente.',
          ),
        );
      },
    });
  }

  isCurrentUser(): boolean {
    return this.user()?.id === this.currentUserId;
  }

  canChangeRole(): boolean {
    const user = this.user();
    if (!user) return false;
    if (this.currentRole === 'OWNER') return true;
    return this.currentRole === 'ADMIN' && user.role !== 'OWNER';
  }

  canToggleStatus(): boolean {
    const user = this.user();
    if (!user || !this.canChangeRole()) return false;
    return !(user.id === this.currentUserId && user.isActive);
  }

  roleChangeDisabled(): boolean {
    const user = this.user();
    return (
      !user ||
      !this.canChangeRole() ||
      this.selectedRole() === user.role ||
      this.actionLoading()
    );
  }

  statusLabel(isActive: boolean): string {
    return isActive ? 'Ativo' : 'Inativo';
  }

  statusBadge(isActive: boolean): string {
    return isActive
      ? 'bg-emerald-50 text-emerald-800'
      : 'bg-red-50 text-red-800';
  }

  confirmationTitle(): string {
    const action = this.pendingAction();
    if (!action) return '';
    if (action.type === 'ROLE') return 'Confirmar alteração de papel';
    return action.nextActive ? 'Confirmar ativação' : 'Confirmar desativação';
  }

  confirmationText(): string {
    const action = this.pendingAction();
    const user = this.user();
    if (!action || !user) return '';

    if (action.type === 'ROLE') {
      return `Alterar o papel de ${user.name} de ${this.roleLabel(user.role)} para ${this.roleLabel(action.nextRole)}? As sessões desse usuário serão revogadas.`;
    }

    return action.nextActive
      ? `Ativar o acesso de ${user.name}?`
      : `Desativar o acesso de ${user.name}? As sessões desse usuário serão revogadas.`;
  }

  confirmationButtonLabel(): string {
    const action = this.pendingAction();
    if (!action) return '';
    if (action.type === 'ROLE') return 'Alterar papel';
    return action.nextActive ? 'Ativar usuário' : 'Desativar usuário';
  }

  formatDate(value: string | null): string {
    if (!value) return 'Não informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informado';

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}
