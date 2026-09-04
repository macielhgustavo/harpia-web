import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AppNotification,
  NotificationPage,
  NotificationPreference,
} from '../models/notification.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);

  list(filters: { state?: 'all' | 'read' | 'unread'; type?: string; page?: number; pageSize?: number } = {}): Observable<NotificationPage> {
    const params = Object.entries(filters).reduce(
      (current, [key, value]) => value === undefined || value === '' ? current : current.set(key, String(value)),
      new HttpParams(),
    );
    return this.api.get<NotificationPage>('/notifications', params);
  }

  unreadCount(): Observable<{ count: number }> {
    return this.api.get<{ count: number }>('/notifications/unread-count');
  }

  markRead(id: string): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api.post<{ updated: number }>('/notifications/read-all', {});
  }

  preferences(): Observable<NotificationPreference[]> {
    return this.api.get<NotificationPreference[]>('/notifications/preferences');
  }

  updatePreference(input: { type: string; internal?: boolean; email?: boolean }): Observable<NotificationPreference> {
    return this.api.patch<NotificationPreference>('/notifications/preferences', input);
  }
}
