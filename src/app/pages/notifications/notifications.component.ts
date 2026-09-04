import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bell, CheckCheck, LucideAngularModule, Mail, RefreshCw } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { AppNotification, NotificationPage, NotificationPreference } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { extractError } from '../../shared/utils/http-error';

const TYPES = [
  { type: 'SALE_CANCELLED', label: 'Distratos e vendas' },
  { type: 'PAYMENT_RECORDED', label: 'Pagamentos' },
  { type: 'COLLECTION_FAILED', label: 'Cobran\u00e7as' },
  { type: 'RETURN_DUE', label: 'Retornos de investidores' },
  { type: 'SYSTEM', label: 'Sistema' },
] as const;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  private readonly notifications = inject(NotificationService);
  readonly page = signal<NotificationPage | null>(null);
  readonly preferences = signal<NotificationPreference[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly types = TYPES;
  state: 'all' | 'read' | 'unread' = 'all';
  currentPage = 1;

  readonly BellIcon = Bell;
  readonly ReadIcon = CheckCheck;
  readonly MailIcon = Mail;
  readonly RefreshIcon = RefreshCw;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      page: this.notifications.list({ state: this.state, page: this.currentPage, pageSize: 20 }),
      preferences: this.notifications.preferences(),
    }).subscribe({
      next: ({ page, preferences }) => {
        this.page.set(page);
        this.preferences.set(preferences);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(extractError(error, 'N\u00e3o foi poss\u00edvel carregar as notifica\u00e7\u00f5es.'));
      },
    });
  }

  applyFilter(): void { this.currentPage = 1; this.load(); }

  goToPage(page: number): void {
    if (page < 1 || page > (this.page()?.pagination.totalPages || 1)) return;
    this.currentPage = page;
    this.load();
  }

  markRead(item: AppNotification): void {
    if (item.readAt || this.acting()) return;
    this.acting.set(true);
    this.notifications.markRead(item.id).subscribe({
      next: () => { this.acting.set(false); this.load(); },
      error: (error: unknown) => { this.acting.set(false); this.error.set(extractError(error)); },
    });
  }

  markAllRead(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.notifications.markAllRead().subscribe({
      next: ({ updated }) => {
        this.acting.set(false);
        this.notice.set(`${updated} notifica\u00e7\u00e3o(\u00f5es) marcada(s) como lida(s).`);
        this.load();
      },
      error: (error: unknown) => { this.acting.set(false); this.error.set(extractError(error)); },
    });
  }

  preference(type: string): NotificationPreference {
    return this.preferences().find((item) => item.type === type) ?? {
      id: '', type, internal: true, email: true,
    };
  }

  setPreference(type: string, channel: 'internal' | 'email', enabled: boolean): void {
    const current = this.preference(type);
    this.notifications.updatePreference({
      type,
      internal: channel === 'internal' ? enabled : current.internal,
      email: channel === 'email' ? enabled : current.email,
    }).subscribe({
      next: (saved) => {
        this.preferences.update((items) => [...items.filter((item) => item.type !== type), saved]);
        this.notice.set('Prefer\u00eancias atualizadas.');
      },
      error: (error: unknown) => this.error.set(extractError(error)),
    });
  }

  typeLabel(type: string): string {
    return TYPES.find((item) => item.type === type)?.label ?? type.replaceAll('_', ' ');
  }

  date(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }
}
