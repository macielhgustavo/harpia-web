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
  SalesActivityPriority,
} from '../../core/models/crm.model';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { extractError } from '../../shared/utils/http-error';

type AgendaView = 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'ALL';

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

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );
  readonly activities = signal<SalesActivity[]>([]);
  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly actionId = signal('');
  readonly error = signal('');
  readonly feedback = signal('');
  readonly view = signal<AgendaView>('TODAY');
  readonly assignedUserId = signal(this.session.getClaims()?.sub ?? '');
  readonly priority = signal<SalesActivityPriority | ''>('');
  readonly clock = signal(Date.now());

  readonly visibleActivities = computed(() =>
    this.activities().filter((activity) =>
      this.matchesView(activity, this.view()),
    ),
  );
  readonly todayCount = computed(
    () =>
      this.activities().filter((item) => this.matchesView(item, 'TODAY'))
        .length,
  );
  readonly overdueCount = computed(
    () =>
      this.activities().filter((item) => this.matchesView(item, 'OVERDUE'))
        .length,
  );
  readonly upcomingCount = computed(
    () =>
      this.activities().filter((item) => this.matchesView(item, 'UPCOMING'))
        .length,
  );

  readonly RefreshIcon = RefreshCw;
  readonly CompleteIcon = Check;
  readonly StartIcon = Play;
  readonly ClockIcon = Clock3;

  ngOnInit(): void {
    this.load(true);
  }

  load(loadUsers = false): void {
    this.loading.set(true);
    this.error.set('');
    this.clock.set(Date.now());
    const filters = {
      pageSize: 100,
      openOnly: true,
      assignedUserId: this.assignedUserId(),
      priority: this.priority() || undefined,
    };
    const request = loadUsers
      ? forkJoin({
          activities: this.crm.listActivities(filters),
          users: this.usersService.list({ isActive: true }),
        })
      : forkJoin({
          activities: this.crm.listActivities(filters),
          users: of(this.users()),
        });
    request.subscribe({
      next: ({ activities, users }) => {
        this.activities.set(activities.data);
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
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

  isLate(activity: SalesActivity): boolean {
    return (
      !!activity.scheduledAt &&
      new Date(activity.scheduledAt).getTime() < this.clock()
    );
  }

  private updateStatus(
    activity: SalesActivity,
    status: 'EM_ANDAMENTO' | 'CONCLUIDA',
    message: string,
  ): void {
    if (!this.canWrite || this.actionId()) return;
    this.actionId.set(activity.id);
    this.error.set('');
    this.crm.updateActivity(activity.id, { status }).subscribe({
      next: () => {
        this.actionId.set('');
        this.feedback.set(message);
        this.load();
      },
      error: (error: unknown) => {
        this.actionId.set('');
        this.error.set(
          extractError(error, 'Não foi possível atualizar a atividade.'),
        );
      },
    });
  }

  private matchesView(activity: SalesActivity, view: AgendaView): boolean {
    if (view === 'ALL') return true;
    if (!activity.scheduledAt) return false;
    const date = new Date(activity.scheduledAt).getTime();
    const start = new Date(this.clock());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    if (view === 'TODAY')
      return date >= start.getTime() && date < end.getTime();
    if (view === 'OVERDUE') return date < this.clock();
    return date >= end.getTime();
  }
}
