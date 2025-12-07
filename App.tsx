// App.tsx
import { useEffect, useState } from "react";
import type { DashboardData } from "./types";
import { fetchDashboardData } from "./services/googleService";

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<string>("ultimos_30_dias");

  useEffect(() => {
    console.log("[App] montou / periodo mudou:", periodo);
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  async function carregarDados() {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchDashboardData({
        periodo,
      });

      console.log("[App] Dados carregados com sucesso");
      setData(result);
    } catch (err: any) {
      console.error("Erro ao carregar dashboard:", err);
      setError(err?.message || "Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }

  const overview = {
    investimentoTotal: data?.totalInvestimento ?? 0,
    faturamentoTotal: data?.faturamentoPeriodo ?? 0,
    leadsTotal: data?.leadsPeriodo ?? 0,
    contratosTotal: data?.totalContratosPeriodo ?? 0,
    roi: data?.roiGlobal ?? 0,
    roas: data?.roasGlobal ?? 0,
    cpl: data?.cplGlobal ?? 0,
    cpa: data?.cpaGlobal ?? 0,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-slate-800 px-6 py-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            DI
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">
              DASH_INDAIA
            </div>
            <div className="text-xs text-slate-400">Manager AI</div>
          </div>
        </div>

        <nav className="space-y-1 text-sm">
          <div className="font-medium text-xs text-slate-400 mb-1">
            MENU PRINCIPAL
          </div>

          <button className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Dashboard
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80">
            Leads &amp; Vendas
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80">
            AI Analyst
          </button>

          <div className="font-medium text-xs text-slate-400 mt-6 mb-1">
            GERAL
          </div>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80">
            Configurações
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80">
            Ajuda
          </button>
        </nav>

        <div className="absolute bottom-4 left-6 text-[11px] text-slate-500">
          © 2024 Indaia System v1.1
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="ml-64 px-8 py-6">
        {/* HEADER */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard de Vendas</h1>
            <p className="text-sm text-slate-400">
              Visão geral dos leads e desempenho comercial.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              placeholder="Pesquisar..."
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm w-56 outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="text-xs text-slate-400">
              {loading ? "Atualizando..." : "Atualizado"}
            </div>
          </div>
        </header>

        {/* FILTROS SUPERIORES */}
        <section className="mb-6 bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 flex items-center gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">PERÍODO</span>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="ultimos_7_dias">Últimos 7 dias</option>
              <option value="ultimos_30_dias">Últimos 30 dias</option>
              <option value="mes_atual">Mês atual</option>
              <option value="mes_anterior">Mês anterior</option>
            </select>
          </div>

          {/* placeholders para filtros futuros */}
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">CAMPANHA</span>
            <select
              disabled
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-xs"
            >
              <option>Todas</option>
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">VENDEDOR</span>
            <select
              disabled
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-xs"
            >
              <option>Todos</option>
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1">PLATAFORMA</span>
            <select
              disabled
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-xs"
            >
              <option>Todas</option>
            </select>
          </div>

          <button
            onClick={carregarDados}
            className="ml-auto px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition"
          >
            {loading ? "Carregando..." : "Filtrar"}
          </button>
        </section>

        {/* MENSAGENS DE ERRO */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* VISÃO GERAL */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            VISÃO GERAL
          </h2>

          <div className="grid grid-cols-4 gap-4">
            <CardKpi
              titulo="INVESTIMENTO TOTAL"
              valor={overview.investimentoTotal}
              prefixo="R$"
            />
            <CardKpi
              titulo="FATURAMENTO"
              valor={overview.faturamentoTotal}
              prefixo="R$"
            />
            <CardKpi
              titulo="ROI GLOBAL"
              valor={overview.roi}
              sufixo="x"
              decimais={2}
            />
            <CardKpi titulo="VENDAS TOTAIS" valor={overview.contratosTotal} />
          </div>
        </section>

        {/* FUNIL DE LEADS */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            FUNIL DE LEADS
          </h2>

          <div className="grid grid-cols-4 gap-4">
            <CardKpi titulo="LEADS HOJE" valor={data?.totalLeadsHoje ?? 0} />
            <CardKpi titulo="LEADS (PERÍODO)" valor={overview.leadsTotal} />
            <CardKpi
              titulo="CUSTO POR LEAD (CPL)"
              valor={overview.cpl}
              prefixo="R$"
              decimais={2}
            />
            <CardKpi
              titulo="CUSTO P/ VENDA (CPA)"
              valor={overview.cpa}
              prefixo="R$"
              decimais={2}
            />
          </div>
        </section>

        {/* PLACEHOLDERS PARA TABELAS / GRÁFICOS */}
        <section className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[220px]">
            <h3 className="text-sm font-semibold mb-2">
              Performance por Campanha
            </h3>
            <p className="text-xs text-slate-500">
              Depois ligamos essa área em <b>MIDIA_DIARIA</b> e{" "}
              <b>KPI_CAMPANHAS</b>.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[220px]">
            <h3 className="text-sm font-semibold mb-2">Ranking Comercial</h3>
            <p className="text-xs text-slate-500">
              Aqui entra o ranking por vendedor usando <b>KPI_VENDEDORES</b>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

// Componente simples para os cards de KPI
type CardProps = {
  titulo: string;
  valor: number;
  prefixo?: string;
  sufixo?: string;
  decimais?: number;
};

function CardKpi({ titulo, valor, prefixo, sufixo, decimais = 0 }: CardProps) {
  const formatado =
    typeof valor === "number"
      ? valor.toLocaleString("pt-BR", {
          minimumFractionDigits: decimais,
          maximumFractionDigits: decimais,
        })
      : valor;

  const mostrarMoeda = prefixo === "R$";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 flex flex-col justify-between">
      <div className="text-xs text-slate-400 mb-2">{titulo}</div>
      <div className="text-2xl font-semibold">
        {mostrarMoeda ? "R$ " : prefixo || ""}
        {formatado}
        {sufixo && <span className="text-base font-normal"> {sufixo}</span>}
      </div>
      {mostrarMoeda && (
        <div className="text-[11px] text-slate-500 mt-1">
          Valores consolidados no período selecionado.
        </div>
      )}
    </div>
  );
}

export default App;
