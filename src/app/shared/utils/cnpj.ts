export function cnpjDigits(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 14);
}

export function formatCnpj(value?: string | null): string {
  return formatCnpjInput(value) || '—';
}

export function formatCnpjInput(value?: string | null): string {
  const digits = cnpjDigits(value);
  if (!digits) {
    return '';
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function isCnpjComplete(value?: string | null): boolean {
  return cnpjDigits(value).length === 14;
}
