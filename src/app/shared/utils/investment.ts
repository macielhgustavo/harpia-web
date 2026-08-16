import { InvestmentType } from '../../core/models/investment.model';
import { Return } from '../../core/models/return.model';

export const INVESTMENT_TYPE_OPTIONS: ReadonlyArray<{
  value: InvestmentType;
  label: string;
}> = [
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'PERMUTA', label: 'Permuta' },
  { value: 'OUTRO', label: 'Outro' },
];

export function investmentTypeLabel(type: InvestmentType): string {
  return (
    INVESTMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export function isReturnOverdue(
  investmentReturn: Return,
  now = new Date(),
): boolean {
  return (
    investmentReturn.status === 'PENDENTE' &&
    new Date(investmentReturn.expectedDate).getTime() < now.getTime()
  );
}
