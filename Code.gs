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
 * Ignora linhas completamente vazias.
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

    // Só adiciona se não estiver completamente vazio
    // Para MIDIA_DIARIA, verifica se tem pelo menos DATA válida
    if (!isEmpty) {
      // Se for MIDIA_DIARIA, verifica se tem DATA válida
      if (sheet.getName() === SHEET_MIDIA) {
        var data = toDate_(row["DATA"]);
        if (data) {
          rows.push(row);
        }
      } else {
        rows.push(row);
      }
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

/**
 * Converte string/valor para Date.
 * Aceita Date object, string ISO, ou string no formato brasileiro.
 * Google Sheets pode retornar Date objects diretamente.
 * Normaliza a data para o timezone local, preservando apenas dia/mês/ano.
 * IMPORTANTE: Google Sheets retorna datas no timezone da planilha (geralmente UTC ou local).
 * Esta função garante que sempre extrai o dia/mês/ano corretamente, independente do timezone.
 */
function toDate_(value) {
  if (!value) return null;

  var dateObj = null;
  var ano, mes, dia;

  if (value instanceof Date) {
    // Google Sheets retorna Date objects no timezone local do servidor
    // IMPORTANTE: Sempre usar getFullYear(), getMonth(), getDate() (métodos locais)
    // porque o Google Sheets já retorna as datas no timezone correto
    ano = value.getFullYear();
    mes = value.getMonth();
    dia = value.getDate();

    // Cria nova data no timezone local com apenas dia/mês/ano (meio-dia para evitar edge cases)
    dateObj = new Date(ano, mes, dia, 12, 0, 0);
  } else if (typeof value === "number") {
    // Se é número, pode ser timestamp Unix (milissegundos) ou número serial do Sheets
    dateObj = new Date(value);
    if (!isNaN(dateObj.getTime())) {
      // Normaliza para preservar apenas dia/mês/ano usando métodos locais
      ano = dateObj.getFullYear();
      mes = dateObj.getMonth();
      dia = dateObj.getDate();
      dateObj = new Date(ano, mes, dia, 12, 0, 0);
    } else {
      return null;
    }
  } else {
    // String: pode ser ISO (ex: "2025-12-07T03:00:00.000Z") ou formato brasileiro
    var str = String(value);

    // Tenta extrair componentes diretamente de string ISO (YYYY-MM-DD)
    var isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      // Extrai ano, mês, dia diretamente da string (evita problemas de timezone)
      ano = parseInt(isoMatch[1], 10);
      mes = parseInt(isoMatch[2], 10) - 1; // Mês é 0-indexed no JavaScript
      dia = parseInt(isoMatch[3], 10);
      dateObj = new Date(ano, mes, dia, 12, 0, 0);
    } else {
      // Tenta parse direto (formato brasileiro ou outros)
      dateObj = new Date(value);
      if (!isNaN(dateObj.getTime())) {
        // Normaliza para preservar apenas dia/mês/ano usando métodos locais
        ano = dateObj.getFullYear();
        mes = dateObj.getMonth();
        dia = dateObj.getDate();
        dateObj = new Date(ano, mes, dia, 12, 0, 0);
      } else {
        return null;
      }
    }
  }

  return dateObj;
}

/**
 * Calcula o range de datas baseado no período.
 * Retorna { inicio: Date, fim: Date } ou null se não houver filtro.
 */
