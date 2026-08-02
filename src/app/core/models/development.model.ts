import type { CompanyType } from './company.model';
import type { PriceTable } from './price-table.model';
import type { Unit } from './unit.model';
import type { UnitType } from './unit-type.model';

export type DevelopmentType =
  | 'PREDIO'
  | 'CONDOMINIO_CASAS'
  | 'LOTEAMENTO'
  | 'COMERCIAL'
  | 'MISTO';

export type DevelopmentStatus =
  | 'EM_APROVACAO'
  | 'EM_CAPTACAO'
  | 'EM_OBRA'
  | 'PRONTO'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface Development {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: DevelopmentType;
  companyId: string | null;
  address: string | null;
  city: string | null;
  status: DevelopmentStatus;
  expectedLaunchDate: string | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentCompanySummary {
  id: string;
  name: string;
  type: CompanyType;
}

export interface DevelopmentListItem extends Development {
  company: DevelopmentCompanySummary | null;
  _count: {
    units: number;
  };
}

export interface DevelopmentDetail extends Development {
  company: DevelopmentCompanySummary | null;
  unitTypes: UnitType[];
  units: Unit[];
  priceTables: PriceTable[];
  _count: {
    allocations: number;
    units: number;
  };
}

export interface CreateDevelopmentInput {
  name: string;
  type: DevelopmentType;
  description?: string;
  companyId?: string;
  address?: string;
  city?: string;
  status?: DevelopmentStatus;
  expectedLaunchDate?: string;
  expectedDeliveryDate?: string;
}

export interface UpdateDevelopmentInput {
  name?: string;
  description?: string | null;
  type?: DevelopmentType;
  companyId?: string | null;
  address?: string | null;
  city?: string | null;
  status?: DevelopmentStatus;
  expectedLaunchDate?: string;
  expectedDeliveryDate?: string;
}
