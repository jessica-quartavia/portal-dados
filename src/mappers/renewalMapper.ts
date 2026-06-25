import type { AnyRecord, NamedValue, RenewalMetrics, RenewalRow } from "../types/researchCenter";

export const DEFAULT_CYCLE_MONTHS = 12;

const cycleFields = ["ciclo", "ciclo_atual", "ciclo_cliente", "numero_ciclo", "renovacao_ciclo", "current_cycle", "customer_cycle", "ciclo_base", "ciclo_cadu"];
const originFields = ["origem", "origem_cliente", "fonte", "funil", "pipeline", "tag_desafio", "utm_source", "produto_origem", "jornada_origem"];
const statusFields = ["status", "status_cliente", "situacao", "ativo", "is_active", "client_status", "customer_status"];

function text(value: unknown, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function pick(row: AnyRecord, fields: string[]) {
  const key = fields.find((field) => row[field] !== undefined && row[field] !== null && row[field] !== "");
  return key ? row[key] : undefined;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: unknown) {
  const date = asDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "Nao identificado";
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function normalizeOrigin(value: unknown) {
  const raw = text(value, "Nao identificado").toLowerCase();
  if (raw.includes("desafio")) return "Desafio";
  if (raw.includes("perpetuo") || raw.includes("perpétuo")) return "Funil Perpetuo";
  if (!raw || raw === "nao identificado" || raw === "não identificado") return "Nao identificado";
  return "Outros";
}

export function normalizeStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "Ativo" : "Inativo";
  const raw = text(value, "Sem status").toLowerCase();
  if (raw.includes("cancel") || raw.includes("churn") || raw.includes("reembolso")) return "Cancelado";
  if (raw.includes("risco") || raw.includes("retenc")) return "Em risco";
  if (raw.includes("ativo") || raw.includes("active") || raw.includes("andamento")) return "Ativo";
  if (raw.includes("encerr") || raw.includes("inativo") || raw.includes("nao renov")) return "Nao renovado";
  return text(value, "Sem status");
}

export function normalizeCycle(value: unknown) {
  const raw = text(value, "");
  const match = raw.match(/\d+/);
  if (!match) return 0;
  return Number(match[0]);
}

export function cycleLabel(cycle: number) {
  if (!cycle) return "Sem ciclo identificado";
  if (cycle >= 5) return "Ciclo 5+";
  return `Ciclo ${cycle}`;
}

export function isRenewed(row: AnyRecord) {
  const cycle = normalizeCycle(pick(row, cycleFields));
  const renewalEvidence = pick(row, ["renovou", "renewed", "data_renovacao", "renewal_date", "status_renovacao", "contrato_renovado", "pagamento_renovacao"]);
  return cycle > 1 || Boolean(renewalEvidence);
}

export function mapRenewalRows(clients: AnyRecord[], cancellations: AnyRecord[] = []): RenewalRow[] {
  const cancellationsByClient = new Map(cancellations.map((row) => [text(row.client_id || row.cliente_id || row.customer_id || row.id_cliente), row]));

  return clients.map((client) => {
    const clientId = text(client.id || client.client_id || client.customer_id, "sem-id");
    const cancellation = cancellationsByClient.get(clientId);
    const cycle = normalizeCycle(pick(client, cycleFields));
    const entry = asDate(pick(client, ["data_entrada", "entry_date", "created_at", "data_inicio"]));
    const cycleStart = asDate(pick(client, ["data_inicio_ciclo", "current_cycle_start", "cycle_started_at"])) || entry;
    const cycleEnd = asDate(pick(client, ["data_fim_ciclo", "current_cycle_end", "cycle_ends_at"])) || (cycleStart ? addMonths(cycleStart, DEFAULT_CYCLE_MONTHS) : null);
    const cancellationDate = asDate(pick(client, ["data_churn", "data_cancelamento", "cancelled_at"]) || cancellation?.created_at || cancellation?.archived_at);
    const status = normalizeStatus(pick(client, statusFields));
    const renewed = isRenewed(client);
    const cancelled = status === "Cancelado" || Boolean(cancellationDate);
    const active = renewed && status === "Ativo" && !cancelled;
    const cancelledBeforeCycleEnd = Boolean(cancelled && cancellationDate && cycleEnd && cancellationDate < cycleEnd);
    const cancelledBeforeFirstCycle = Boolean(cancelledBeforeCycleEnd && cycle <= 1);
    const reachedEndNoRenewal = Boolean(!renewed && cycleEnd && cycleEnd < new Date() && ["Nao renovado", "Inativo", "Cancelado"].includes(status));

    return {
      client: text(client.nome || client.name || client.cliente || client.razao_social, "Cliente anonimizado"),
      clientId,
      engineer: text(client.engenheiro_patrimonial || client.responsavel_name || client.engineer, "Sem engenheiro"),
      origin: normalizeOrigin(pick(client, originFields)),
      product: text(client.produto || client.product || client.plano, "Nao identificado"),
      entryDate: formatDate(entry),
      currentCycleStart: formatDate(cycleStart),
      currentCycleEnd: formatDate(cycleEnd),
      currentCycle: cycleLabel(cycle),
      renewed,
      renewalDate: formatDate(pick(client, ["data_renovacao", "renewal_date", "renewed_at"])),
      currentStatus: status,
      active,
      cancelled,
      cancellationDate: formatDate(cancellationDate),
      cancelledBeforeCycleEnd,
      cancelledBeforeFirstCycle,
      reachedCycleEndAndDidNotRenew: reachedEndNoRenewal,
      cancellationReason: text(pick(client, ["motivo_cancelamento", "motivo", "cancellation_reason"]) || cancellation?.motivo, "Nao informado"),
      notes: cycle ? "Regra calculada por campo de ciclo/status." : "Pendente validar campo de ciclo no Backup BASE QV.",
    };
  });
}

function countBy<T>(rows: T[], getKey: (row: T) => string) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(getKey(row), (map.get(getKey(row)) || 0) + 1));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

