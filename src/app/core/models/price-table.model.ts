export interface PriceTable {
  id: string;
  organizationId: string;
  developmentId: string;
  name: string;
  phase: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceTableListItem extends PriceTable {
  _count: {
    unitPrices: number;
  };
}

export interface PriceTableUnitSummary {
  id: string;
  identifier: string;
}

export interface UnitPrice {
  id: string;
  organizationId: string;
  unitId: string;
  priceTableId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnitPriceRecord extends UnitPrice {
  unit: PriceTableUnitSummary;
}

export interface PriceTableDetail extends PriceTable {
  unitPrices: UnitPriceRecord[];
}

export interface CreatePriceTableInput {
  developmentId: string;
  name: string;
  phase: string;
  active?: boolean;
}

export interface UpdatePriceTableInput {
  name?: string;
  phase?: string;
  active?: boolean;
}

export interface SetUnitPriceInput {
  unitId: string;
  value: number;
}

export interface UpdateUnitPriceInput {
  value: number;
}
