import { Return } from '../../core/models/return.model';
import { investmentTypeLabel, isReturnOverdue } from './investment';

describe('investment utils', () => {
  const investmentReturn: Return = {
    id: 'return-1',
    organizationId: 'organization-1',
    allocationId: 'allocation-1',
    expectedAmount: 10000,
    expectedDate: '2026-08-15T00:00:00.000Z',
    realizedDate: null,
    realizedAmount: null,
    status: 'PENDENTE',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  it('traduz os três tipos reais', () => {
    expect(investmentTypeLabel('FINANCEIRO')).toBe('Financeiro');
    expect(investmentTypeLabel('PERMUTA')).toBe('Permuta');
    expect(investmentTypeLabel('OUTRO')).toBe('Outro');
  });

  it('calcula atraso sem persistir ATRASADO', () => {
    expect(
      isReturnOverdue(investmentReturn, new Date('2026-08-16')),
    ).toBeTrue();
    expect(
      isReturnOverdue(
        { ...investmentReturn, status: 'PAGO' },
        new Date('2026-08-16'),
      ),
    ).toBeFalse();
  });
});
