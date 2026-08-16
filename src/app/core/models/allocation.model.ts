import { Return } from './return.model';

export interface AllocationDevelopmentSummary {
  id: string;
  name: string;
}

export interface Allocation {
  id: string;
  organizationId: string;
  investmentId: string;
  developmentId: string | null;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationWithDevelopment extends Allocation {
  development: AllocationDevelopmentSummary | null;
}

export interface AllocationDetail extends AllocationWithDevelopment {
  returns: Return[];
}

export interface AllocationInvestmentSummary {
  id: string;
  amount: number;
  investorId?: string;
}

export interface AllocationListItem extends AllocationWithDevelopment {
  investment: AllocationInvestmentSummary;
}

export interface AllocationFullDetail extends AllocationWithDevelopment {
  investment: AllocationInvestmentSummary;
  returns: Return[];
}

export interface CreateAllocationInput {
  investmentId: string;
  developmentId?: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface UpdateAllocationInput {
  developmentId?: string | null;
  amount?: number;
  date?: string;
  notes?: string;
}
