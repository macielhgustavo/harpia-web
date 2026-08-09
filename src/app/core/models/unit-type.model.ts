export interface UnitType {
  id: string;
  organizationId: string;
  developmentId: string;
  name: string;
  bedrooms: number | null;
  suites: number | null;
  standardArea: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnitTypeListItem extends UnitType {
  _count: {
    units: number;
  };
}

export interface UnitTypeUnitSummary {
  id: string;
  identifier: string;
}

export interface UnitTypeDetail extends UnitType {
  units: UnitTypeUnitSummary[];
}

export interface CreateUnitTypeInput {
  developmentId: string;
  name: string;
  bedrooms?: number;
  suites?: number;
  standardArea?: number;
}

export interface UpdateUnitTypeInput {
  name?: string;
  bedrooms?: number | null;
  suites?: number | null;
  standardArea?: number | null;
}
