export type PersistedReturnStatus = 'PENDENTE' | 'PAGO';
export type ReturnStatus = PersistedReturnStatus | 'ATRASADO';

export interface Return {
  id: string;
  allocationId: string;
  expectedAmount: number;
  expectedDate: string;
  realizedDate: string | null;
  realizedAmount: number | null;
  status: PersistedReturnStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
