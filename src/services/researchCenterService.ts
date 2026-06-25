import { getSupabaseClient } from "../lib/supabase";
import { mapEmptySnapshot, mapLegacyResearchCenterSnapshot, mapResearchCenterData } from "../mappers/researchCenterMapper";
import type { AnyRecord, ResearchCenterFilters, ResearchCenterSnapshot } from "../types/researchCenter";

type SourceKey = "clients" | "nps" | "csat" | "cancellations" | "cancellationStatuses";

const TABLE_CANDIDATES: Record<SourceKey, string[]> = {
  clients: ["clients", "vw_clients_com_data_entrada"],
  nps: ["nps_responses"],
  csat: ["csat_responses"],
  cancellations: ["cancellations", "vw_funil_cancelamentos"],
  cancellationStatuses: ["cancellation_statuses"],
};

async function fetchLocalPostgresSnapshot(): Promise<ResearchCenterSnapshot | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch(`/api/research-center?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const snapshot = await response.json();
    return mapLegacyResearchCenterSnapshot(snapshot, "Conectado ao Postgres do Backup BASE QV via API local.");
  } catch (error) {
    console.warn("[ResearchDashboard] API local Postgres indisponivel", error);
    return null;
  }
}

async function fetchTable(table: string, limit = 5000): Promise<{ rows: AnyRecord[]; warning?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { rows: [], warning: "Supabase nao configurado." };

  const { data, error } = await supabase.from(table).select("*").limit(limit);
  if (error) {
    console.warn(`[ResearchDashboard] Falha ao consultar ${table}`, error);
    return {
      rows: [],
      warning: `${table}: ${error.message}`,
    };
  }
  return { rows: (data || []) as AnyRecord[] };
}

async function fetchFirstAvailable(source: SourceKey) {
  const warnings: string[] = [];
  for (const table of TABLE_CANDIDATES[source]) {
    const result = await fetchTable(table);
    if (!result.warning) return { rows: result.rows, table, warnings };
    warnings.push(result.warning);
  }
  return { rows: [], table: TABLE_CANDIDATES[source][0], warnings };
}

export async function getResearchCenterSnapshot(filters?: ResearchCenterFilters): Promise<ResearchCenterSnapshot> {
  const localSnapshot = await fetchLocalPostgresSnapshot();
  if (localSnapshot) return localSnapshot;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return mapEmptySnapshot("Configure PUBLIC_SUPABASE_RESEARCH_URL e PUBLIC_SUPABASE_RESEARCH_ANON_KEY para leitura dinamica.");
  }

  try {
    const [clients, nps, csat, cancellations, cancellationStatuses] = await Promise.all([
      fetchFirstAvailable("clients"),
      fetchFirstAvailable("nps"),
      fetchFirstAvailable("csat"),
      fetchFirstAvailable("cancellations"),
      fetchFirstAvailable("cancellationStatuses"),
    ]);

    const warnings = [...clients.warnings, ...nps.warnings, ...csat.warnings, ...cancellations.warnings, ...cancellationStatuses.warnings];
    if (!clients.rows.length && !nps.rows.length && !cancellations.rows.length) {
      return mapEmptySnapshot(
        warnings.length
          ? `Sem leitura dinamica na Data API do Backup BASE QV. Verifique projeto/env, schemas expostos e cache do PostgREST. ${warnings.join(" | ")}`
          : "Sem dados disponiveis nas fontes consultadas.",
      );
    }

    return mapResearchCenterData({
      clients: clients.rows,
      nps: nps.rows,
      csat: csat.rows,
      cancellations: cancellations.rows,
      cancellationStatuses: cancellationStatuses.rows,
      sourceWarnings: warnings,
      sourceTables: {
        clients: clients.table,
        nps: nps.table,
        csat: csat.table,
        cancellations: cancellations.table,
        cancellationStatuses: cancellationStatuses.table,
      },
      filters,
    });
  } catch (error) {
    console.error("[ResearchDashboard] Erro ao consultar Supabase", error);
    return mapEmptySnapshot(error instanceof Error ? error.message : "Erro desconhecido ao consultar Supabase.");
  }
}
