import fallbackSnapshot from "../data/researchCenterDbSnapshot.json";
import { feedbackThemes, researchRows as staticResearchRows, sentimentByStage as staticSentimentByStage } from "../data/researchCenter";
import { buildRenewalMetrics, renewalMappingNotes } from "./renewalMapper";
import {
  dateValue,
  formatDate,
  isActive,
  isCancelled,
  normalizeClientName,
  normalizeEngineer,
  normalizeProduct,
  normalizeSentimentFromScore,
  normalizeStage,
  normalizeTheme,
  numberValue,
  value,
} from "./customerMapper";
import type { AnyRecord, EngineerMetrics, FeedbackRow, NamedValue, ResearchCenterSnapshot, ResearchLogRow, SentimentByStage } from "../types/researchCenter";
import type { ResearchCenterFilters } from "../types/researchCenter";

type LegacySnapshot = typeof fallbackSnapshot;

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function npsScore(promoters: number, detractors: number, total: number) {
  return total ? Math.round(((promoters - detractors) / total) * 100) : 0;
}

function countBy<T>(rows: T[], getKey: (row: T) => string): NamedValue[] {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row) || "Nao identificado";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].map(([name, count]) => ({ name, value: count })).sort((a, b) => b.value - a.value);
}

function feedbackByStage(rows: FeedbackRow[]): SentimentByStage[] {
  const map = new Map<string, SentimentByStage>();
  rows.forEach((row) => {
    const stage = row.stage || "Nao identificado";
    const current = map.get(stage) || { stage, positive: 0, neutral: 0, negative: 0 };
    if (row.sentiment === "Positivo") current.positive += 1;
    if (row.sentiment === "Neutro") current.neutral += 1;
    if (row.sentiment === "Negativo") current.negative += 1;
    map.set(stage, current);
  });
  return [...map.values()].sort((a, b) => (b.positive + b.neutral + b.negative) - (a.positive + a.neutral + a.negative)).slice(0, 10);
}

function researchRowsFromFeedback(rows: FeedbackRow[]): ResearchLogRow[] {
  return rows.slice(0, 80).map((row) => ({
    date: row.date,
    source: "NPS",
    client: row.client,
    engineer: row.engineer,
    stage: row.stage,
    theme: row.theme,
    sentiment: row.sentiment,
    learning: row.text,
    action: row.action,
  }));
}

function topWithOthers(rows: NamedValue[], limit: number) {
  if (rows.length <= limit) return rows;
  const top = rows.slice(0, limit);
  const others = rows.slice(limit).reduce((sum, row) => sum + row.value, 0);
  return others > 0 ? [...top, { name: "Outros", value: others }] : top;
}

function stripAllPrefix(value: string) {
  return value
    .replace(/^Todos os /, "")
    .replace(/^Todas as /, "")
    .replace(/^Todas /, "")
    .replace(/^Todos /, "");
}

function matchesOption(selected: string | undefined, actual: string) {
  if (!selected || selected.startsWith("Todos") || selected.startsWith("Todas")) return true;
  return stripAllPrefix(selected).toLowerCase() === actual.toLowerCase();
}

function periodStart(filters?: ResearchCenterFilters) {
  if (!filters) return null;
  if (filters.startDate) return new Date(`${filters.startDate}T00:00:00`);
  if (filters.period === "Ultimos 30 dias") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (filters.period === "Ultimos 90 dias") return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  if (filters.period === "Ano atual") return new Date(new Date().getFullYear(), 0, 1);
  return null;
}

function periodEnd(filters?: ResearchCenterFilters) {
  return filters?.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;
}

