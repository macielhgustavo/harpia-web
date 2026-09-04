export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown> | null;
  status: 'PENDENTE' | 'ENVIADO' | 'FALHOU' | 'LIDO';
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
}

export interface NotificationPage {
  data: AppNotification[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { unread: number };
}

export interface NotificationPreference {
  id: string;
  type: string;
  internal: boolean;
  email: boolean;
}
