// types.ts

// =========================
//  FILTROS BÁSICOS
// =========================

export type DashboardFilters = {
  periodo?:
    | "hoje"
    | "ontem"
    | "ultimos_7_dias"
    | "ultimos_30_dias"
    | "mes_atual"
    | "mes_anterior"
    | string; // Permite strings customizadas também
  inicio?: string; // "2025-12-01"
  fim?: string; // "2025-12-31"
  campanha?: string;
  vendedor?: string;
  plataforma?: string;
};

// =========================
//  OVERVIEW (cards grandes)
// =========================

export type OverviewData = {
  investimentoTotal: number;
  faturamentoTotal: number;
  leadsTotal: number;
  contratosTotal: number;
  roas: number;
  roi: number;
  cpl: number;
  cpa: number;
};

// =========================
//  TABELA DE MÍDIA DIÁRIA
// =========================

export type MidiaRow = {
  DATA: string;
  ANO: number;
  MES: number;
  DIA: number;
  PLATAFORMA: string;
  CONTA_MIDIA: string;
  PRODUTO: string;
  SUB_PRODUTO: string;
  CAMPANHA: string;
  CONJUNTO: string;
  ANUNCIO: string;
  CANAL: string;
  INVESTIMENTO_DIA: number;
  LEADS_DIA: number;
  OBSERVACAO: string;
};

// =========================
//  RESUMO POR CAMPANHA
// =========================

export type CampanhaResumo = {
  CAMPANHA: string;
  PLATAFORMA: string;
  PRODUTO: string;
  SUBPRODUTO: string;

  INVESTIMENTO_TOTAL: number;
  LEADS_TOTAL: number;
  CPL: number;
  LEADS_CADASTRADOS: number;
  AGENDADOS: number;
  COMPARECEU: number;
  CONTRATOS: number;
  FATURAMENTO: number;

  CUSTO_POR_AGENDAMENTO: number;
  CUSTO_POR_CONTRATO: number;

  TX_AGENDAMENTO: number | "";
  TX_COMPARECIMENTO: number | "";
  TX_FECHAMENTO: number | "";
};

// =========================
//  PACOTE COMPLETO DE DADOS
//  QUE VEM DO APPS SCRIPT
// =========================

export interface DashboardData {
  error: boolean;
  message?: string;

  // KPI principais (cards grandes)
  totalLeadsHoje: number;
  leadsPeriodo: number;
  totalContratosPeriodo: number;
  faturamentoPeriodo: number;
  totalInvestimento: number;
  cplGlobal: number;
  cpaGlobal: number;
  roiGlobal: number;
  roasGlobal: number;

  // Arrays brutos (para tabelas, gráficos, etc.)
  midia: Record<string, any>[];
  leads: Record<string, any>[];
  vendas: Record<string, any>[];
  kpiCampanhas: Record<string, any>[];
  kpiVendedores: Record<string, any>[];
}
