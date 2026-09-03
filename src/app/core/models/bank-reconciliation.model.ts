export type BankStatementEntryType = 'CREDITO' | 'DEBITO';
export type BankReconciliationStatus = 'PENDENTE' | 'CONCILIADO' | 'IGNORADO';

export interface BankStatementEntry {
  id: string;
  bankAccountId: string;
  externalId: string | null;
  date: string;
  description: string;
  type: BankStatementEntryType;
  amount: string;
  status: BankReconciliationStatus;
  reconciledAt: string | null;
  ignoredAt: string | null;
  importedAt: string;
  bankAccount: { id: string; bank: string; agency: string; account: string };
  matchedTransaction: ReconciliationCandidate | null;
}

export interface ReconciliationCandidate {
  id: string;
  type: 'ENTRADA' | 'SAIDA';
  amount: string;
  date: string;
  description: string;
  reversedAt?: string | null;
  score?: number;
  receivable?: { id: string; description: string } | null;
  payable?: { id: string; description: string } | null;
}

export interface ReconciliationListResult {
  data: BankStatementEntry[];
  summary: Record<
    'pending' | 'reconciled' | 'ignored',
    { count: number; amount: string }
  >;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ReconciliationFilters {
  page?: number;
  pageSize?: number;
  status?: BankReconciliationStatus | '';
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ImportStatementInput {
  bankAccountId: string;
  entries: {
    externalId?: string;
    date: string;
    description: string;
    type: BankStatementEntryType;
    amount: string;
  }[];
}

export interface ImportStatementResult {
  received: number;
  imported: number;
  skipped: number;
}
