// services/googleService.ts
import type { DashboardData } from "../types";

// ⚠️ COLE AQUI a URL COMPLETA DO SEU WEB APP (terminando em /exec)
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyPwfAwoDCKHq02oohzbS0VFK6rzgUS4NQ-lkdJ73c/exec";

// Filtros opcionais (por enquanto usamos só "periodo")
export interface DashboardFilters {
  periodo?: string;   // ex: "ultimos_30_dias"
  inicio?: string;    // "2025-12-01"
  fim?: string;       // "2025-12-31"
  campanha?: string;
  vendedor?: string;
  plataforma?: string;
}

/**
 * Busca os dados reais do dashboard no Apps Script.
 * Retorna exatamente um DashboardData.
 */
export async function fetchDashboardData(
  filters: DashboardFilters = {}
): Promise<DashboardData> {
  const url = new URL(APPS_SCRIPT_URL);

  // Monta query string com os filtros (se quiser usar depois no Code.gs)
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  console.log("[fetchDashboardData] URL chamada:", url.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP ao buscar dados: ${response.status}`);
  }

  const json = (await response.json()) as {
    ok: boolean;
    message?: string;
    data?: any;
  };

  console.log("RESPOSTA_BACKEND", json);

  if (!json.ok || !json.data) {
    throw new Error(json.message || "Erro ao carregar dados do dashboard");
  }

  const data: DashboardData = {
    error: !json.ok,
    message: json.message,

    // KPIs vindos do Apps Script (overview)
    totalLeadsHoje: json.data.overview.leadsHoje ?? 0,
    leadsPeriodo: json.data.overview.leadsTotal ?? 0,
    totalContratosPeriodo: json.data.overview.contratosTotal ?? 0,
    faturamentoPeriodo: json.data.overview.faturamentoTotal ?? 0,
    totalInvestimento: json.data.overview.investimentoTotal ?? 0,
    cplGlobal: json.data.overview.cpl ?? 0,
    cpaGlobal: json.data.overview.cpa ?? 0,
    roiGlobal: json.data.overview.roi ?? 0,
    roasGlobal: json.data.overview.roas ?? 0,

    // Arrays brutos – exatamente como vierem do Code.gs
    midia: json.data.midia ?? [],
    leads: json.data.leads ?? [],
    vendas: json.data.vendas ?? [],
    kpiCampanhas: json.data.campanhas ?? [],
    kpiVendedores: json.data.vendedores ?? [],
  };

  return data;
}
