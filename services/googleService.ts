import { DashboardData } from '../types';

export const getDashboardData = (): Promise<DashboardData> => {
  return new Promise((resolve, reject) => {
    // Check if running in Google Apps Script environment
    if (window.google && window.google.script) {
      window.google.script.run
        .withSuccessHandler((data: DashboardData) => {
          resolve(data);
        })
        .withFailureHandler((error: Error) => {
          reject(error);
        })
        .getDashboardData();
    } else {
      // Mock data for local development since GAS environment is not available
      console.warn('Environment: Local/Dev. Returning mock data.');
      setTimeout(() => {
        resolve({
          error: false,
          totalLeadsHoje: 12,
          leadsPeriodo: 450,
          totalContratosPeriodo: 25,
          faturamentoPeriodo: 125000.50,
          totalInvestimento: 15000.00,
          cplGlobal: 33.33,
          cpaGlobal: 600.00,
          roiGlobal: 7.33,
          roasGlobal: 8.33,
          midia: [],
          leads: [],
          vendas: [],
          kpiCampanhas: [],
          kpiVendedores: []
        });
      }, 1500);
    }
  });
};