export type UnitCategory = 'APARTAMENTO' | 'CASA' | 'LOTE' | 'SALA_COMERCIAL';

export type UnitStatus =
  | 'DISPONIVEL'
  | 'RESERVADA'
  | 'VENDIDA'
  | 'QUITADA'
  | 'DISTRATADA'
  | 'BLOQUEADA'
  | 'PERMUTADA';

export interface UnitTypeSummary {
  id: string;
  name: string;
}

export interface UnitPriceTableSummary {
  id: string;
  name: string;
  phase?: string;
}

export interface UnitPrice {
  id: string;
  organizationId: string;
  unitId: string;
  priceTableId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
  priceTable: UnitPriceTableSummary;
}

export interface Unit {
  id: string;
  organizationId: string;
  developmentId: string;
  identifier: string;
  unitTypeId: string | null;
  category: UnitCategory;
  grouping: string | null;
  landArea: number | null;
  builtArea: number | null;
  parkingSpots: number | null;
  status: UnitStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  unitType: UnitTypeSummary | null;
}

export interface UnitListItem extends Unit {
  prices: UnitPrice[];
}

export interface UnitDocumentSummary {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
}

export interface UnitDetail extends UnitListItem {
  documents: UnitDocumentSummary[];
}

export interface UnitListFilters {
  developmentId: string;
  status?: UnitStatus;
  grouping?: string;
}

export interface CreateUnitInput {
  developmentId: string;
  identifier: string;
  unitTypeId?: string;
  category: UnitCategory;
  grouping?: string;
  landArea?: number;
  builtArea?: number;
  parkingSpots?: number;
  status?: UnitStatus;
  notes?: string;
}

export interface UpdateUnitInput {
  identifier?: string;
  unitTypeId?: string | null;
  category?: UnitCategory;
  grouping?: string | null;
  landArea?: number | null;
  builtArea?: number | null;
  parkingSpots?: number | null;
  status?: UnitStatus;
  notes?: string | null;
}