function inPeriod(row: AnyRecord, fields: string[], filters?: ResearchCenterFilters) {
  const start = periodStart(filters);
  const end = periodEnd(filters);
  if (!start && !end) return true;
  const date = dateValue(row, fields);
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function filterClients(rows: AnyRecord[], filters?: ResearchCenterFilters) {
  return rows.filter((row) =>
    matchesOption(filters?.product, normalizeProduct(row)) &&
    matchesOption(filters?.stage, normalizeStage(row)) &&
    matchesOption(filters?.engineer, normalizeEngineer(row)) &&
    matchesOption(filters?.origin, value(row, ["origem", "origem_cliente", "fonte", "funil", "pipeline"], "Nao identificado")) &&
    matchesOption(filters?.status, value(row, ["status", "status_cliente", "situacao"], "Sem status")) &&
    matchesOption(filters?.cycle, value(row, ["ciclo", "cycle", "current_cycle", "ciclo_atual"], "Sem ciclo identificado")) &&
    inPeriod(row, ["created_at", "data_inicio_ciclo", "data_entrada"], filters)
  );
}

function filterNps(rows: AnyRecord[], clients: AnyRecord[], filters?: ResearchCenterFilters) {
  return rows.filter((row) => {
    const client = clients.find((item) => String(item.id) === String(row.client_id)) || {};
    return matchesOption(filters?.theme, normalizeTheme(row)) &&
      matchesOption(filters?.engineer, normalizeEngineer(client)) &&
      matchesOption(filters?.product, normalizeProduct(client)) &&
      matchesOption(filters?.stage, normalizeStage(client)) &&
      matchesOption(filters?.origin, value(client, ["origem", "origem_cliente", "fonte", "funil", "pipeline"], "Nao identificado")) &&
      matchesOption(filters?.status, value(client, ["status", "status_cliente", "situacao"], "Sem status")) &&
      matchesOption(filters?.cycle, value(client, ["ciclo", "cycle", "current_cycle", "ciclo_atual"], "Sem ciclo identificado")) &&
      inPeriod(row, ["submitted_at", "created_at", "date"], filters);
  });
}

function filterCancellations(rows: AnyRecord[], clients: AnyRecord[], filters?: ResearchCenterFilters) {
  return rows.filter((row) => {
    const client = clients.find((item) => String(item.id) === String(row.client_id)) || {};
    return matchesOption(filters?.engineer, normalizeEngineer(row)) &&
      matchesOption(filters?.product, normalizeProduct(row) || normalizeProduct(client)) &&
      matchesOption(filters?.status, value(row, ["status", "status_name"], "Sem status")) &&
      matchesOption(filters?.origin, value(client, ["origem", "origem_cliente", "fonte", "funil", "pipeline"], "Nao identificado")) &&
      matchesOption(filters?.cycle, value(client, ["ciclo", "cycle", "current_cycle", "ciclo_atual"], "Sem ciclo identificado")) &&
      inPeriod(row, ["archived_at", "created_at", "data_pedido"], filters);
  });
}

export function mapEmptySnapshot(reason: string): ResearchCenterSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    source: "Supabase - Backup BASE QV",
    connectionStatus: "error",
    warnings: [reason],
    mappingNotes: [
      "O dashboard nao usa JSON local como base principal.",
      "Se a Data API retornar schema cache, confirme PUBLIC_SUPABASE_RESEARCH_URL/ANON_KEY, schemas expostos e recarregue o schema cache do PostgREST no Supabase.",
    ],
    overviewKpis: [
      { label: "NPS Score", value: "-", detail: "Sem dados disponiveis" },
      { label: "CSAT Medio", value: "-", detail: "Sem dados disponiveis" },
      { label: "Volume de Feedback", value: "0", detail: "Sem dados disponiveis" },
      { label: "Taxa de Churn", value: "-", detail: "Sem dados disponiveis" },
    ],
    activeClients: 0,
    totalClients: 0,
    cancelledClients: 0,
    renewedClients: 0,
    atRiskClients: 0,
    nps: { score: 0, totalResponses: 0, distribution: [], byEngineer: [], evolution: [] },
    csat: { average: null, totalResponses: 0, byEngineer: [], byStage: [], evolution: [], ratingDistribution: [] },
    churn: { cancellations30d: 0, cancellationsTotal: 0, rate: 0, retention: 0, byEngineer: [], reasons: [], statuses: [], evolution: [], detailRows: [] },
    feedback: { total: 0, sentiment: [], byEngineer: [], byTheme: [], byStage: [], rows: [] },
    researchRows: [],
    renewal: buildRenewalMetrics([], []),
    filterOptions: buildFilterOptions([], [], []),
  };
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EP";
}

