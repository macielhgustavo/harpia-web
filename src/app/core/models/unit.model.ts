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
