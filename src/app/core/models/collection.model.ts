export interface CollectionRule {
  id: string;
  name: string;
  daysOffset: number;
  subject: string;
  message: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CollectionDispatchStatus =
  'PENDENTE' | 'ENVIANDO' | 'ENVIADO' | 'FALHOU' | 'CANCELADO';

export interface CollectionDispatch {
  id: string;
  ruleId: string;
  receivableId: string;
  status: CollectionDispatchStatus;
  scheduledFor: string;
  recipient: string | null;
  subject: string;
  message: string;
  balanceSnapshot: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  failureReason: string | null;
  rule: { id: string; name: string; daysOffset: number };
  customer: { id: string; name: string } | null;
  receivable: {
    id: string;
    description: string;
    dueDate: string;
    status: string;
    balance: string;
    sale: {
      id: string;
      saleNumber: string;
      development: { id: string; name: string };
      unit: { id: string; identifier: string };
    } | null;
  };
}

export interface CollectionDispatchPage {
  data: CollectionDispatch[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    providerConfigured: boolean;
  };
}

export interface CollectionRuleInput {
  name: string;
  daysOffset: number;
  subject: string;
  message: string;
  active: boolean;
}

export interface CollectionDispatchFilters {
  page?: number;
  pageSize?: number;
  status?: CollectionDispatchStatus | '';
  ruleId?: string;
  search?: string;
}

export interface CollectionRunResult {
  generated: number;
  sent: number;
  failed: number;
  cancelled: number;
  providerConfigured: boolean;
}
