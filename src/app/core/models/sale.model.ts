import { AuditLog } from './audit-log.model';
import { DocumentCategory } from './document.model';
import { ProposalPaymentConditionType } from './proposal.model';

export type SaleStatus = 'ATIVA' | 'QUITADA' | 'CANCELADA' | 'DISTRATADA';
export type SaleCommissionStatus = 'PREVISTA' | 'DEVIDA' | 'PAGA' | 'CANCELADA';

export interface SaleBuyer {
  id: string;
  personId: string;
  participationPercentage: string | null;
  isPrimary: boolean;
  createdAt: string;
  person: {
    id: string;
    name: string;
    document: string | null;
    documentType: string | null;
    email: string | null;
    phone: string | null;
  };
}

export interface SalePaymentPlanItem {
  id: string;
  type: ProposalPaymentConditionType;
  amount: string;
  installments: number | null;
  firstDueDate: string | null;
  intervalMonths: number | null;
  description: string | null;
  position: number;
}

export interface SaleCommission {
  id: string;
  personId: string | null;
  userId: string | null;
  percentage: string | null;
  amount: string;
  status: SaleCommissionStatus;
  notes: string | null;
  createdAt: string;
  person: { id: string; name: string } | null;
  user: { id: string; name: string } | null;
}

export interface Sale {
  id: string;
  developmentId: string;
  unitId: string;
  opportunityId: string | null;
  proposalId: string | null;
  saleNumber: string;
  status: SaleStatus;
  saleDate: string;
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
  outstandingBalance: string;
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  development: { id: string; name: string };
  unit: {
    id: string;
    identifier: string;
    status: string;
    category: string;
    grouping: string | null;
  };
  opportunity: {
    id: string;
    stage: { id: string; name: string; code: string };
  } | null;
  proposal: {
    id: string;
    status: string;
    currentVersionId: string | null;
    convertedToSaleAt: string | null;
  } | null;
  createdByUser: { id: string; name: string };
  buyers: SaleBuyer[];
  paymentPlan: SalePaymentPlanItem[];
  commissions: SaleCommission[];
}

export interface SaleDocument {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  personId: string | null;
  unitId: string | null;
  developmentId: string | null;
  createdAt: string;
}

export interface SaleDetail extends Sale {
  documents: SaleDocument[];
  audit: AuditLog[];
}

export interface SalePage {
  data: Sale[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SaleFilters {
  developmentId?: string;
  status?: SaleStatus;
  buyerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SaleBuyerInput {
  personId: string;
  participationPercentage?: string;
  isPrimary: boolean;
}

export interface SaleCommissionInput {
  personId?: string;
  userId?: string;
  percentage?: string;
  amount: string;
  notes?: string;
}

export interface ConvertProposalToSaleInput {
  saleNumber?: string;
  saleDate?: string;
  notes?: string;
  buyers: SaleBuyerInput[];
  commissions?: SaleCommissionInput[];
}

export interface UpdateSaleInput {
  saleNumber?: string;
  saleDate?: string;
  notes?: string;
}
