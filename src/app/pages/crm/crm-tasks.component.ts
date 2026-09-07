import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Check,
  Clock3,
  LucideAngularModule,
  Play,
  RefreshCw,
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  SalesActivity,
  SalesActivityFilters,
  SalesActivityPage,
  SalesActivityPriority,
} from '../../core/models/crm.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { extractError } from '../../shared/utils/http-error';

export type AgendaView =
  | 'TODAY'
  | 'OVERDUE'
  | 'UPCOMING'
  | 'COMPLETED'
  | 'ALL';

export const AGENDA_VIEWS: readonly AgendaView[] = [
  'TODAY',
  'OVERDUE',
  'UPCOMING',
  'COMPLETED',
  'ALL',
];

export const AGENDA_PAGE_SIZE = 20;

const emptyPage = (): SalesActivityPage => ({
  data: [],
  pagination: { page: 1, pageSize: AGENDA_PAGE_SIZE, total: 0, totalPages: 0 },
});

const emptyPages = (): Record<AgendaView, SalesActivityPage> => ({
  TODAY: emptyPage(),
  OVERDUE: emptyPage(),
  UPCOMING: emptyPage(),
  COMPLETED: emptyPage(),
  ALL: emptyPage(),
});

/**
 * Local calendar boundaries of the day the user is living, not a UTC split.
 * `setDate(+1)` walks a calendar day, so the range stays correct across DST.
 */
export function agendaDayBounds(now: number): {
  startOfToday: Date;
  startOfTomorrow: Date;
} {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  return { startOfToday, startOfTomorrow };
}

/**
 * Translates a view into backend filters. The three open views split the
 * timeline into `(-inf, today)`, `[today, tomorrow)` and `[tomorrow, +inf)`,
 * so an open activity can never be counted by two of them.
 */
export function agendaViewFilters(
  view: AgendaView,
  now: number,
): SalesActivityFilters {
  const { startOfToday, startOfTomorrow } = agendaDayBounds(now);
  const lastMomentOfToday = new Date(startOfTomorrow.getTime() - 1);
  const lastMomentBeforeToday = new Date(startOfToday.getTime() - 1);
  switch (view) {
    case 'TODAY':
      return {
        openOnly: true,
        scheduledFrom: startOfToday.toISOString(),
        scheduledTo: lastMomentOfToday.toISOString(),
      };
    case 'OVERDUE':
      return {
        openOnly: true,
        scheduledTo: lastMomentBeforeToday.toISOString(),
      };
    case 'UPCOMING':
      return { openOnly: true, scheduledFrom: startOfTomorrow.toISOString() };
    case 'COMPLETED':
      return { status: 'CONCLUIDA' };
    case 'ALL':
      return { openOnly: true };
  }
}

