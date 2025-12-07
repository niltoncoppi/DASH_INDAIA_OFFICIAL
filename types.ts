export interface DashboardData {
  error: boolean;
  message?: string;
  
  // KPI Metrics
  totalLeadsHoje: number;
  leadsPeriodo: number;
  totalContratosPeriodo: number;
  faturamentoPeriodo: number;
  totalInvestimento: number;
  cplGlobal: number;
  cpaGlobal: number;
  roiGlobal: number;
  roasGlobal: number;

  // Raw Data Arrays
  midia: Record<string, any>[];
  leads: Record<string, any>[];
  vendas: Record<string, any>[];
  kpiCampanhas: Record<string, any>[];
  kpiVendedores: Record<string, any>[];
}

// Augment window to support Google Apps Script functions
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (data: any) => void) => {
            getDashboardData: () => void;
            withFailureHandler: (callback: (error: Error) => void) => {
              getDashboardData: () => void;
            }
          };
          withFailureHandler: (callback: (error: Error) => void) => {
            getDashboardData: () => void;
          };
          getDashboardData: () => void;
        };
      };
    };
  }
}