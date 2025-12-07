// ================================
//  CONFIGURAÇÃO BÁSICA
// ================================

// ID da planilha DASH_INDAIA
const SPREADSHEET_ID = "1yrfrqkYVmx3ecSQcWRBporAsD7Jqzfbhv-0AKymmwcM";

// Nome das abas usadas no BI
const SHEET_MIDIA = "MIDIA_DIARIA";
const SHEET_KPI_CAMPANHAS = "KPI_CAMPANHAS";
const SHEET_KPI_VENDEDORES = "KPI_VENDEDORES";

// ================================
//  FUNÇÕES UTILITÁRIAS
// ================================

/**
 * Abre a planilha principal.
 */
function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Retorna a aba pelo nome ou lança erro.
 */
function getSheet_(name) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error("Aba não encontrada: " + name);
  }
  return sheet;
}

/**
 * Converte um range em array de objetos usando a primeira linha como cabeçalho.
 */
function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = {};
    const rowValues = values[i];

    let isEmpty = true;

    headers.forEach(function (header, col) {
      const value = rowValues[col];
      if (value !== "" && value != null) {
        isEmpty = false;
      }
      row[header] = value;
    });

    if (!isEmpty) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Tenta converter string/valor para número.
 * Aceita formato "R$ 1.234,56" etc.
 */
function toNumber_(value) {
  if (typeof value === "number") return value;
  if (value === "" || value == null) return 0;

  let s = String(value)
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .replace(",", ".");

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Compara duas datas sem horário.
 */
function isSameDay_(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ================================
//  LÓGICA DE NEGÓCIO DO DASHBOARD
// ================================

/**
 * Lê as abas e monta o pacote completo de dados.
 * Filtros ainda não são usados a fundo – por enquanto usamos tudo.
 */
function getDashboardData_(filters) {
  // Lê as abas (se não existirem, ficam arrays vazios)
  let midia = [];
  let campanhas = [];
  let vendedores = [];

  try {
    midia = sheetToObjects_(getSheet_(SHEET_MIDIA));
  } catch (e) {
    midia = [];
  }

  try {
    campanhas = sheetToObjects_(getSheet_(SHEET_KPI_CAMPANHAS));
  } catch (e) {
    campanhas = [];
  }

  try {
    vendedores = sheetToObjects_(getSheet_(SHEET_KPI_VENDEDORES));
  } catch (e) {
    vendedores = [];
  }

  // --- OVERVIEW (cards grandes) ---
  let investimentoTotal = 0;
  let faturamentoTotal = 0;
  let leadsTotal = 0;
  let contratosTotal = 0;

  // Usamos principalmente KPI_CAMPANHAS para overview
  campanhas.forEach(function (row) {
    investimentoTotal += toNumber_(row["INVESTIMENTO_TOTAL"]);
    faturamentoTotal += toNumber_(row["FATURAMENTO"]);
    leadsTotal += toNumber_(row["LEADS_TOTAL"]);
    contratosTotal += toNumber_(row["CONTRATOS"]);
  });

  // Leads do dia (usa MIDIA_DIARIA, se disponível)
  let leadsHoje = 0;
  if (midia.length > 0) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    midia.forEach(function (row) {
      let data = row["DATA"];
      if (!(data instanceof Date) && data) {
        var parsed = new Date(data);
        if (!isNaN(parsed.getTime())) {
          data = parsed;
        }
      }
      if (data instanceof Date && isSameDay_(data, hoje)) {
        leadsHoje += toNumber_(row["LEADS_DIA"]);
      }
    });
  }

  const cpl = leadsTotal > 0 ? investimentoTotal / leadsTotal : 0;
  const cpa = contratosTotal > 0 ? investimentoTotal / contratosTotal : 0;
  const roas = investimentoTotal > 0 ? faturamentoTotal / investimentoTotal : 0;
  const roi =
    investimentoTotal > 0
      ? (faturamentoTotal - investimentoTotal) / investimentoTotal
      : 0;

  const overview = {
    investimentoTotal: investimentoTotal,
    faturamentoTotal: faturamentoTotal,
    leadsTotal: leadsTotal,
    contratosTotal: contratosTotal,
    roas: roas,
    roi: roi,
    cpl: cpl,
    cpa: cpa,
    leadsHoje: leadsHoje,
  };

  // Por enquanto, arrays "leads" e "vendas" vão vazios
  const result = {
    overview: overview,
    midia: midia,
    leads: [],
    vendas: [],
    campanhas: campanhas,
    vendedores: vendedores,
  };

  return result;
}

// ================================
//  ENDPOINT WEB (usado pelo React)
// ================================

function doGet(e) {
  try {
    const filters = {
      periodo: e && e.parameter && e.parameter.periodo,
      inicio: e && e.parameter && e.parameter.inicio,
      fim: e && e.parameter && e.parameter.fim,
      campanha: e && e.parameter && e.parameter.campanha,
      vendedor: e && e.parameter && e.parameter.vendedor,
      plataforma: e && e.parameter && e.parameter.plataforma,
    };

    const data = getDashboardData_(filters);

    const response = {
      ok: true,
      data: data,
    };

    // Retorna JSON (CORS é configurado nas configurações do Web App)
    return ContentService.createTextOutput(
      JSON.stringify(response)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const errorResponse = {
      ok: false,
      message: err && err.message ? err.message : String(err),
    };

    // Retorna erro
    return ContentService.createTextOutput(
      JSON.stringify(errorResponse)
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