function toEngineerMetrics(name: string, clients: number, responses: AnyRecord[], cancellations: number, csatRows: AnyRecord[]): EngineerMetrics {
  const promoters = responses.filter((row) => numberValue(row, ["score"]) >= 9).length;
  const neutrals = responses.filter((row) => numberValue(row, ["score"]) >= 7 && numberValue(row, ["score"]) <= 8).length;
  const detractors = responses.filter((row) => numberValue(row, ["score"]) <= 6).length;
  const csatScores = csatRows.map((row) => numberValue(row, ["score", "nota", "rating"])).filter(Boolean);
  const csat = csatScores.length ? csatScores.reduce((sum, score) => sum + score, 0) / csatScores.length : 0;
  const churn = pct(cancellations, Math.max(1, clients));
  return {
    name,
    initials: initials(name),
    badge: "Base Backup QV",
    clients,
    renewedClients: 0,
    atRiskClients: detractors,
    responses: responses.length,
    nps: npsScore(promoters, detractors, responses.length),
    npsGoal: 70,
    promoters,
    neutrals,
    detractors,
    csat,
    csatGoal: 4.5,
    feedbacks: responses.filter((row) => value(row, ["comment", "comentario", "feedback"])).length || responses.length,
    churn,
    retention: Math.max(0, 100 - churn),
    cancellations,
  };
}

function legacyEngineerCards(snapshot: LegacySnapshot): EngineerMetrics[] {
  return snapshot.nps.byEngineer.map((engineer) => {
    const churn = snapshot.churn.byEngineer.find((row) => row.name === engineer.name);
    return {
      name: engineer.name,
      initials: initials(engineer.name),
      badge: "Base Backup QV",
      clients: engineer.clients || churn?.clients || 0,
      renewedClients: 0,
      atRiskClients: engineer.detractors,
      responses: engineer.responses,
      nps: engineer.nps,
      npsGoal: 70,
      promoters: engineer.promoters,
      neutrals: engineer.neutrals,
      detractors: engineer.detractors,
      csat: snapshot.csat.average ?? 0,
      csatGoal: 4.5,
      feedbacks: engineer.responses,
      churn: churn?.value ?? 0,
      retention: Math.max(0, 100 - (churn?.value ?? 0)),
      cancellations: churn?.cancellations ?? 0,
    };
  });
}

export function mapLegacyResearchCenterSnapshot(snapshot: LegacySnapshot, reason: string): ResearchCenterSnapshot {
  const engineers = legacyEngineerCards(snapshot);
  const renewal = buildRenewalMetrics([], []);
  return {
    ...snapshot,
    connectionStatus: reason === "missing-env" ? "missing-env" : "fallback",
    warnings: [reason === "missing-env" ? "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para leitura dinamica." : reason, ...renewal.warnings],
    mappingNotes: [
      "Snapshot gerado previamente por scripts/sync-research-center-data.py.",
      "Tabelas usadas no snapshot: public.clients, public.nps_responses, public.csat_responses, public.cancellations, public.cancellation_statuses.",
      ...renewalMappingNotes,
    ],
    cancelledClients: snapshot.churn.cancellationsTotal,
    renewedClients: 0,
    atRiskClients: snapshot.nps.distribution.find((item) => item.name === "Detratores")?.value ?? 0,
    nps: { ...snapshot.nps, byEngineer: engineers },
    csat: { ...snapshot.csat, byEngineer: [], byStage: [], evolution: [], ratingDistribution: [] },
    churn: { ...snapshot.churn, evolution: [], detailRows: [] },
    feedback: {
      ...snapshot.feedback,
      byEngineer: snapshot.nps.byEngineer.map((row) => ({ name: row.name, value: row.responses })),
      byTheme: feedbackThemes,
      byStage: staticSentimentByStage,
    },
    researchRows: staticResearchRows,
    renewal,
    filterOptions: buildFilterOptions([], engineers, snapshot.feedback.rows),
  };
}

export function mapFallbackSnapshot(reason: string): ResearchCenterSnapshot {
  return mapLegacyResearchCenterSnapshot(fallbackSnapshot as LegacySnapshot, reason);
}

