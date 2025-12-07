import React, { useEffect, useState } from 'react';
import { getDashboardData } from './services/googleService';
import { DashboardData } from './types';
import { MetricCard } from './components/MetricCard';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  DocumentCheckIcon, 
  PresentationChartLineIcon 
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getDashboardData();
        
        if (result.error) {
          setError(result.message || 'Erro desconhecido retornado pelo servidor.');
        } else {
          setData(result);
        }
      } catch (err: any) {
        setError(err.message || 'Erro de conexão com o Google Sheets.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  const formatPercent = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        <p className="text-gray-600 font-medium text-lg animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border-l-4 border-red-500 p-8 rounded shadow-lg max-w-lg w-full">
          <div className="flex items-center space-x-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800">Erro</h2>
          </div>
          <p className="text-gray-600 text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">DASH_INDAIA</h1>
          </div>
          <div className="text-sm text-gray-500">
            Atualizado: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Visão Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Investimento Total" 
              value={formatCurrency(data.totalInvestimento)}
              color="blue"
              icon={<CurrencyDollarIcon className="h-6 w-6" />}
            />
            <MetricCard 
              title="Faturamento" 
              value={formatCurrency(data.faturamentoPeriodo)}
              color="green"
              icon={<PresentationChartLineIcon className="h-6 w-6" />}
            />
             <MetricCard 
              title="ROI" 
              value={formatNumber(data.roiGlobal)}
              subValue={`ROAS: ${formatNumber(data.roasGlobal)}x`}
              color="indigo"
            />
            <MetricCard 
              title="Vendas" 
              value={formatNumber(data.totalContratosPeriodo)}
              subValue="Contratos Fechados"
              color="green"
              icon={<DocumentCheckIcon className="h-6 w-6" />}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Funil de Leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Leads Hoje" 
              value={formatNumber(data.totalLeadsHoje)}
              color="orange"
              icon={<UserGroupIcon className="h-6 w-6" />}
            />
            <MetricCard 
              title="Leads Período" 
              value={formatNumber(data.leadsPeriodo)}
              color="orange"
            />
            <MetricCard 
              title="CPL (Custo/Lead)" 
              value={formatCurrency(data.cplGlobal)}
              color="blue"
            />
            <MetricCard 
              title="CPA (Custo/Venda)" 
              value={formatCurrency(data.cpaGlobal)}
              color="green"
            />
          </div>
        </section>

        {/* Raw Data Tables Preview (Optional) */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
             <h3 className="text-lg font-medium text-gray-900">Detalhes dos Vendedores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {data.kpiVendedores.length > 0 && Object.keys(data.kpiVendedores[0]).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                  {data.kpiVendedores.length === 0 && <th className="px-6 py-3">Sem dados</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.kpiVendedores.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {Object.values(row).map((val: any, vIdx) => (
                      <td key={vIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {typeof val === 'number' && val > 1000 ? formatNumber(val) : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default App;