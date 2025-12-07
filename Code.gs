/************************************************************
 * CONFIGURAÇÃO BÁSICA
 ************************************************************/

// ID da planilha que será usada como fonte de dados do dashboard
const SPREADSHEET_ID = '1yrfrqkYVmx3ecSQcWRBporAsD7Jqzfbhv-0AKymmwcM';

/************************************************************
 * FUNÇÕES UTILITÁRIAS
 ************************************************************/

/**
 * Abre uma aba da planilha com segurança.
 */
function getSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // Se a aba não existir, apenas registra no log e retorna null
    console.warn('Aba não encontrada: ' + sheetName);
    return null;
  }
  return sheet;
}

/**
 * Lê uma aba inteira e devolve um array de objetos,
 * usando a primeira linha como cabeçalho.
 */
function getSheetDataAsObjects(sheetName) {
  const sheet = getSheet_(sheetName);
  if (!sheet) return [];

  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    // Só cabeçalho ou vazia
    return [];
  }

  const headers = values[0].map(String);
  const rows = values.slice(1);

  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
}

/**
 * Converte um valor qualquer em número (remove "R$", vírgulas, etc.).
 */
function toNumber_(value) {
  if (value === null || value === '' || typeof value === 'undefined') return 0;
  if (typeof value === 'number') return value;
  let str = String(value)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = Number(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Soma uma coluna numérica dentro de um array de objetos.
 */
function sumColumn_(rows, key) {
  return rows.reduce((acc, row) => acc + toNumber_(row[key]), 0);
}

/************************************************************
 * FUNÇÃO PRINCIPAL CHAMADA PELO FRONTEND
 ************************************************************/

/**
 * Retorna os dados agregados do dashboard.
 *
 * Pode ser chamada do index.html com:
 * google.script.run.withSuccessHandler(renderDashboard).getDashboardData();
 */
function getDashboardData(filters) {
  try {
    // No momento não estamos aplicando filtros;
    // apenas usamos todo o histórico. (Filtros podem ser
    // adicionados depois com segurança.)
    filters = filters || {};

    /***********************
     * 1) LER AS ABAS
     ***********************/
    const midiaDiaria   = getSheetDataAsObjects('MIDIA_DIARIA');     // investimento e leads por dia
    const leadsSheet    = getSheetDataAsObjects('LEADS');            // leads cadastrados
    const vendasSheet   = getSheetDataAsObjects('VENDAS_CONTRATOS'); // contratos / faturamento
    const kpiCampanhas  = getSheetDataAsObjects('KPI_CAMPANHAS');    // resumo por campanha
    const kpiVendedores = getSheetDataAsObjects('KPI_VENDEDORES');   // resumo por vendedor

    /***********************
     * 2) VISÃO GERAL
     ***********************/

    // Investimento total (somatório da coluna INVESTIMENTO_DIA em MIDIA_DIARIA)
    const investimentoTotal = sumColumn_(midiaDiaria, 'INVESTIMENTO_DIA');

    // Vendas (contratos) e faturamento
    const faturamentoTotal = sumColumn_(vendasSheet, 'VALOR_CONTRATO');
    const vendasTotal      = vendasSheet.length;

    // ROI simples = faturamento / investimento
    const roi = investimentoTotal > 0
      ? faturamentoTotal / investimentoTotal
      : 0;

    // Leads no período (total de registros na aba LEADS)
    const leadsPeriodo = leadsSheet.length;

    // Leads hoje (usa DATA_ENTRADA da aba LEADS)
    const hoje = new Date();
    const tz = Session.getScriptTimeZone();
    const hojeStr = Utilities.formatDate(hoje, tz, 'yyyy-MM-dd');

    let leadsHoje = 0;
    leadsSheet.forEach(row => {
      const valorData = row['DATA_ENTRADA'];
      if (!valorData) return;

      let d;
      if (valorData instanceof Date) {
        d = valorData;
      } else {
        // tenta converter string
        d = new Date(valorData);
      }
      const dataStr = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
      if (dataStr === hojeStr) {
        leadsHoje++;
      }
    });

    // CPL (custo por lead)
    const cpl = leadsPeriodo > 0
      ? investimentoTotal / leadsPeriodo
      : 0;

    // CPA (custo por venda/contrato)
    const cpa = vendasTotal > 0
      ? investimentoTotal / vendasTotal
      : 0;

    /***********************
     * 3) RESUMO DE CAMPANHAS (KPI_CAMPANHAS)
     ***********************/
    const campanhasResumo = kpiCampanhas.map(row => ({
      campanha:          row['CAMPANHA']         || '',
      plataforma:        row['PLATAFORMA']      || '',
      produto:           row['PRODUTO']         || '',
      subproduto:        row['SUBPRODUTO']      || '',
      investimento_total:toNumber_(row['INVESTIMENTO_TOTAL']),
      leads_total:       toNumber_(row['LEADS_TOTAL']),
      cpl:               toNumber_(row['CPL']),
      leads_cadastrados: toNumber_(row['LEADS_CADASTRADOS']),
      agendados:         toNumber_(row['AGENDADOS']),
      compareceu:        toNumber_(row['COMPARECEU']),
      contratos:         toNumber_(row['CONTRATOS']),
      faturamento:       toNumber_(row['FATURAMENTO']),
      custo_por_agendamento: toNumber_(row['CUSTO_POR_AGENDAMENTO']),
      custo_por_contrato:    toNumber_(row['CUSTO_POR_CONTRATO']),
      tx_agendamento:    toNumber_(row['TX_AGENDAMENTO']),
      tx_comparecimento: toNumber_(row['TX_COMPARECIMENTO']),
      tx_fechamento:     toNumber_(row['TX_FECHAMENTO'])
    }));

    /***********************
     * 4) RESUMO EQUIPE COMERCIAL (KPI_VENDEDORES)
     ***********************/
    const equipeComercial = kpiVendedores.map(row => ({
      vendedor:     row['VENDEDOR'] || '',
      leads:        toNumber_(row['LEADS']),
      agendados:    toNumber_(row['AGENDADOS']),
      compareceu:   toNumber_(row['COMPARECEU']),
      contratos:    toNumber_(row['CONTRATOS']),
      faturamento:  toNumber_(row['FATURAMENTO']),
      meta_leads:   toNumber_(row['META_LEADS']),
      meta_vendas:  toNumber_(row['META_VENDAS'])
    }));

    /***********************
     * 5) MONTAR OBJETO DE RESPOSTA
     ***********************/
    const result = {
      error: false,

      // VISÃO GERAL
      investimentoTotal: investimentoTotal,
      faturamentoTotal:  faturamentoTotal,
      vendasTotal:       vendasTotal,
      roi:               roi,

      // FUNIL DE LEADS
      leadsHoje:    leadsHoje,
      leadsPeriodo: leadsPeriodo,
      cpl:          cpl,
      cpa:          cpa,

      // TABELAS
      campanhasResumo: campanhasResumo,
      equipeComercial: equipeComercial
    };

    return result;

  } catch (e) {
    // Se der qualquer erro, não quebrar o front.
    console.error('Erro em getDashboardData:', e);
    return {
      error: true,
      message: e.message || String(e)
    };
  }
}

/************************************************************
 * (OPCIONAL) FUNÇÃO IA_GEMINI
 * Se você já tiver IA_GEMINI em outro arquivo, mantenha a sua.
 * Abaixo é só um lembrete de que ela pode coexistir com o código acima.
 ************************************************************/
// function IA_GEMINI(prompt) {
//   // ... sua implementação de chamada ao Gemini aqui ...
// }
