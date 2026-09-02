export type PayablePersistedStatus =
  'PENDENTE' | 'PARCIAL' | 'PAGO' | 'CANCELADO';
export type PayableStatus = PayablePersistedStatus | 'ATRASADO';

export interface PayablePayment {
  id: string;
  payableId: string;
  bankAccountId: string;
  amount: string;
  paidAt: string;
  notes: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  bankAccount: { id: string; bank: string; agency: string; account: string };
  createdByUser: { id: string; name: string };
  reversedByUser: { id: string; name: string } | null;
  transaction: { id: string; reversedAt: string | null } | null;
}

export interface Payable {
  id: string;
  companyId: string | null;
  developmentId: string | null;
  bankAccountId: string | null;
  categoryId: string | null;
  costCenterId: string | null;
  supplierPersonId: string | null;
  description: string;
  dueDate: string;
  originalAmount: string;
  paidAmount: string;
  balance: string;
  status: PayableStatus;
  persistedStatus: PayablePersistedStatus;
  sourceType: 'INVESTOR_RETURN' | 'SALE_COMMISSION' | null;
  sourceId: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  recipient: string;
  company: { id: string; name: string; type: string } | null;
  development: { id: string; name: string } | null;
  bankAccount: {
    id: string;
    bank: string;
    agency: string;
    account: string;
  } | null;
  category: { id: string; name: string; type: string } | null;
  costCenter: { id: string; name: string } | null;
  supplierPerson: { id: string; name: string } | null;
  payments: PayablePayment[];
}

export interface PayablePage {
  data: Payable[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PayableFilters {
  page?: number;
  pageSize?: number;
  status?: PayableStatus;
  companyId?: string;
  developmentId?: string;
  categoryId?: string;
  costCenterId?: string;
  supplierPersonId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface SavePayableInput {
  description: string;
  dueDate: string;
  originalAmount: string;
  companyId?: string;
  developmentId?: string;
  bankAccountId?: string;
  categoryId?: string;
  costCenterId?: string;
  supplierPersonId?: string;
}
