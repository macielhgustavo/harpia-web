import {
  DevelopmentStatus,
  DevelopmentType,
} from '../../core/models/development.model';
import { UnitCategory, UnitStatus } from '../../core/models/unit.model';

export const DEVELOPMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: DevelopmentStatus;
  label: string;
}> = [
  { value: 'EM_APROVACAO', label: 'Em aprovação' },
  { value: 'EM_CAPTACAO', label: 'Em captação' },
  { value: 'EM_OBRA', label: 'Em obra' },
  { value: 'PRONTO', label: 'Pronto' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const DEVELOPMENT_TYPE_OPTIONS: ReadonlyArray<{
  value: DevelopmentType;
  label: string;
}> = [
  { value: 'PREDIO', label: 'Prédio' },
  { value: 'CONDOMINIO_CASAS', label: 'Condomínio de casas' },
  { value: 'LOTEAMENTO', label: 'Loteamento' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'MISTO', label: 'Misto' },
];

export function developmentStatusLabel(status: DevelopmentStatus): string {
  return DEVELOPMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function developmentTypeLabel(type: DevelopmentType): string {
  return DEVELOPMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function developmentStatusBadge(status: DevelopmentStatus): string {
  const classes: Record<DevelopmentStatus, string> = {
    EM_APROVACAO: 'bg-amber-100 text-amber-800',
    EM_CAPTACAO: 'bg-green-100 text-green-800',
    EM_OBRA: 'bg-blue-100 text-blue-800',
    PRONTO: 'bg-teal-100 text-teal-800',
    ENTREGUE: 'bg-slate-100 text-slate-700',
    CANCELADO: 'bg-red-100 text-red-800',
  };
  return classes[status];
}

export function unitStatusLabel(status: UnitStatus): string {
  const labels: Record<UnitStatus, string> = {
    DISPONIVEL: 'Disponível',
    RESERVADA: 'Reservada',
    VENDIDA: 'Vendida',
    QUITADA: 'Quitada',
    DISTRATADA: 'Distratada',
    BLOQUEADA: 'Bloqueada',
    PERMUTADA: 'Permutada',
  };
  return labels[status];
}

export function unitCategoryLabel(category: UnitCategory): string {
  const labels: Record<UnitCategory, string> = {
    APARTAMENTO: 'Apartamento',
    CASA: 'Casa',
    LOTE: 'Lote',
    SALA_COMERCIAL: 'Sala comercial',
  };
  return labels[category];
}

export function toDateInput(value?: string | null): string {
  return value?.slice(0, 10) ?? '';
}

export function formatDate(value?: string | null): string {
  const date = toDateInput(value);
  if (!date) return 'Não informado';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
