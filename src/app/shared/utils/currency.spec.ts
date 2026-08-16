import { formatBrl } from './currency';

describe('formatBrl', () => {
  it('formata moeda brasileira de forma centralizada', () => {
    expect(formatBrl(420000)).toContain('420.000,00');
  });

  it('trata valor ausente sem inventar zero', () => {
    expect(formatBrl(null)).toBe('Não informado');
    expect(formatBrl(Number.NaN)).toBe('Não informado');
  });
});
