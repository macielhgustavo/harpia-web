export type FinancialCategoryType = 'RECEITA' | 'DESPESA';
export type CashFlowMode = 'REALIZADO' | 'PROJETADO' | 'CONSOLIDADO';
export type CashFlowGroup = 'DIA' | 'SEMANA' | 'MES';

export interface FinancialCategory {
  id: string;
  name: string;
  type: FinancialCategoryType;
  isDefault: boolean;
  active: boolean;
}

export interface CostCenter {
  id: string;
  name: string;
  companyId: string | null;
  developmentId: string | null;
  active: boolean;
  company: { id: string; name: string; type: string } | null;
  development: { id: string; name: string } | null;
}

export interface FinanceSummary {
  cashBalance: string;
  receivablesPending: string;
  receivablesOverdue: string;
  payablesPending: string;
  payablesOverdue: string;
  expectedInflows30d: string;
  expectedOutflows30d: string;
  projected30d: string;
  positionByCompany: {
    id: string;
    name: string;
    type: string;
    receivables: string;
    payables: string;
    projectedPosition: string;
  }[];
  upcoming: {
    id: string;
    kind: 'RECEIVABLE' | 'PAYABLE';
    description: string;
    counterparty: string;
    dueDate: string;
    amount: string;
  }[];
}

export interface FinanceFilters {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  developmentId?: string;
  costCenterId?: string;
  mode?: CashFlowMode;
  groupBy?: CashFlowGroup;
  days?: number;
}

export interface CashFlowResult {
  mode: CashFlowMode;
  groupBy: CashFlowGroup;
  startDate: string;
  endDate: string;
  openingBalance: string;
  closingBalance: string;
  data: {
    date: string;
    inflows: string;
    outflows: string;
    net: string;
    balance: string;
    realizedInflows: string;
    realizedOutflows: string;
    projectedInflows: string;
    projectedOutflows: string;
  }[];
}
