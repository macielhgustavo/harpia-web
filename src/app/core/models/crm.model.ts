import type { PersonRole } from './person.model';

export type SalesActivityType =
  | 'LIGACAO'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'REUNIAO'
  | 'VISITA'
  | 'FOLLOW_UP'
  | 'OUTRO';

export type SalesActivityStatus =
  'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export type SalesActivityPriority = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface SalesStage {
  id: string;
  organizationId: string;
  pipelineId: string;
  name: string;
  code: string;
  position: number;
  colorKey: string;
  defaultProbability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesPipeline {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  stages: SalesStage[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityPerson {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roles: Pick<PersonRole, 'id' | 'role'>[];
}

export interface Opportunity {
  id: string;
  organizationId: string;
  personId: string;
  pipelineId: string;
  stageId: string;
  assignedUserId: string | null;
  developmentId: string | null;
  unitId: string | null;
  source: string | null;
  estimatedValue: string | null;
  probability: number | null;
  nextContactAt: string | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  notes: string | null;
  stageEnteredAt: string;
  createdAt: string;
  updatedAt: string;
  person: OpportunityPerson;
  pipeline: { id: string; name: string };
  stage: SalesStage;
  assignedUser: { id: string; name: string; email: string } | null;
  development: { id: string; name: string } | null;
  unit: { id: string; identifier: string; developmentId: string } | null;
  _count: { activities: number; stageHistory: number };
}

export interface OpportunityStageHistory {
  id: string;
  opportunityId: string;
  fromStageId: string | null;
  toStageId: string;
  changedAt: string;
  fromStage: Pick<SalesStage, 'id' | 'name' | 'code'> | null;
  toStage: Pick<SalesStage, 'id' | 'name' | 'code'>;
  changedByUser: { id: string; name: string; email: string };
}

export interface SalesActivity {
  id: string;
  organizationId: string;
  opportunityId: string;
  personId: string;
  assignedUserId: string | null;
  type: SalesActivityType;
  status: SalesActivityStatus;
  priority: SalesActivityPriority;
  scheduledAt: string | null;
  reminderAt: string | null;
  completedAt: string | null;
  summary: string | null;
  notes: string | null;
  result: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity: {
    id: string;
    stageId: string;
    developmentId: string | null;
    unitId: string | null;
  };
  person: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  assignedUser: { id: string; name: string; email: string } | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OpportunityPage {
  data: Opportunity[];
  pagination: Pagination;
}

export interface SalesActivityPage {
  data: SalesActivity[];
  pagination: Pagination;
}

export interface OpportunityFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  pipelineId?: string;
  stageId?: string;
  assignedUserId?: string;
  developmentId?: string;
  personId?: string;
  source?: string;
}

export interface CreateOpportunityInput {
  personId: string;
  pipelineId?: string;
  stageId?: string;
  assignedUserId?: string;
  developmentId?: string;
  unitId?: string;
  source?: string;
  estimatedValue?: string;
  probability?: number;
  nextContactAt?: string;
  expectedCloseDate?: string;
  notes?: string;
}

export interface UpdateOpportunityInput {
  personId?: string;
  assignedUserId?: string | null;
  developmentId?: string | null;
  unitId?: string | null;
  source?: string | null;
  estimatedValue?: string | null;
  probability?: number | null;
  nextContactAt?: string | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
}

export interface MoveOpportunityInput {
  stageId: string;
  lostReason?: string;
}

export interface SalesActivityFilters {
  page?: number;
  pageSize?: number;
  opportunityId?: string;
  personId?: string;
  assignedUserId?: string;
  type?: SalesActivityType;
  status?: SalesActivityStatus;
  priority?: SalesActivityPriority;
  scheduledFrom?: string;
  scheduledTo?: string;
  openOnly?: boolean;
}

export interface CreateSalesActivityInput {
  opportunityId: string;
  assignedUserId?: string;
  type: SalesActivityType;
  status?: SalesActivityStatus;
  priority?: SalesActivityPriority;
  scheduledAt?: string;
  reminderAt?: string;
  completedAt?: string;
  summary?: string;
  notes?: string;
  result?: string;
}

export type UpdateSalesActivityInput = Partial<
  Omit<CreateSalesActivityInput, 'opportunityId'>
>;