@Component({
  selector: 'app-crm-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './crm-tasks.component.html',
})
export class CrmTasksComponent implements OnInit {
  private readonly crm = inject(CrmService);
  private readonly usersService = inject(UserManagementService);
  private readonly authorization = inject(AuthorizationService);
  private readonly session = inject(AuthSessionService);
  private loadSequence = 0;

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );
  readonly pages = signal<Record<AgendaView, SalesActivityPage>>(emptyPages());
  readonly loadingMore = signal(false);
  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly actionId = signal('');
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly feedback = signal('');
  readonly view = signal<AgendaView>('TODAY');
  readonly assignedUserId = signal(this.session.getClaims()?.sub ?? '');
  readonly priority = signal<SalesActivityPriority | ''>('');
  readonly clock = signal(Date.now());

  /** The rows shown always come from the very query that produced the badge. */
  readonly visibleActivities = computed(
    () => this.pages()[this.view()].data,
  );
  readonly todayCount = computed(() => this.count('TODAY'));
  readonly overdueCount = computed(() => this.count('OVERDUE'));
  readonly upcomingCount = computed(() => this.count('UPCOMING'));
  readonly completedCount = computed(() => this.count('COMPLETED'));
  readonly openCount = computed(() => this.count('ALL'));
  readonly truncated = computed(() => {
    const page = this.pages()[this.view()];
    return page.pagination.total > page.data.length;
  });

  readonly RefreshIcon = RefreshCw;
  readonly CompleteIcon = Check;
  readonly StartIcon = Play;
  readonly ClockIcon = Clock3;

  ngOnInit(): void {
    this.load(true);
  }

  count(view: AgendaView): number {
    return this.pages()[view].pagination.total;
  }

  /** Switching tabs only swaps already loaded data: no request, no flicker. */
  select(view: AgendaView): void {
    this.view.set(view);
  }

  /** Appends the next page of the active view, keeping the badge total. */
  loadMore(): void {
    const view = this.view();
    const page = this.pages()[view];
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.actionError.set('');
    this.crm
      .listActivities({
        ...this.sharedFilters(),
        ...agendaViewFilters(view, this.clock()),
        page: page.pagination.page + 1,
      })
      .subscribe({
        next: (next) => {
          this.loadingMore.set(false);
          this.pages.update((pages) => {
            const known = new Set(pages[view].data.map((item) => item.id));
            return {
              ...pages,
              [view]: {
                data: [
                  ...pages[view].data,
                  ...next.data.filter((item) => !known.has(item.id)),
                ],
                pagination: next.pagination,
              },
            };
          });
        },
        error: (error: unknown) => {
          this.loadingMore.set(false);
          this.actionError.set(
            extractError(error, 'Não foi possível carregar mais atividades.'),
          );
        },
      });
  }

  hasMore(): boolean {
    const page = this.pages()[this.view()];
    return page.pagination.total > page.data.length;
  }

  remaining(): number {
    const page = this.pages()[this.view()];
    return Math.max(0, page.pagination.total - page.data.length);
  }

  private sharedFilters(): SalesActivityFilters {
    return {
      pageSize: AGENDA_PAGE_SIZE,
      assignedUserId: this.assignedUserId() || undefined,
      priority: this.priority() || undefined,
    };
  }

  load(loadUsers = false): void {
    const sequence = ++this.loadSequence;
    const now = Date.now();
    this.loading.set(true);
    this.loadError.set('');
    this.clock.set(now);
    const shared = this.sharedFilters();
    forkJoin({
      TODAY: this.crm.listActivities({
        ...shared,
        ...agendaViewFilters('TODAY', now),
      }),
      OVERDUE: this.crm.listActivities({
        ...shared,
        ...agendaViewFilters('OVERDUE', now),
      }),
      UPCOMING: this.crm.listActivities({
        ...shared,
        ...agendaViewFilters('UPCOMING', now),
      }),
      COMPLETED: this.crm.listActivities({
        ...shared,
        ...agendaViewFilters('COMPLETED', now),
      }),
      ALL: this.crm.listActivities({
        ...shared,
        ...agendaViewFilters('ALL', now),
      }),
      users: loadUsers
        ? this.usersService.list({ isActive: true })
        : of(this.users()),
    }).subscribe({
      next: ({ users, ...pages }) => {
        if (sequence !== this.loadSequence) return;
        this.pages.set(pages);
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.loadError.set(
          extractError(error, 'Não foi possível carregar a agenda comercial.'),
        );
      },
    });
  }

  start(activity: SalesActivity): void {
    this.updateStatus(activity, 'EM_ANDAMENTO', 'Atividade iniciada.');
  }

  complete(activity: SalesActivity): void {
    this.updateStatus(activity, 'CONCLUIDA', 'Atividade concluída.');
  }

  emptyMessage(): string {
    return {
      TODAY: 'Nenhuma atividade para hoje.',
      OVERDUE: 'Nenhuma atividade atrasada.',
      UPCOMING: 'Nenhuma atividade futura.',
      COMPLETED: 'Nenhuma atividade concluída.',
      ALL: 'Nenhuma atividade aberta.',
    }[this.view()];
  }

  emptyHint(): string {
    return {
      TODAY: 'Agende um follow-up ou consulte as próximas atividades.',
      OVERDUE: 'A equipe está em dia com a agenda.',
      UPCOMING: 'Agende o próximo contato a partir de uma oportunidade.',
      COMPLETED: 'As atividades concluídas aparecem aqui assim que forem finalizadas.',
      ALL: 'Crie uma atividade a partir de uma oportunidade para começar.',
    }[this.view()];
  }

  formatDateTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(value))
      : 'Sem agendamento';
  }

  activityLabel(activity: SalesActivity): string {
    const labels: Record<SalesActivity['type'], string> = {
      LIGACAO: 'Ligação',
      WHATSAPP: 'WhatsApp',
      EMAIL: 'E-mail',
      REUNIAO: 'Reunião',
      VISITA: 'Visita',
      FOLLOW_UP: 'Follow-up',
      OUTRO: 'Outro',
    };
    return labels[activity.type];
  }

  priorityLabel(priority: SalesActivityPriority): string {
    return {
      BAIXA: 'Baixa',
      NORMAL: 'Normal',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    }[priority];
  }

  /**
   * Late means scheduled before today, the same rule the Atrasadas view uses,
   * so the badge can never contradict the tab the activity is listed in.
   */
  isLate(activity: SalesActivity): boolean {
    if (!activity.scheduledAt || activity.status === 'CONCLUIDA') return false;
    const { startOfToday } = agendaDayBounds(this.clock());
    return new Date(activity.scheduledAt).getTime() < startOfToday.getTime();
  }

  private updateStatus(
    activity: SalesActivity,
    status: 'EM_ANDAMENTO' | 'CONCLUIDA',
    message: string,
  ): void {
    if (!this.canWrite || this.actionId()) return;
    this.actionId.set(activity.id);
    this.actionError.set('');
    this.crm.updateActivity(activity.id, { status }).subscribe({
      next: () => {
        this.actionId.set('');
        this.feedback.set(message);
        this.load();
      },
      error: (error: unknown) => {
        this.actionId.set('');
        this.actionError.set(
          extractError(error, 'Não foi possível atualizar a atividade.'),
        );
      },
    });
  }
}
