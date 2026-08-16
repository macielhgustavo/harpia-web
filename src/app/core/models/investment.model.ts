import {
  AllocationDetail,
  AllocationWithDevelopment,
} from './allocation.model';

export type InvestmentType = 'FINANCEIRO' | 'PERMUTA' | 'OUTRO';

export interface InvestmentInvestorSummary {
  id: string;
  name: string;
}

export interface Investment {
  id: string;
  organizationId: string;
  investorId: string;
  amount: number;
  date: string;
  type: InvestmentType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentListItem extends Investment {
  investor: InvestmentInvestorSummary;
  allocations: AllocationWithDevelopment[];
  allocatedAmount: number;
  unallocatedAmount: number;
}

export interface InvestmentDetail extends Investment {
  investor: InvestmentInvestorSummary;
  allocations: AllocationDetail[];
  allocatedAmount: number;
  unallocatedAmount: number;
}

export interface CreateInvestmentInput {
  investorId: string;
  amount: number;
  date: string;
  type?: InvestmentType;
  notes?: string;
}

export interface UpdateInvestmentInput {
  amount?: number;
  date?: string;
  type?: InvestmentType;
  notes?: string;
}
