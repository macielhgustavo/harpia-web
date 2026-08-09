import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  MailPlus,
  RefreshCw,
  Search,
  UsersRound,
  LucideAngularModule,
} from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  ManagedUser,
  UserFilters,
} from '../../core/models/user-management.model';
import { USER_ROLES, UserRole } from '../../core/models/user-role.model';
import { UserManagementService } from '../../core/services/user-management.service';
import { extractError } from '../../shared/utils/http-error';
import { asUserRole, userRoleBadge, userRoleLabel } from './user-role-ui';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserManagementService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();
  private loadSequence = 0;

  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly roleFilter = signal<UserRole | ''>('');
  readonly statusFilter = signal<StatusFilter>('ALL');

  readonly roleOptions = USER_ROLES;
  readonly SearchIcon = Search;
  readonly UsersIcon = UsersRound;
  readonly InvitationsIcon = MailPlus;
  readonly RetryIcon = RefreshCw;
  readonly roleLabel = userRoleLabel;
  readonly roleBadge = userRoleBadge;

  ngOnInit(): void {
    this.searchChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.reload());

    this.reload();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.searchChanges.next(value.trim());
  }

  onRoleChange(value: string): void {
    this.roleFilter.set(value ? (asUserRole(value) ?? '') : '');
    this.reload();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(
      value === 'ACTIVE' || value === 'INACTIVE' ? value : 'ALL',
    );
    this.reload();
  }

  reload(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');

    this.userService
      .list(this.currentFilters())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          if (sequence !== this.loadSequence) return;
          this.users.set(users);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) return;
          this.error.set(
            extractError(
              error,
              'Não foi possível carregar os usuários. Verifique sua permissão e tente novamente.',
            ),
          );
          this.loading.set(false);
        },
      });
  }

  statusLabel(isActive: boolean): string {
    return isActive ? 'Ativo' : 'Inativo';
  }

  statusBadge(isActive: boolean): string {
    return isActive
      ? 'bg-emerald-50 text-emerald-800'
      : 'bg-red-50 text-red-800';
  }

  formatDate(value: string | null): string {
    if (!value) return 'Nunca';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informado';

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  private currentFilters(): UserFilters {
    const search = this.search().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return {
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status === 'ACTIVE' ? { isActive: true } : {}),
      ...(status === 'INACTIVE' ? { isActive: false } : {}),
    };
  }
}
