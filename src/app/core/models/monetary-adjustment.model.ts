export type AdjustmentPeriodicity = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface MonetaryIndex {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  periodicity: AdjustmentPeriodicity;
  createdAt: string;
  updatedAt: string;
}

export interface MonetaryIndexInput {
  name: string;
  code: string;
  description?: string;
  active?: boolean;
  periodicity: AdjustmentPeriodicity;
}

export interface MonetaryIndexValue {
  id: string;
  monetaryIndexId: string;
  competence: string;
  percentage: string;
  source: string | null;
  publishedAt: string | null;
  responsibleId: string | null;
}

export interface MonetaryIndexValueInput {
  competence: string;
  percentage: number;
  source?: string;
  publishedAt?: string;
}

export interface ReceivableAdjustmentPolicy {
  id: string;
  receivableId: string;
  monetaryIndexId: string;
  baseDate: string;
  periodicity: AdjustmentPeriodicity;
  lag: number | null;
  active: boolean;
  monetaryIndex: MonetaryIndex;
}

export interface ReceivableAdjustmentPolicyInput {
  monetaryIndexId: string;
  baseDate: string;
  periodicity: AdjustmentPeriodicity;
  lag: number;
  active: boolean;
}

export interface ReceivableAdjustment {
  id: string;
  receivableId: string;
  previousAmount: string;
  adjustedAmount: string;
  difference: string;
  startCompetence: string;
  endCompetence: string;
  indexValues: Record<string, string>;
  appliedAt: string | null;
  appliedBy: { id: string; name: string } | null;
}

export interface AdjustmentPreview {
  receivableId: string;
  monetaryIndex: Pick<MonetaryIndex, 'id' | 'name' | 'code'>;
  previousAmount: string;
  adjustedAmount: string;
  difference: string;
  factor: string;
  startCompetence: string;
  endCompetence: string;
  indexValues: Record<string, string>;
}

export interface AdjustmentPeriodInput {
  startCompetence: string;
  endCompetence: string;
}
