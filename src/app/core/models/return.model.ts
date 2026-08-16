export type PersistedReturnStatus = 'PENDENTE' | 'PAGO';
export type ReturnStatus = PersistedReturnStatus | 'ATRASADO';

export interface Return {
  id: string;
  allocationId: string;
  expectedAmount: number;
  expectedDate: string;
  realizedDate: string | null;
  realizedAmount: number | null;
  status: ReturnStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnDevelopmentSummary {
  id: string;
  name: string;
}

export interface ReturnInvestorSummary {
  id: string;
  name: string;
}

export interface ReturnInvestmentSummary {
  id: string;
  investor: ReturnInvestorSummary;
}

export interface ReturnAllocationContext {
  id: string;
  developmentId: string | null;
  development: ReturnDevelopmentSummary | null;
  investmentId: string;
  investment: ReturnInvestmentSummary;
}

export interface ReturnListItem extends Return {
  allocation: ReturnAllocationContext;
}

export interface CreateReturnInput {
  allocationId: string;
  expectedAmount: number;
  expectedDate: string;
  realizedDate?: string;
  realizedAmount?: number;
  status?: PersistedReturnStatus;
}

export interface UpdateReturnInput {
  expectedAmount?: number;
  expectedDate?: string;
  realizedDate?: string;
  realizedAmount?: number;
  status?: PersistedReturnStatus;
}

export interface ReturnFilters {
  allocationId?: string;
  investmentId?: string;
  developmentId?: string;
  status?: ReturnStatus | '';
}