function getDateRange_(filters) {
  if (!filters) return null;

  var inicio = null;
  var fim = null;
  // Cria data de hoje no timezone local, zerando horas
  var agora = new Date();
  var hoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    0,
    0,
    0
  );

  // Se tem inicio e fim explícitos (filtro personalizado), usa eles
  if (filters.inicio || filters.fim) {
    if (filters.inicio) {
      inicio = toDate_(filters.inicio);
      if (inicio) inicio.setHours(0, 0, 0, 0);
    }
    if (filters.fim) {
      fim = toDate_(filters.fim);
      if (fim) fim.setHours(23, 59, 59, 999);
    }
    // Se tem pelo menos um, retorna o range
    if (inicio || fim) {
      // Se só tem um, usa o mesmo valor para ambos ou hoje
      if (!inicio) inicio = new Date(fim);
      if (!fim) fim = new Date(hoje);
      console.log("Range personalizado:", inicio, "até", fim);
      return { inicio: inicio, fim: fim };
    }
  }

  // Se tem periodo, calcula baseado nele
  if (filters.periodo) {
    var dataInicio = new Date(hoje);
    var dataFim = new Date(hoje);
    dataFim.setHours(23, 59, 59, 999);

    if (filters.periodo === "hoje") {
      // HOJE: apenas o dia de hoje (00:00:00 até 23:59:59)
      // Usa a mesma data de hoje já criada acima
      inicio = new Date(hoje);
      fim = new Date(hoje);
      fim.setHours(23, 59, 59, 999);
      console.log(
        "Filtro HOJE: apenas",
        inicio.toLocaleDateString("pt-BR"),
        "| Início:",
        inicio.toISOString(),
        "| Fim:",
        fim.toISOString()
      );
    } else if (filters.periodo === "ontem") {
      // ONTEM: apenas o dia de ontem (dia atual - 1)
      // Calcula ontem subtraindo 1 dia da data de hoje
      var ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);

      // Extrai componentes para criar range preciso
      var anoOntem = ontem.getFullYear();
      var mesOntem = ontem.getMonth();
      var diaOntem = ontem.getDate();

      // Cria inicio e fim como o mesmo dia (ontem)
      inicio = new Date(anoOntem, mesOntem, diaOntem, 0, 0, 0);
      fim = new Date(anoOntem, mesOntem, diaOntem, 23, 59, 59, 999);

      // Validação: calcula números para garantir que está correto
      var hojeNumValidacao = dateToNumber_(hoje);
      var ontemNumValidacao = dateToNumber_(inicio);

      console.log("=== FILTRO ONTEM ===");
      console.log(
        "Data de HOJE:",
        hoje.toLocaleDateString("pt-BR"),
        "(YYYYMMDD:",
        hojeNumValidacao + ")"
      );
      console.log(
        "Data de ONTEM:",
        inicio.toLocaleDateString("pt-BR"),
        "(YYYYMMDD:",
        ontemNumValidacao + ")"
      );
      console.log(
        "Range: Início =",
        inicio.toISOString(),
        "| Fim =",
        fim.toISOString()
      );
      console.log(
        "⚠️ IMPORTANTE: Apenas registros com data",
        ontemNumValidacao,
        "serão incluídos"
      );
      console.log(
        "⚠️ IMPORTANTE: Registros com data",
        hojeNumValidacao,
        "(HOJE) serão EXCLUÍDOS"
      );
    } else if (filters.periodo === "ultimos_7_dias") {
      dataInicio.setDate(dataInicio.getDate() - 6); // -6 porque inclui hoje (7 dias total)
      inicio = dataInicio;
      fim = dataFim;
    } else if (filters.periodo === "ultimos_30_dias") {
      dataInicio.setDate(dataInicio.getDate() - 29); // -29 porque inclui hoje (30 dias total)
      inicio = dataInicio;
      fim = dataFim;
    } else if (filters.periodo === "mes_atual") {
      dataInicio.setDate(1);
      inicio = dataInicio;
      fim = dataFim;
    } else if (filters.periodo === "mes_anterior") {
      dataInicio.setMonth(dataInicio.getMonth() - 1);
      dataInicio.setDate(1);
      inicio = dataInicio;
      // Último dia do mês anterior
      dataFim.setDate(0);
      dataFim.setHours(23, 59, 59, 999);
      fim = dataFim;
    } else if (filters.periodo === "personalizado") {
      // Personalizado já foi tratado acima (inicio/fim)
      return null;
    }

    if (inicio && fim) {
      console.log(
        "Range calculado para período '" + filters.periodo + "':",
        inicio,
        "até",
        fim
      );
      return { inicio: inicio, fim: fim };
    }
  }

  console.log("Nenhum range calculado - sem filtro de período");
  return null;
}

/**
 * Converte uma data para número YYYYMMDD para comparação precisa.
 */
function dateToNumber_(dateObj) {
  if (!dateObj) return null;
  var ano = dateObj.getFullYear();
  var mes = dateObj.getMonth();
  var dia = dateObj.getDate();
  return ano * 10000 + (mes + 1) * 100 + dia;
}

/**
 * Obtém a data de hoje como número YYYYMMDD.
 */
function getHojeNum_() {
  var agora = new Date();
  var hoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    0,
    0,
    0
  );
  return dateToNumber_(hoje);
}

/**
 * Verifica se uma data está dentro do range.
 * Compara apenas a data (dia/mês/ano), ignorando hora e timezone.
 * Usa comparação direta de componentes para garantir precisão.
 * PARA FILTRO "ONTEM": Aceita APENAS datas que são EXATAMENTE iguais ao range.
 */
