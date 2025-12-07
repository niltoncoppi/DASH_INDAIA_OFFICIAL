// services/googleService.ts
import type { DashboardData, DashboardFilters } from "../types";

// ⚠️ COLE AQUI a URL COMPLETA DO SEU WEB APP (terminando em /exec)
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyJqk9XYh7zCfSgZNMXxe8qR8EERu2fQIkN0j_caw4cUZcvGvTJ2T2KDNVWRs9zd3cD/exec";

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

  const finalUrl = url.toString();
  console.log("[fetchDashboardData] URL chamada:", finalUrl);

  try {
    // Apps Script Web Apps: não usar mode: "cors" explicitamente
    // O fetch padrão funciona melhor com Apps Script
    const response = await fetch(finalUrl, {
      method: "GET",
      redirect: "follow", // Apps Script pode redirecionar
      cache: "no-cache",
      headers: {
        Accept: "application/json",
      },
    });

    // Verifica se a resposta é válida
    if (!response || !response.ok) {
      const statusText = response?.statusText || "Sem resposta";
      const status = response?.status || 0;
      throw new Error(
        `Erro HTTP ${status}: ${statusText}. Verifique se o Web App está publicado corretamente.`
      );
    }

    // Tenta fazer parse do JSON
    let json: {
      ok: boolean;
      message?: string;
      data?: any;
    };

    try {
      const text = await response.text();
      console.log(
        "[fetchDashboardData] Resposta bruta:",
        text.substring(0, 200)
      );
      json = JSON.parse(text);
    } catch (parseError) {
      throw new Error(
        `Erro ao fazer parse da resposta JSON. Verifique se o Apps Script está retornando JSON válido.`
      );
    }

    console.log("RESPOSTA_BACKEND", json);

    if (!json.ok || !json.data) {
      throw new Error(json.message || "Erro ao carregar dados do dashboard");
    }

    const data: DashboardData = {
      error: false, // Se chegou aqui, json.ok é true
      message: json.message,

      // KPIs vindos do Apps Script (overview)
      totalLeadsHoje: json.data.overview?.leadsHoje ?? 0,
      leadsPeriodo: json.data.overview?.leadsTotal ?? 0,
      totalContratosPeriodo: json.data.overview?.contratosTotal ?? 0,
      faturamentoPeriodo: json.data.overview?.faturamentoTotal ?? 0,
      totalInvestimento: json.data.overview?.investimentoTotal ?? 0,
      cplGlobal: json.data.overview?.cpl ?? 0,
      cpaGlobal: json.data.overview?.cpa ?? 0,
      roiGlobal: json.data.overview?.roi ?? 0,
      roasGlobal: json.data.overview?.roas ?? 0,

      // Arrays brutos – exatamente como vierem do Code.gs
      midia: json.data.midia ?? [],
      leads: json.data.leads ?? [],
      vendas: json.data.vendas ?? [],
      kpiCampanhas: json.data.campanhas ?? [],
      kpiVendedores: json.data.vendedores ?? [],
    };

    return data;
  } catch (err: any) {
    console.error("[fetchDashboardData] Erro completo:", err);

    // Mensagens mais descritivas baseadas no tipo de erro
    let errorMessage = "Erro ao buscar dados do dashboard";

    if (err?.message) {
      errorMessage = err.message;
    } else if (err?.name === "TypeError" && err?.message?.includes("fetch")) {
      errorMessage =
        "Erro de conexão. Verifique:\n" +
        "1. Se o Web App do Apps Script está publicado\n" +
        "2. Se a URL está correta\n" +
        "3. Se há problemas de rede/CORS\n" +
        "4. Abra o console do navegador para mais detalhes";
    } else if (typeof err === "string") {
      errorMessage = err;
    }

    throw new Error(errorMessage);
  }
}
