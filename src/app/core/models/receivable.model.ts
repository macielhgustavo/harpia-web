export type ReceivablePersistedStatus =
  'PENDENTE' | 'PARCIAL' | 'PAGO' | 'CANCELADO';
export type ReceivableStatus = ReceivablePersistedStatus | 'ATRASADO';

export interface ReceivablePayment {
  id: string;
  receivableId: string;
  bankAccountId: string | null;
  amount: string;
  paidAt: string;
  notes: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  bankAccount: {
    id: string;
    bank: string;
    agency: string;
    account: string;
  } | null;
  createdByUser: { id: string; name: string };
  reversedByUser: { id: string; name: string } | null;
}

export interface Receivable {
  id: string;
  companyId: string | null;
  bankAccountId: string | null;
  saleId: string | null;
  salePaymentPlanId: string | null;
  sourceType: 'SALE_PAYMENT_PLAN';
  sourceId: string;
  sourceSequence: number;
  description: string;
  dueDate: string;
  originalAmount: string;
  adjustedAmount: string;
  paidAmount: string;
  balance: string;
  status: ReceivableStatus;
  persistedStatus: ReceivablePersistedStatus;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string } | null;
  bankAccount: {
    id: string;
    bank: string;
    agency: string;
    account: string;
  } | null;
  sale: {
    id: string;
    saleNumber: string;
    status: string;
    development: { id: string; name: string };
    unit: { id: string; identifier: string; grouping: string | null };
    buyers: {
      isPrimary: boolean;
      person: { id: string; name: string };
    }[];
  } | null;
  payments: ReceivablePayment[];
}

export interface ReceivableSummary {
  outstanding: string;
  receivedInPeriod: string;
  overdue: string;
  dueNext30Days: string;
  periodStart: string;
  periodEnd: string;
}

export interface ReceivablePage {
  data: Receivable[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: ReceivableSummary;
}

export interface ReceivableFilters {
  page?: number;
  pageSize?: number;
  status?: ReceivableStatus;
  saleId?: string;
  buyerId?: string;
  companyId?: string;
  developmentId?: string;
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface RecordReceivablePaymentInput {
  amount: string;
  paidAt: string;
  bankAccountId: string;
  notes?: string;
}

export interface ReverseReceivablePaymentInput {
  reason: string;
}

export interface CancelReceivableInput {
  reason: string;
}
