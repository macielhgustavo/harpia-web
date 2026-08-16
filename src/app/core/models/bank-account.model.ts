import { CompanyType } from './company.model';

export interface BankAccountCompany {
  id: string;
  name: string;
  type: CompanyType;
}

export interface BankAccount {
  id: string;
  organizationId: string;
  bank: string;
  agency: string;
  account: string;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountListItem extends BankAccount {
  company: BankAccountCompany | null;
}

export interface CreateBankAccountInput {
  bank: string;
  agency: string;
  account: string;
  companyId?: string;
}

export interface UpdateBankAccountInput {
  bank?: string;
  agency?: string;
  account?: string;
  companyId?: string | null;
}