export function mapResearchCenterData(input: {
  clients: AnyRecord[];
  nps: AnyRecord[];
  csat: AnyRecord[];
  cancellations: AnyRecord[];
  cancellationStatuses: AnyRecord[];
  sourceWarnings: string[];
  sourceTables?: Record<string, string>;
  filters?: ResearchCenterFilters;
}): ResearchCenterSnapshot {
  const allClients = input.clients;
  const clients = filterClients(input.clients, input.filters);
  const npsRows = filterNps(input.nps, allClients, input.filters);
  const csatRows = input.csat.filter((row) => inPeriod(row, ["submitted_at", "created_at", "meeting_date"], input.filters));
  const cancellationRows = filterCancellations(input.cancellations, allClients, input.filters);
  const activeClients = clients.filter(isActive).length;
  const totalClients = clients.length;
  const cancelledClients = clients.filter(isCancelled).length || cancellationRows.length;
  const promoters = npsRows.filter((row) => numberValue(row, ["score"]) >= 9).length;
  const neutrals = npsRows.filter((row) => numberValue(row, ["score"]) >= 7 && numberValue(row, ["score"]) <= 8).length;
  const detractors = npsRows.filter((row) => numberValue(row, ["score"]) <= 6).length;
  const teamNps = npsScore(promoters, detractors, npsRows.length);
  const csatScores = csatRows.map((row) => numberValue(row, ["score", "nota", "rating"])).filter(Boolean);
  const csatAverage = csatScores.length ? csatScores.reduce((sum, score) => sum + score, 0) / csatScores.length : null;
  const renewal = buildRenewalMetrics(clients, cancellationRows);

  const clientsByEngineer = countBy(clients.filter(isActive), normalizeEngineer);
  const engineers = clientsByEngineer.map(({ name, value: clients }) => {
    const engineerNpsRows = npsRows.filter((row) => normalizeEngineer(row) === name || normalizeEngineer(allClients.find((client) => String(client.id) === String(row.client_id)) || {}) === name);
    const engineerCsatRows = csatRows.filter((row) => normalizeEngineer(row) === name);
    const cancellations = cancellationRows.filter((row) => normalizeEngineer(row) === name).length;
    const metric = toEngineerMetrics(name, clients, engineerNpsRows, cancellations, engineerCsatRows);
    metric.renewedClients = renewal.rows.filter((row) => row.engineer === name && row.renewed).length;
    return metric;
  }).sort((a, b) => b.clients - a.clients).slice(0, 24);

  const feedbackRows: FeedbackRow[] = npsRows
    .filter((row) => value(row, ["comment", "comentario", "feedback", "texto"]))
    .slice(0, 80)
    .map((row) => {
      const client = allClients.find((item) => String(item.id) === String(row.client_id)) || {};
      const score = numberValue(row, ["score"]);
      return {
        date: formatDate(dateValue(row, ["submitted_at", "created_at", "date"])),
        engineer: normalizeEngineer(client),
        client: "Cliente anonimizado",
        theme: normalizeTheme(row),
        sentiment: normalizeSentimentFromScore(score),
        stage: normalizeStage(client),
        text: value(row, ["comment", "comentario", "feedback", "texto"], "Sem comentario textual."),
        action: "Classificar e encaminhar para plano de acao.",
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    source: "Supabase - Backup BASE QV",
    connectionStatus: "connected",
    warnings: [...input.sourceWarnings, ...renewal.warnings],
    mappingNotes: [
      "Tabelas consultadas via Data API: clients, nps_responses, csat_responses, cancellations, cancellation_statuses.",
      input.sourceTables ? `Mapeamento ativo: ${Object.entries(input.sourceTables).map(([key, table]) => `${key}=${table}`).join(", ")}.` : "",
      "Campos de cliente: status/data_churn para ativo/cancelado; engenheiro_patrimonial para responsavel; origem/funil/pipeline para origem.",
      "Campos de NPS/CSAT: score, comment, submitted_at/created_at.",
      "Campos de cancelamento: motivo, status_id, responsavel_name, created_at/archived_at.",
      ...renewalMappingNotes,
    ].filter(Boolean),
    overviewKpis: [
      { label: "NPS Score", value: npsRows.length ? String(teamNps) : "-", detail: `${npsRows.length} respostas`, trend: null, tone: "neutral" },
      { label: "CSAT Medio", value: csatAverage ? csatAverage.toFixed(1) : "-", detail: `${csatRows.length} avaliacoes`, tone: "neutral" },
      { label: "Volume de Feedback", value: String(feedbackRows.length || npsRows.length), detail: "comentarios e respostas NPS", trend: null, tone: "neutral" },
      { label: "Taxa de Churn", value: cancellationRows.length ? `${pct(cancellationRows.length, Math.max(1, activeClients)).toFixed(1)}%` : "-", detail: `${cancellationRows.length} cancelamentos`, tone: "neutral" },
      { label: "Clientes Ativos", value: String(activeClients), detail: "status ativo ou sem churn" },
      { label: "Clientes Cancelados", value: String(cancelledClients), detail: "status/data de churn" },
      { label: "Clientes em Risco", value: String(detractors), detail: "detratores NPS", tone: "negative" },
      { label: "Clientes Renovados", value: String(renewal.rows.filter((row) => row.renewed).length), detail: "regra flexivel de renovacao" },
    ],
    activeClients,
    totalClients,
    cancelledClients,
    renewedClients: renewal.rows.filter((row) => row.renewed).length,
    atRiskClients: detractors,
    nps: {
      score: teamNps,
      totalResponses: npsRows.length,
      distribution: [
        { name: "Promotores", value: promoters },
        { name: "Neutros", value: neutrals },
        { name: "Detratores", value: detractors },
      ],
      byEngineer: engineers,
      evolution: countBy(npsRows, (row) => (dateValue(row, ["submitted_at", "created_at"]) || new Date()).toLocaleDateString("pt-BR", { month: "short" })),
    },
    csat: {
      average: csatAverage,
      totalResponses: csatRows.length,
      byEngineer: topWithOthers(countBy(csatRows, normalizeEngineer), 10),
      byStage: topWithOthers(countBy(csatRows, normalizeStage), 10),
      evolution: countBy(csatRows, (row) => (dateValue(row, ["submitted_at", "created_at"]) || new Date()).toLocaleDateString("pt-BR", { month: "short" })),
      ratingDistribution: countBy(csatRows, (row) => `${numberValue(row, ["score", "nota", "rating"])} estrelas`),
    },
    churn: {
      cancellations30d: cancellationRows.length,
      cancellationsTotal: cancellationRows.length,
      rate: pct(cancellationRows.length, Math.max(1, activeClients)),
      retention: Math.max(0, 100 - pct(cancellationRows.length, Math.max(1, activeClients))),
      byEngineer: engineers.map((row) => ({ name: row.name, value: row.churn })).sort((a, b) => b.value - a.value),
      reasons: topWithOthers(countBy(cancellationRows, (row) => value(row, ["motivo", "motivo_cancelamento", "reason"], "Sem motivo informado")), 10),
      statuses: topWithOthers(countBy(cancellationRows, (row) => value(row, ["status", "status_name"], "Sem status")), 5),
      evolution: countBy(cancellationRows, (row) => (dateValue(row, ["archived_at", "created_at"]) || new Date()).toLocaleDateString("pt-BR", { month: "short" })),
      detailRows: renewal.rows.filter((row) => row.cancelled),
    },
    feedback: {
      total: feedbackRows.length || npsRows.length,
      sentiment: [
        { name: "Positivo", value: promoters },
        { name: "Neutro", value: neutrals },
        { name: "Negativo", value: detractors },
      ],
      byEngineer: topWithOthers(countBy(feedbackRows, (row) => row.engineer), 10),
      byTheme: topWithOthers(countBy(feedbackRows, (row) => row.theme), 10),
      byStage: feedbackByStage(feedbackRows),
      rows: feedbackRows,
    },
    researchRows: researchRowsFromFeedback(feedbackRows),
    renewal,
    filterOptions: buildFilterOptions(allClients, engineers, feedbackRows),
  };
}

function buildFilterOptions(clients: AnyRecord[], engineers: EngineerMetrics[], feedbackRows: FeedbackRow[]) {
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
  return {
    periods: ["Ultimos 30 dias", "Ultimos 90 dias", "Ano atual", "Todo periodo"],
    products: ["Todos os Produtos", ...unique(clients.map(normalizeProduct))],
    stages: ["Todas as Etapas", ...unique(clients.map(normalizeStage))],
    themes: ["Todos os Temas", ...unique(feedbackRows.map((row) => row.theme))],
    engineers: ["Todos os Engenheiros", ...unique(engineers.map((row) => row.name))],
    origins: ["Todas as Origens", ...unique(clients.map((row) => value(row, ["origem", "origem_cliente", "fonte", "funil", "pipeline"], "Nao identificado")))],
    statuses: ["Todos os Status", ...unique(clients.map((row) => value(row, ["status", "status_cliente", "situacao"], "Sem status")))],
    cycles: ["Todos os Ciclos", "Ciclo 1", "Ciclo 2", "Ciclo 3", "Ciclo 4", "Ciclo 5+", "Sem ciclo identificado"],
  };
}