export function buildRenewalMetrics(clients: AnyRecord[], cancellations: AnyRecord[] = []): RenewalMetrics {
  const rows = mapRenewalRows(clients, cancellations);
  const renewed = rows.filter((row) => row.renewed);
  const renewedActive = renewed.filter((row) => row.active);
  const renewedCancelled = renewed.filter((row) => row.cancelled);
  const eligible = rows.filter((row) => row.currentCycle !== "Sem ciclo identificado" || row.currentCycleEnd !== "Nao identificado");
  const didNotRenew = rows.filter((row) => row.reachedCycleEndAndDidNotRenew);
  const beforeFirst = rows.filter((row) => row.cancelledBeforeFirstCycle);
  const averageCycle = renewed.length
    ? renewed.reduce((sum, row) => sum + normalizeCycle(row.currentCycle), 0) / renewed.length
    : 0;

  const funnelRaw = [
    ["Elegiveis", eligible.length],
    ["Fim do ciclo", rows.filter((row) => row.currentCycleEnd !== "Nao identificado").length],
    ["Renovaram", renewed.length],
    ["Renovados ativos", renewedActive.length],
    ["Renovados cancelados", renewedCancelled.length],
    ["Nao renovaram", didNotRenew.length],
  ] as const;

  return {
    kpis: [
      { label: "Clientes que Renovaram", value: String(renewed.length), detail: "ciclo > 1 ou evidencia de renovacao" },
      { label: "Renovados Ativos", value: String(renewedActive.length), detail: "renovados com status ativo" },
      { label: "Renovados Cancelados", value: String(renewedCancelled.length), detail: "renovados com cancelamento" },
      { label: "Taxa de Renovacao", value: `${pct(renewed.length, eligible.length)}%`, detail: "renovados / elegiveis", progress: pct(renewed.length, eligible.length) },
      { label: "Retencao Pos-Renovacao", value: `${pct(renewedActive.length, renewed.length)}%`, detail: "renovados ativos / renovados", progress: pct(renewedActive.length, renewed.length) },
      { label: "Cancelados Antes do 1o Ciclo", value: String(beforeFirst.length), detail: `${DEFAULT_CYCLE_MONTHS} meses como ciclo padrao` },
      { label: "Nao Renovaram ao Fim do Ciclo", value: String(didNotRenew.length), detail: "fim de ciclo sem renovacao" },
      { label: "Ciclo Medio dos Renovados", value: averageCycle ? averageCycle.toFixed(1) : "Sem base", detail: "media do ciclo atual" },
    ],
    renewedByCycle: countBy(renewed, (row) => row.currentCycle),
    originOfRenewed: countBy(renewed, (row) => row.origin),
    statusOfRenewed: countBy(renewed, (row) => row.currentStatus),
    cancellationsByCycle: countBy(rows.filter((row) => row.cancelled), (row) => row.cancelledBeforeFirstCycle ? "Antes do ciclo 1" : row.currentCycle),
    cancellationReasons: countBy(renewedCancelled, (row) => row.cancellationReason).slice(0, 8),
    funnel: funnelRaw.map(([name, value], index) => ({
      name,
      value,
      previousRate: index === 0 ? 100 : pct(value, funnelRaw[index - 1][1]),
      baseRate: pct(value, funnelRaw[0][1]),
    })),
    cohort: [],
    rows,
    warnings: rows.some((row) => row.currentCycle === "Sem ciclo identificado")
      ? ["Campo de ciclo nao identificado em parte da base. Validar candidatos: ciclo, ciclo_atual, numero_ciclo, ciclo_cadu."]
      : [],
  };
}

export const renewalMappingNotes = [
  "Cliente renovado: ciclo maior que 1 ou campos candidatos de renovacao/data/status/contrato/pagamento preenchidos.",
  "Ciclo: prioriza campos explicitos como ciclo, ciclo_atual, numero_ciclo e ciclo_cadu; fallback por datas ainda pendente de validacao.",
  "Origem: normaliza desafio/perpetuo a partir de origem, funil, pipeline, tags e UTM.",
  "Cancelamento antes do ciclo: compara data de cancelamento com data final do ciclo; DEFAULT_CYCLE_MONTHS = 12 quando nao houver data final.",
];
