export type DocumentCategory = 'CONTRATO' | 'COMPROVANTE' | 'OUTRO';

export interface DocumentPersonSummary {
  id: string;
  name: string;
}

export interface DocumentInvestmentSummary {
  id: string;
  amount: number;
}

export interface DocumentUnitSummary {
  id: string;
  identifier: string;
}

export interface DocumentDevelopmentSummary {
  id: string;
  name: string;
}

export interface Document {
  id: string;
  organizationId: string;
  name: string;
  fileUrl: string;
  downloadUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  personId: string | null;
  investmentId: string | null;
  unitId: string | null;
  developmentId: string | null;
  person?: DocumentPersonSummary | null;
  investment?: DocumentInvestmentSummary | null;
  unit?: DocumentUnitSummary | null;
  development?: DocumentDevelopmentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  personId?: string;
  investmentId?: string;
  unitId?: string;
  developmentId?: string;
}

export interface CreateDocumentInput extends DocumentFilters {
  name: string;
  category: DocumentCategory;
  file: File;
}
