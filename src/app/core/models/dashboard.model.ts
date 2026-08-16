import { DevelopmentStatus } from './development.model';
import { InteractionListItem } from './interaction.model';
import { UnitStatus } from './unit.model';

export interface DashboardReturnSummary {
  count: number;
  valor: number;
}

export interface DashboardDevelopmentFunding {
  developmentId: string;
  nome: string | null;
  totalCaptado: number;
}

export interface DashboardOverview {
  totalCaptado: number;
  totalAlocado: number;
  totalCaixaGeral: number;
  totalInvestidores: number;
  retornosPendentes: DashboardReturnSummary;
  retornosAtrasados: DashboardReturnSummary;
  retornosPagos: DashboardReturnSummary;
  totalEmpreendimentos: number;
  empreendimentosPorStatus: Partial<Record<DevelopmentStatus, number>>;
  totalUnidades: number;
  unidadesPorStatus: Partial<Record<UnitStatus, number>>;
  valorEmVendas: number;
  captacaoPorEmpreendimento: DashboardDevelopmentFunding[];
  ultimasInteracoes: InteractionListItem[];
}
