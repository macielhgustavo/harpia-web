const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBrl(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? 'Não informado'
    : BRL_FORMATTER.format(value);
}
