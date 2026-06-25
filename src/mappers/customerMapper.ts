import type { AnyRecord, Sentiment } from "../types/researchCenter";

export function value(row: AnyRecord, fields: string[], fallback = "") {
  const field = fields.find((key) => row[key] !== undefined && row[key] !== null && row[key] !== "");
  return field ? String(row[field]) : fallback;
}

export function numberValue(row: AnyRecord, fields: string[], fallback = 0) {
  const raw = value(row, fields);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function dateValue(row: AnyRecord, fields: string[]) {
  const raw = value(row, fields);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("pt-BR") : "-";
}

export function normalizeEngineer(row: AnyRecord) {
  return value(row, ["engenheiro_patrimonial", "responsavel_name", "engineer", "advisor_name"], "Sem engenheiro").trim() || "Sem engenheiro";
}

export function normalizeClientName(row: AnyRecord) {
  return value(row, ["nome", "name", "cliente", "razao_social", "customer_name"], "Cliente anonimizado");
}

export function normalizeProduct(row: AnyRecord) {
  return value(row, ["produto", "product", "plano", "offer"], "Nao identificado");
}

export function normalizeStage(row: AnyRecord) {
  return value(row, ["etapa", "stage", "jornada_etapa", "journey_stage"], "Nao identificado");
}

export function normalizeTheme(row: AnyRecord) {
  return value(row, ["tema", "theme", "tipo_de_forms", "source"], "NPS");
}

export function normalizeSentimentFromScore(score: number): Sentiment {
  if (score >= 9) return "Positivo";
  if (score <= 6) return "Negativo";
  return "Neutro";
}

export function isCancelled(row: AnyRecord) {
  const status = value(row, ["status", "status_cliente", "situacao", "client_status", "customer_status"]).toLowerCase();
  return status.includes("cancel") || status.includes("churn") || Boolean(value(row, ["data_churn", "data_cancelamento", "cancelled_at"]));
}

export function isActive(row: AnyRecord) {
  if (typeof row.ativo === "boolean") return row.ativo;
  if (typeof row.is_active === "boolean") return row.is_active;
  return !isCancelled(row);
}
