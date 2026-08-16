import { ReturnStatus } from './return.model';

export type ReportFormat = 'pdf' | 'xlsx';
export type ReportType =
  'captations' | 'returns' | 'overdue-returns' | 'investor-positions';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  developmentId?: string;
  investorId?: string;
  status?: ReturnStatus | '';
}
