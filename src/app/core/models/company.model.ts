export type CompanyType = 'SPE' | 'INCORPORADORA';

export interface Company {
  id: string;
  organizationId: string;
  name: string;
  cnpj: string;
  type: CompanyType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDevelopmentSummary {
  id: string;
  name: string;
  status: string;
}

export interface CompanyCount {
  developments: number;
  bankAccounts: number;
}

export interface CompanyListItem extends Company {
  developments: CompanyDevelopmentSummary[];
  _count: CompanyCount;
}

export interface CompanyDevelopment extends CompanyDevelopmentSummary {
  organizationId: string;
  description: string | null;
  type: string;
  companyId: string;
  address: string | null;
  city: string | null;
  expectedLaunchDate: string | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyBankAccount {
  id: string;
  organizationId: string;
  bank: string;
  agency: string;
  account: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDetail extends Company {
  developments: CompanyDevelopment[];
  bankAccounts: CompanyBankAccount[];
}

export interface CreateCompanyInput {
  name: string;
  cnpj: string;
  type: CompanyType;
  notes?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  cnpj?: string;
  type?: CompanyType;
  notes?: string | null;
}