function isDateInRange_(data, range) {
  if (!range || !data) return true; // Sem filtro, inclui tudo

  var dataObj = toDate_(data);
  if (!dataObj) {
    console.log("Data inválida na linha:", data);
    return false;
  }

  // Extrai componentes de data (ano, mês, dia) para comparação direta
  // Isso evita problemas de timezone e horas
  var anoRegistro = dataObj.getFullYear();
  var mesRegistro = dataObj.getMonth();
  var diaRegistro = dataObj.getDate();

  var anoInicio = range.inicio.getFullYear();
  var mesInicio = range.inicio.getMonth();
  var diaInicio = range.inicio.getDate();

  var anoFim = range.fim.getFullYear();
  var mesFim = range.fim.getMonth();
  var diaFim = range.fim.getDate();

  // Compara diretamente os componentes de data
  // Cria um número único para cada data: YYYYMMDD
  var dataRegistroNum = dateToNumber_(dataObj);
  var dataInicioNum = dateToNumber_(range.inicio);
  var dataFimNum = dateToNumber_(range.fim);

  // VALIDAÇÃO CRÍTICA: Se o range é de um único dia (filtro "hoje" ou "ontem")
  // a data do registro deve ser EXATAMENTE igual ao range
  var isFiltroDiaUnico = dataInicioNum === dataFimNum;

  if (isFiltroDiaUnico) {
    // Para filtros de dia único, a data deve ser EXATAMENTE igual ao range
    if (dataRegistroNum !== dataInicioNum) {
      return false;
    }

    // VALIDAÇÃO ESPECÍFICA PARA "ONTEM":
    // Se o range é anterior a hoje (filtro "ontem"),
    // garante que a data do registro NÃO é hoje
    var hojeNum = getHojeNum_();
    if (dataInicioNum < hojeNum) {
      // Este é um filtro "ontem" - a data deve ser exatamente igual ao range
      // e NÃO pode ser igual a hoje
      if (dataRegistroNum === hojeNum) {
        console.log(
          "[isDateInRange] ✗ BLOQUEADO: Dado de HOJE detectado no filtro ONTEM!",
          "Data registro:",
          dataRegistroNum,
          "| Range esperado (ontem):",
          dataInicioNum,
          "| Hoje:",
          hojeNum
        );
        return false; // Exclui dados de hoje quando o filtro é "ontem"
      }
      // Se chegou aqui, a data é exatamente igual ao range de ontem - OK
      return true;
    }
    // Se não é filtro "ontem", apenas verifica se é igual ao range
    return true;
  }

  // Para ranges de múltiplos dias, também verifica se o range termina antes de hoje
  // Se o range termina antes de hoje, bloqueia dados de hoje
  var hojeNum = getHojeNum_();
  if (dataFimNum < hojeNum && dataRegistroNum === hojeNum) {
    console.log(
      "[isDateInRange] ✗ BLOQUEADO: Dado de HOJE detectado em range anterior a hoje!",
      "Data registro:",
      dataRegistroNum,
      "| Range:",
      dataInicioNum,
      "até",
      dataFimNum,
      "| Hoje:",
      hojeNum
    );
    return false;
  }

  // Para ranges de múltiplos dias, usa comparação normal
  var dentro =
    dataRegistroNum >= dataInicioNum && dataRegistroNum <= dataFimNum;

  // Formata strings para logs
  var dataRegistroStr =
    String(diaRegistro).padStart(2, "0") +
    "/" +
    String(mesRegistro + 1).padStart(2, "0") +
    "/" +
    anoRegistro;
  var dataInicioStr =
    String(diaInicio).padStart(2, "0") +
    "/" +
    String(mesInicio + 1).padStart(2, "0") +
    "/" +
    anoInicio;
  var dataFimStr =
    String(diaFim).padStart(2, "0") +
    "/" +
    String(mesFim + 1).padStart(2, "0") +
    "/" +
    anoFim;

  // Log detalhado para TODAS as comparações quando filtro é "hoje" ou "ontem"
  // Isso ajuda a identificar problemas de filtragem
  var isFiltroDiaUnico = dataInicioNum === dataFimNum;

  if (dentro) {
    console.log(
      "[isDateInRange] ✓ INCLUÍDA:",
      dataRegistroStr,
      "(YYYYMMDD:",
      dataRegistroNum,
      ") | Range:",
      dataInicioStr,
      "(YYYYMMDD:",
      dataInicioNum,
      ") até",
      dataFimStr,
      "(YYYYMMDD:",
      dataFimNum,
      ")"
    );
  } else if (isFiltroDiaUnico) {
    // Para filtros de dia único (hoje/ontem), loga todas as exclusões
    console.log(
      "[isDateInRange] ✗ EXCLUÍDA:",
      dataRegistroStr,
      "(YYYYMMDD:",
      dataRegistroNum,
      ") | Fora do range:",
      dataInicioStr,
      "(YYYYMMDD:",
      dataInicioNum,
      ")"
    );
  }

  return dentro;
}

// ================================
//  LÓGICA DE NEGÓCIO DO DASHBOARD
// ================================

/**
 * Lê as abas e monta o pacote completo de dados.
 * Agora aplica filtros de período corretamente.
 */
