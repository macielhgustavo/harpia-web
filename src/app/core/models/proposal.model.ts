export type SalesProposalStatus =
  | 'RASCUNHO'
  | 'ENVIADA'
  | 'EM_NEGOCIACAO'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EXPIRADA'
  | 'CANCELADA';

export type ProposalPaymentConditionType =
  'ENTRADA' | 'PARCELAS' | 'SALDO_CHAVES' | 'FINANCIAMENTO' | 'OUTRO';

export interface ProposalPaymentCondition {
  id: string;
  type: ProposalPaymentConditionType;
  amount: string;
  installments: number | null;
  firstDueDate: string | null;
  intervalMonths: number | null;
  description: string | null;
  position: number;
}

export interface ProposalVersion {
  id: string;
  version: number;
  basePrice: string;
  discount: string;
  finalPrice: string;
  downPayment: string;
  validUntil: string | null;
  notes: string | null;
  sourcePriceTableId: string | null;
  sourcePriceTableName: string | null;
  createdAt: string;
  createdByUser: { id: string; name: string };
  conditions: ProposalPaymentCondition[];
}

export interface SalesProposal {
  id: string;
  opportunityId: string | null;
  reservationId: string | null;
  personId: string;
  unitId: string;
  status: SalesProposalStatus;
  currentVersionId: string | null;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  convertedToSaleAt: string | null;
  createdAt: string;
  updatedAt: string;
  person: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  unit: {
    id: string;
    identifier: string;
    status: string;
    development: { id: string; name: string };
  };
  opportunity: {
    id: string;
    stage: { id: string; name: string; code: string };
  } | null;
  reservation: { id: string; status: string; expiresAt: string } | null;
  createdByUser: { id: string; name: string };
  sentByUser: { id: string; name: string } | null;
  acceptedByUser: { id: string; name: string } | null;
  rejectedByUser: { id: string; name: string } | null;
  sale: { id: string; saleNumber: string; status: string } | null;
  currentVersion: ProposalVersion | null;
  versions: ProposalVersion[];
}

export interface ProposalPage {
  data: SalesProposal[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ProposalFilters {
  opportunityId?: string;
  reservationId?: string;
  personId?: string;
  unitId?: string;
  developmentId?: string;
  status?: SalesProposalStatus;
  page?: number;
  pageSize?: number;
}

export interface ProposalPricePreview {
  unit: { id: string; identifier: string; developmentId: string };
  basePrice: string;
  priceTable: { id: string; name: string };
}

export interface ProposalPaymentConditionInput {
  type: ProposalPaymentConditionType;
  amount: string;
  installments?: number;
  firstDueDate?: string;
  intervalMonths?: number;
  description?: string;
}

export interface CreateProposalInput {
  personId: string;
  unitId: string;
  opportunityId?: string;
  reservationId?: string;
  discount: string;
  validUntil?: string;
  notes?: string;
  conditions: ProposalPaymentConditionInput[];
}

export type CreateProposalVersionInput = Pick<
  CreateProposalInput,
  'discount' | 'validUntil' | 'notes' | 'conditions'
>;