function getDashboardData_(filters) {
  // Log dos filtros recebidos
  console.log(
    "getDashboardData_ chamado com filtros:",
    JSON.stringify(filters)
  );

  // Calcula o range de datas baseado nos filtros
  var dateRange = getDateRange_(filters || {});
  console.log(
    "dateRange calculado:",
    dateRange ? dateRange.inicio + " até " + dateRange.fim : "null (sem filtro)"
  );

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

  // Filtra MIDIA_DIARIA por período (se houver filtro)
  var midiaFiltrada = midia;
  if (dateRange) {
    console.log("=== FILTRANDO MIDIA_DIARIA POR PERÍODO ===");
    console.log("Total de registros na planilha:", midia.length);

    // Extrai componentes do range para comparação
    var anoInicioRange = dateRange.inicio.getFullYear();
    var mesInicioRange = dateRange.inicio.getMonth();
    var diaInicioRange = dateRange.inicio.getDate();
    var anoFimRange = dateRange.fim.getFullYear();
    var mesFimRange = dateRange.fim.getMonth();
    var diaFimRange = dateRange.fim.getDate();
    var inicioNum =
      anoInicioRange * 10000 + (mesInicioRange + 1) * 100 + diaInicioRange;
    var fimNum = anoFimRange * 10000 + (mesFimRange + 1) * 100 + diaFimRange;

    var inicioStr = dateRange.inicio.toLocaleDateString("pt-BR");
    var fimStr = dateRange.fim.toLocaleDateString("pt-BR");
    console.log("Período do filtro:", inicioStr, "até", fimStr);
    console.log("Range numérico (YYYYMMDD):", inicioNum, "até", fimNum);

    // Lista todas as datas da planilha antes de filtrar
    console.log("=== DATAS NA PLANILHA (ANTES DO FILTRO) ===");
    midia.slice(0, 10).forEach(function (row, index) {
      var dataObj = toDate_(row["DATA"]);
      if (dataObj) {
        var ano = dataObj.getFullYear();
        var mes = dataObj.getMonth();
        var dia = dataObj.getDate();
        var dataNum = ano * 10000 + (mes + 1) * 100 + dia;
        var dataStr = dataObj.toLocaleDateString("pt-BR");
        console.log(
          "  [" + index + "] " + dataStr + " (YYYYMMDD: " + dataNum + ")"
        );
      }
    });

    // Usa as funções helper para simplificar
    var hojeNumFiltro = getHojeNum_();
    var isFiltroDiaUnicoFiltro = inicioNum === fimNum;
    var isFiltroOntemFiltro =
      isFiltroDiaUnicoFiltro && inicioNum < hojeNumFiltro;

    console.log("=== VALIDAÇÃO DO FILTRO ===");
    console.log("Range numérico:", inicioNum, "até", fimNum);
    console.log("Hoje numérico:", hojeNumFiltro);
    console.log("É filtro dia único?", isFiltroDiaUnicoFiltro);
    console.log("É filtro ONTEM?", isFiltroOntemFiltro);
    if (isFiltroOntemFiltro) {
      console.log(
        "⚠️ FILTRO ONTEM ATIVO: Apenas dados com data",
        inicioNum,
        "serão incluídos"
      );
      console.log("⚠️ Dados de HOJE (", hojeNumFiltro, ") serão EXCLUÍDOS");
    }

    var registrosIncluidos = 0;
    var registrosExcluidos = 0;

    midiaFiltrada = midia.filter(function (row) {
      // Log do valor original da data para debug
      var dataOriginal = row["DATA"];
      var dataObj = toDate_(dataOriginal);

      if (!dataObj) {
        registrosExcluidos++;
        console.log("✗ EXCLUÍDO: Data inválida", dataOriginal);
        return false;
      }

      // Usa função helper para obter número da data
      var dataRegistroNum = dateToNumber_(dataObj);
      var dataStr = dataObj.toLocaleDateString("pt-BR");

      // VALIDAÇÃO EXPLÍCITA PARA FILTRO "ONTEM":
      // Se é filtro "ontem", aceita APENAS datas que são exatamente iguais ao range
      // e rejeita explicitamente dados de hoje
      if (isFiltroOntemFiltro) {
        // Log detalhado para debug
        console.log(
          "[FILTRO ONTEM] Processando registro:",
          "Data original:",
          dataOriginal,
          "| Data convertida:",
          dataStr,
          "| Data numérica:",
          dataRegistroNum,
          "| Range esperado:",
          inicioNum,
          "| Hoje:",
          hojeNumFiltro
        );

        if (dataRegistroNum === hojeNumFiltro) {
          registrosExcluidos++;
          console.log(
            "✗ EXCLUÍDO (FILTRO ONTEM): Registro de HOJE detectado!",
            dataStr,
            "(YYYYMMDD:",
            dataRegistroNum,
            ") | Apenas dados de ONTEM (",
            inicioNum,
            ") são permitidos"
          );
          return false; // Exclui explicitamente dados de hoje
        }
        // Para filtro "ontem", a data deve ser EXATAMENTE igual ao range
        if (dataRegistroNum !== inicioNum) {
          registrosExcluidos++;
          console.log(
            "✗ EXCLUÍDO (FILTRO ONTEM): Data diferente do range!",
            dataStr,
            "(YYYYMMDD:",
            dataRegistroNum,
            ") | Range esperado:",
            inicioNum
          );
          return false;
        }
        // Se chegou aqui, a data é exatamente igual ao range de ontem - INCLUIR
        registrosIncluidos++;
        var investDia = toNumber_(row["INVESTIMENTO_DIA"]);
        var leadsDia = toNumber_(row["LEADS_DIA"]);
        console.log(
          "✓ INCLUÍDO (FILTRO ONTEM):",
          dataStr,
          "(YYYYMMDD:",
          dataRegistroNum,
          ") | Campanha:",
          row["CAMPANHA"] || "(vazio)",
          "| Invest:",
          investDia,
          "| Leads:",
          leadsDia
        );
        return true;
      }

      // VALIDAÇÃO ADICIONAL: Se o range é de "ontem" (mesmo que isFiltroOntemFiltro não tenha sido detectado),
      // garante que dados de hoje não sejam incluídos
      var hojeNumVerificacao = getHojeNum_();
      var rangeNumVerificacao = dateToNumber_(dateRange.inicio);
      var isRangeOntem =
        rangeNumVerificacao < hojeNumVerificacao &&
        dateToNumber_(dateRange.fim) === rangeNumVerificacao;

      if (isRangeOntem && dataRegistroNum === hojeNumVerificacao) {
        registrosExcluidos++;
        console.log(
          "✗ EXCLUÍDO: Registro de HOJE detectado (validação adicional)!",
          dataStr,
          "(YYYYMMDD:",
          dataRegistroNum,
          ") | Range esperado (ontem):",
          rangeNumVerificacao
        );
        return false;
      }

      // Para outros filtros, usa a função isDateInRange_
      var dentro = isDateInRange_(row["DATA"], dateRange);

      if (dentro) {
        registrosIncluidos++;
        var investDia = toNumber_(row["INVESTIMENTO_DIA"]);
        var leadsDia = toNumber_(row["LEADS_DIA"]);
        console.log(
          "✓ INCLUÍDO:",
          dataStr,
          "(YYYYMMDD:",
          dataRegistroNum,
          ") | Campanha:",
          row["CAMPANHA"] || "(vazio)",
          "| Invest:",
          investDia,
          "| Leads:",
          leadsDia
        );
      } else {
        registrosExcluidos++;
        // Para filtros de dia único (hoje/ontem), loga todas as exclusões para debug
        var isFiltroDiaUnico = inicioNum === fimNum;
        if (isFiltroDiaUnico || registrosExcluidos <= 5) {
          console.log(
            "✗ EXCLUÍDO:",
            dataStr,
            "(YYYYMMDD:",
            dataRegistroNum,
            ") | Fora do range:",
            inicioNum,
            "até",
            fimNum
          );
        }
      }
      return dentro;
    });

    console.log("=== RESULTADO DA FILTRAGEM ===");
    console.log("Range esperado (YYYYMMDD):", inicioNum, "até", fimNum);
    console.log("Registros incluídos:", registrosIncluidos);
    console.log("Registros excluídos:", registrosExcluidos);
    console.log("Total de registros após filtro:", midiaFiltrada.length);

    // Lista as datas dos registros incluídos para validação
    if (midiaFiltrada.length > 0) {
      console.log("=== DATAS DOS REGISTROS INCLUÍDOS ===");
      midiaFiltrada.forEach(function (row, index) {
        var dataObj = toDate_(row["DATA"]);
        if (dataObj) {
          var ano = dataObj.getFullYear();
          var mes = dataObj.getMonth();
          var dia = dataObj.getDate();
          var dataNum = ano * 10000 + (mes + 1) * 100 + dia;
          var dataStr = dataObj.toLocaleDateString("pt-BR");
          console.log(
            "  [" +
              (index + 1) +
              "] " +
              dataStr +
              " (YYYYMMDD: " +
              dataNum +
              ")"
          );
        }
      });
    } else {
      console.log("⚠️ NENHUM registro foi incluído no filtro!");
    }
  } else {
    console.log(
      "Sem filtro de período - usando todos os registros de MIDIA_DIARIA"
    );
  }

  // --- OVERVIEW (cards grandes) ---
  let investimentoTotal = 0;
  let faturamentoTotal = 0;
  let leadsTotal = 0;
  let contratosTotal = 0;

  if (dateRange) {
    console.log("=== RECALCULANDO COM FILTRO DE PERÍODO ===");
    console.log("Registros de MIDIA_DIARIA filtrados:", midiaFiltrada.length);
    console.log(
      "Range de filtro:",
      dateRange.inicio.toISOString(),
      "até",
      dateRange.fim.toISOString()
    );

    // COM FILTRO DE PERÍODO: recalcula baseado em MIDIA_DIARIA filtrada
    // Investimento e Leads vêm da soma dos dias no período
    var registrosComDados = 0;
    var registrosVazios = 0;

    console.log("=== CALCULANDO TOTAIS DO PERÍODO ===");
    console.log(
      "Total de registros filtrados para processar:",
      midiaFiltrada.length
    );

    // Usa funções helper para simplificar
    var inicioNum = dateToNumber_(dateRange.inicio);
    var fimNum = dateToNumber_(dateRange.fim);
    var hojeNumCalculo = getHojeNum_();
    var isFiltroDiaUnicoCalculo = inicioNum === fimNum;
    var isFiltroOntemCalculo =
      isFiltroDiaUnicoCalculo && inicioNum < hojeNumCalculo;

    console.log(
      "Range esperado para cálculo (YYYYMMDD):",
      inicioNum,
      "até",
      fimNum
    );
    if (isFiltroOntemCalculo) {
      console.log(
        "⚠️ FILTRO ONTEM: Apenas dados com data",
        inicioNum,
        "serão somados"
      );
      console.log(
        "⚠️ Dados de HOJE (",
        hojeNumCalculo,
        ") serão EXCLUÍDOS do cálculo"
      );
    }

    midiaFiltrada.forEach(function (row) {
      var campanha = String(row["CAMPANHA"] || "").trim();
      var investDia = toNumber_(row["INVESTIMENTO_DIA"]);
      var leadsDia = toNumber_(row["LEADS_DIA"]);
      var data = toDate_(row["DATA"]);

      if (!data) {
        console.log("⚠️ Registro ignorado: data inválida");
        return; // Pula este registro
      }

      var dataStr = data.toLocaleDateString("pt-BR");
      var dataNum = dateToNumber_(data);

      // VALIDAÇÃO EXPLÍCITA PARA FILTRO "ONTEM":
      // Se é filtro "ontem", aceita APENAS datas que são exatamente iguais ao range
      // e rejeita explicitamente dados de hoje
      if (isFiltroOntemCalculo) {
        if (dataNum === hojeNumCalculo) {
          console.log(
            "⚠️ BLOQUEADO: Registro de HOJE detectado no filtro ONTEM!",
            dataStr,
            "(YYYYMMDD:",
            dataNum,
            ") | EXCLUÍDO do cálculo"
          );
          return; // Pula este registro - NÃO deve estar aqui!
        }
        // Para filtro "ontem", a data deve ser EXATAMENTE igual ao range
        if (dataNum !== inicioNum) {
          console.log(
            "⚠️ BLOQUEADO: Data diferente do range no filtro ONTEM!",
            dataStr,
            "(YYYYMMDD:",
            dataNum,
            ") | Range esperado:",
            inicioNum,
            "| EXCLUÍDO do cálculo"
          );
          return; // Pula este registro
        }
        // Se chegou aqui, a data é exatamente igual ao range de ontem - SOMAR
        console.log("✓ Somando registro (FILTRO ONTEM):", {
          data: dataStr,
          campanha: campanha || "(vazio)",
          investimento: investDia,
          leads: leadsDia,
        });
        investimentoTotal += investDia;
        leadsTotal += leadsDia;
        registrosComDados++;
        return; // Já processou, não precisa continuar
      }

      // VALIDAÇÃO ADICIONAL: Se o range é de "ontem" (mesmo que isFiltroOntemCalculo não tenha sido detectado),
      // garante que dados de hoje não sejam somados
      var hojeNumVerificacaoCalculo = getHojeNum_();
      var rangeNumVerificacaoCalculo = dateToNumber_(dateRange.inicio);
      var isRangeOntemCalculo =
        rangeNumVerificacaoCalculo < hojeNumVerificacaoCalculo &&
        dateToNumber_(dateRange.fim) === rangeNumVerificacaoCalculo;

      if (isRangeOntemCalculo && dataNum === hojeNumVerificacaoCalculo) {
        console.log(
          "⚠️ BLOQUEADO: Registro de HOJE detectado no cálculo (validação adicional)!",
          dataStr,
          "(YYYYMMDD:",
          dataNum,
          ") | Range esperado (ontem):",
          rangeNumVerificacaoCalculo,
          "| EXCLUÍDO do cálculo"
        );
        return; // Pula este registro - NÃO deve estar aqui!
      }

      // Para outros filtros, valida se está no range
      var dataNoRange = dataNum >= inicioNum && dataNum <= fimNum;

      if (!dataNoRange) {
        console.log(
          "⚠️ ERRO: Registro com data FORA do range foi incluído na filtragem!",
          dataStr,
          "(YYYYMMDD:",
          dataNum,
          ") | Range esperado:",
          inicioNum,
          "até",
          fimNum,
          "| IGNORANDO este registro no cálculo"
        );
        return; // Pula este registro - NÃO deve estar aqui!
      }

      // Log detalhado para debug
      console.log("✓ Somando registro:", {
        data: dataStr,
        campanha: campanha || "(vazio)",
        investimento: investDia,
        leads: leadsDia,
      });

      // Só conta se tiver dados válidos (campanha ou valores numéricos)
      if (campanha || investDia > 0 || leadsDia > 0) {
        investimentoTotal += investDia;
        leadsTotal += leadsDia;
        registrosComDados++;
        console.log(
          "  → Acumulado: Investimento =",
          investimentoTotal,
          "| Leads =",
          leadsTotal
        );
      } else {
        registrosVazios++;
        console.log("  → Registro vazio ignorado (sem campanha nem valores)");
      }
    });

    console.log("=== RESULTADO DO CÁLCULO ===");
    console.log("Registros com dados válidos somados:", registrosComDados);
    console.log("Registros vazios ignorados:", registrosVazios);
    console.log("Investimento total do período:", investimentoTotal);
    console.log("Leads total do período:", leadsTotal);

    // Para faturamento e contratos: identifica campanhas que aparecem no período
    // e soma os valores de KPI_CAMPANHAS dessas campanhas
    // (Nota: KPI_CAMPANHAS pode ter totais, não do período específico)
    var campanhasNoPeriodo = {};
    midiaFiltrada.forEach(function (row) {
      var campanha = String(row["CAMPANHA"] || "").trim();
      if (campanha) {
        campanhasNoPeriodo[campanha] = true;
      }
    });

    console.log("Campanhas no período:", Object.keys(campanhasNoPeriodo));

    // Soma faturamento e contratos das campanhas que aparecem no período
    campanhas.forEach(function (row) {
      var campanha = String(row["CAMPANHA"] || "").trim();
      // Se não há campanhas no período OU se esta campanha está no período
      if (
        Object.keys(campanhasNoPeriodo).length === 0 ||
        campanhasNoPeriodo[campanha]
      ) {
        faturamentoTotal += toNumber_(row["FATURAMENTO"]);
        contratosTotal += toNumber_(row["CONTRATOS"]);
      }
    });

    console.log("Faturamento calculado:", faturamentoTotal);
    console.log("Contratos calculados:", contratosTotal);
  } else {
    console.log("=== USANDO TODOS OS DADOS (SEM FILTRO) ===");
    // SEM FILTRO: usa KPI_CAMPANHAS como antes (todos os dados)
    campanhas.forEach(function (row) {
      investimentoTotal += toNumber_(row["INVESTIMENTO_TOTAL"]);
      faturamentoTotal += toNumber_(row["FATURAMENTO"]);
      leadsTotal += toNumber_(row["LEADS_TOTAL"]);
      contratosTotal += toNumber_(row["CONTRATOS"]);
    });
    console.log("Totais (sem filtro):", {
      investimento: investimentoTotal,
      faturamento: faturamentoTotal,
      leads: leadsTotal,
      contratos: contratosTotal,
    });
  }

  // Leads do dia (sempre calcula baseado em HOJE, independente do filtro)
  // Não usa midiaFiltrada porque ela pode estar filtrada por outro período
  let leadsHoje = 0;
  if (midia.length > 0) {
    const agora = new Date();
    const hoje = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      0,
      0,
      0
    );

    midia.forEach(function (row) {
      let data = toDate_(row["DATA"]);
      if (data && isSameDay_(data, hoje)) {
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

  console.log("=== OVERVIEW FINAL ===");
  console.log(JSON.stringify(overview));

  // Retorna os dados filtrados
  const result = {
    overview: overview,
    midia: midiaFiltrada, // Retorna apenas os dados do período
    leads: [],
    vendas: [],
    campanhas: campanhas, // Mantém todas as campanhas (pode filtrar depois se necessário)
    vendedores: vendedores,
  };

  return result;
}

// ================================
//  ENDPOINT WEB (usado pelo React)
// ================================

function doGet(e) {
  try {
    // Log dos parâmetros brutos recebidos
    console.log("=== INÍCIO doGet ===");

    // IMPORTANTE: Se e for null/undefined, pode ser execução direta no editor
    // Nesse caso, não há parâmetros disponíveis
    if (!e) {
      console.error("⚠️ ERRO CRÍTICO: Objeto 'e' não existe!");
      console.error("Isso geralmente acontece quando:");
      console.error(
        "1. A função é executada diretamente no editor (não via Web App)"
      );
      console.error("2. O Web App não está configurado corretamente");
      console.error("3. A URL do Web App não está sendo usada corretamente");
      console.error("");
      console.error(
        "SOLUÇÃO: Acesse o Web App via URL, não execute diretamente no editor!"
      );
    }

    var params = {};

    // Tenta ler parâmetros de e (se existir)
    if (e) {
      console.log("e.parameter:", e.parameter);
      console.log("e.queryString:", e.queryString);
      console.log("e.parameters:", e.parameters);

      // Método 1: e.parameter (padrão para Web Apps)
      if (e.parameter && typeof e.parameter === "object") {
        params = e.parameter;
        console.log("✓ Usando e.parameter");
      }
      // Método 2: e.parameters (alternativa)
      else if (e.parameters && typeof e.parameters === "object") {
        params = e.parameters;
        console.log("✓ Usando e.parameters");
      }
      // Método 3: e.queryString (parse manual)
      else if (e.queryString) {
        console.log("✓ Parse manual de e.queryString");
        var queryString = e.queryString;
        if (queryString) {
          var pairs = queryString.split("&");
          for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split("=");
            if (pair.length === 2) {
              params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
          }
        }
      }
    }

    console.log("Parâmetros extraídos:", JSON.stringify(params));
    console.log("Quantidade de parâmetros:", Object.keys(params).length);

    if (Object.keys(params).length === 0) {
      console.warn("⚠️ ATENÇÃO: Nenhum parâmetro foi encontrado!");
      console.warn("O Web App retornará dados sem filtro (todos os registros)");
    }

    const filters = {
      periodo: params.periodo,
      inicio: params.inicio,
      fim: params.fim,
      campanha: params.campanha,
      vendedor: params.vendedor,
      plataforma: params.plataforma,
    };

    // Log para debug (remover em produção se necessário)
    console.log("Filtros processados:", JSON.stringify(filters));

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

// ================================
//  FUNÇÃO DE TESTE (para executar no editor)
// ================================

/**
 * Função de teste para validar o filtro "ontem".
 * Execute esta função diretamente no editor do Apps Script.
 * Ela simula uma chamada com filtro "ontem" e mostra os resultados.
 */
function testarFiltroOntem() {
  console.log("=== TESTE DO FILTRO 'ONTEM' ===");
  console.log("Data/Hora atual:", new Date().toLocaleString("pt-BR"));

  // Simula filtros como se viessem do frontend
  var filters = {
    periodo: "ontem",
  };

  console.log("Filtros aplicados:", JSON.stringify(filters));
  console.log("");

  try {
    // Chama a função principal
    var resultado = getDashboardData_(filters);

    console.log("");
    console.log("=== RESULTADO DO TESTE ===");
    console.log("Investimento Total:", resultado.overview.investimentoTotal);
    console.log("Leads Total:", resultado.overview.leadsTotal);
    console.log("Registros incluídos:", resultado.midia.length);

    // Lista as datas dos registros incluídos
    if (resultado.midia.length > 0) {
      console.log("");
      console.log("=== DATAS DOS REGISTROS INCLUÍDOS ===");
      resultado.midia.forEach(function (row, index) {
        var dataObj = toDate_(row["DATA"]);
        if (dataObj) {
          var dataNum = dateToNumber_(dataObj);
          var hojeNum = getHojeNum_();
          var dataStr = dataObj.toLocaleDateString("pt-BR");
          console.log(
            "[" +
              (index + 1) +
              "] " +
              dataStr +
              " (YYYYMMDD: " +
              dataNum +
              ")" +
              (dataNum === hojeNum ? " ⚠️ ATENÇÃO: Esta é a data de HOJE!" : "")
          );
        }
      });
    } else {
      console.log("⚠️ NENHUM registro foi incluído!");
    }

    // Verifica se há dados de hoje na planilha
    console.log("");
    console.log("=== VERIFICAÇÃO DE DADOS DE HOJE ===");
    var hojeNum = getHojeNum_();
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var hojeStr = hoje.toLocaleDateString("pt-BR");
    console.log("Data de HOJE:", hojeStr, "(YYYYMMDD:", hojeNum + ")");

    try {
      var midia = sheetToObjects_(getSheet_(SHEET_MIDIA));
      var dadosHoje = midia.filter(function (row) {
        var dataObj = toDate_(row["DATA"]);
        if (dataObj) {
          var dataNum = dateToNumber_(dataObj);
          return dataNum === hojeNum;
        }
        return false;
      });

      if (dadosHoje.length > 0) {
        console.log(
          "⚠️ ATENÇÃO: Existem",
          dadosHoje.length,
          "registro(s) de HOJE na planilha:"
        );
        dadosHoje.forEach(function (row, index) {
          var invest = toNumber_(row["INVESTIMENTO_DIA"]);
          var leads = toNumber_(row["LEADS_DIA"]);
          console.log(
            "  [" + (index + 1) + "] Investimento:",
            invest,
            "| Leads:",
            leads,
            "| Campanha:",
            row["CAMPANHA"] || "(vazio)"
          );
        });
        console.log("✅ Estes dados NÃO devem aparecer no filtro 'ontem'");
      } else {
        console.log("✓ Nenhum registro de hoje encontrado na planilha");
      }
    } catch (e) {
      console.log("Erro ao verificar dados de hoje:", e);
    }

    return resultado;
  } catch (err) {
    console.error("ERRO no teste:", err);
    throw err;
  }
}
