import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  calculateAge,
  normalizeGender,
  parseMonetaryText,
  toNumber,
  type ProfileRecord,
} from "./profileNormalization";

type SourceStatus = {
  configured: boolean;
  available: boolean;
  message: string;
};

export type ProfilesResult = {
  qv360: ProfileRecord[];
  infoproduto: ProfileRecord[];
  diagnostics: string[];
  stats: {
    qvIncomeValid: number;
    qvIncomeMissing: number;
    qvContributionValid: number;
    qvContributionMissing: number;
    leadRaw: number;
    leadValid: number;
    leadRemovedDomain: number;
    leadRemovedManual: number;
  };
  statuses: {
    anchor: SourceStatus;
    business: SourceStatus;
  };
};

const PAGE_SIZE = 1_000;

function configuredClient(url?: string, key?: string): SupabaseClient | null {
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function fetchAll<T>(
  client: SupabaseClient,
  schema: string,
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .schema(schema)
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function loadAnchor(
  client: SupabaseClient,
): Promise<{ records: ProfileRecord[]; warnings: string[] }> {
  type ClientRow = {
    qv_id: string;
    data_de_nascimento: string | null;
    created_at: string | null;
  };
  type IncomeContributionRow = {
    qv_id: string;
    renda: number | string | null;
    aporte: number | string | null;
  };
  type InfoRow = {
    qv_id: string | null;
    faixa_salarial: string | null;
  };
  type AssetRow = {
    qv_id: string;
    primaryValue: number | string | null;
    debtValue?: number | string | null;
  };

  const assetSources = [
    {
      table: "bens_moveis",
      select: "qv_id,fipe,saldo_devedor",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.fipe as number | string | null,
        debtValue: row.saldo_devedor as number | string | null,
      }),
    },
    {
      table: "bens_imoveis",
      select: "qv_id,valor_de_mercado,saldo_devedor",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.valor_de_mercado as number | string | null,
        debtValue: row.saldo_devedor as number | string | null,
      }),
    },
    {
      table: "af_previdencia_privada",
      select: "qv_id,valor_acumulado",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.valor_acumulado as number | string | null,
      }),
    },
    {
      table: "af_outros_investimentos",
      select: "qv_id,valor_total_atual",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.valor_total_atual as number | string | null,
      }),
    },
    {
      table: "af_investimentos",
      select: "qv_id,valor_total_atual",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.valor_total_atual as number | string | null,
      }),
    },
    {
      table: "af_fundos_de_investimentos",
      select: "qv_id,valor_aplicado",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.valor_aplicado as number | string | null,
      }),
    },
    {
      table: "af_renda_fixa",
      select: "qv_id,valor_total_atual",
      map: (row: Record<string, unknown>): AssetRow => ({
        qv_id: String(row.qv_id),
        primaryValue: row.valor_total_atual as number | string | null,
      }),
    },
  ] as const;

  const clients = await fetchAll<ClientRow>(
    client,
    "qv_360",
    "clientes_cadastro",
    "qv_id,data_de_nascimento,created_at",
  );

  const [incomeResult, infosResult, ...assetResults] = await Promise.allSettled([
    fetchAll<IncomeContributionRow>(
      client,
      "qv_360",
      "contratos",
      "qv_id,renda,aporte",
    ),
    fetchAll<InfoRow>(client, "qv_360", "infos_pessoais", "qv_id,faixa_salarial"),
    ...assetSources.map((source) =>
      fetchAll<Record<string, unknown>>(client, "qv_360", source.table, source.select),
    ),
  ]);

  const incomeRows = incomeResult.status === "fulfilled" ? incomeResult.value : [];
  const infos = infosResult.status === "fulfilled" ? infosResult.value : [];
  const warnings = [
    incomeResult.status === "rejected"
      ? "qv_360.contratos não está acessível; renda e aporte QV360 foram desconsiderados."
      : null,
    infosResult.status === "rejected" ? "infos_pessoais indisponível para faixa salarial." : null,
    ...assetResults.map((result, index) =>
      result.status === "rejected"
        ? `${assetSources[index].table} indisponível no cálculo patrimonial.`
        : null,
    ),
  ].filter(Boolean) as string[];

  const incomeByClient = new Map(incomeRows.map((row) => [row.qv_id, row]));
  const infosByClient = new Map(
    infos.filter((row) => row.qv_id).map((row) => [row.qv_id as string, row]),
  );
  const wealthByClient = new Map<string, number>();

  assetResults.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const source = assetSources[index];

    result.value.forEach((rawRow) => {
      const row = source.map(rawRow);
      const netValue = (toNumber(row.primaryValue) ?? 0) - (toNumber(row.debtValue) ?? 0);
      wealthByClient.set(row.qv_id, (wealthByClient.get(row.qv_id) ?? 0) + netValue);
    });
  });

  return {
    warnings,
    records: clients.map((client) => {
      const incomeContribution = incomeByClient.get(client.qv_id);
      const info = infosByClient.get(client.qv_id);

      return {
        id: client.qv_id,
        audience: "qv360",
        createdAt: client.created_at,
        age: calculateAge(client.data_de_nascimento),
        income: toNumber(incomeContribution?.renda),
        gender: null,
        monthlyContribution: toNumber(incomeContribution?.aporte),
        wealth: wealthByClient.get(client.qv_id) ?? 0,
        origin: null,
      };
    }),
  };
}

async function loadBusiness(
  client: SupabaseClient,
): Promise<{
  records: ProfileRecord[];
  raw: number;
  removedDomain: number;
  removedManual: number;
}> {
  type LeadRow = {
    id: string;
    email: string | null;
    idade: number | string | null;
    receita_mensal: number | string | null;
    aporte_mensal: number | string | null;
    patrimonio_atual: number | string | null;
    created_at: string | null;
  };

  const leads = await fetchAll<LeadRow>(
    client,
    "public",
    "pharus_calculadora_leads",
    "id,email,idade,receita_mensal,aporte_mensal,patrimonio_atual,created_at",
  );

  const manualExclusions = new Set([
    "bruna.arnold96@hotmail.com",
    "teste-conexao@example.com",
  ]);
  let removedDomain = 0;
  let removedManual = 0;

  const validLeads = leads.filter((lead) => {
    const email = lead.email?.trim().toLowerCase() ?? "";
    if (email.endsWith("@quartavia.com.br")) {
      removedDomain += 1;
      return false;
    }
    if (manualExclusions.has(email)) {
      removedManual += 1;
      return false;
    }
    return true;
  });

  return {
    raw: leads.length,
    removedDomain,
    removedManual,
    records: validLeads.map((lead) => ({
      id: lead.id,
      audience: "infoproduto",
      createdAt: lead.created_at,
      age: toNumber(lead.idade),
      income: toNumber(lead.receita_mensal),
      gender: normalizeGender(null),
      monthlyContribution: toNumber(lead.aporte_mensal),
      wealth: toNumber(lead.patrimonio_atual),
      origin: null,
    })),
  };
}

export async function loadProfiles(): Promise<ProfilesResult> {
  const anchor = configuredClient(
    import.meta.env.PUBLIC_SUPABASE_ANCHOR_URL,
    import.meta.env.PUBLIC_SUPABASE_ANCHOR_ANON_KEY,
  );
  const business = configuredClient(
    import.meta.env.PUBLIC_SUPABASE_BUSINESS_URL,
    import.meta.env.PUBLIC_SUPABASE_BUSINESS_ANON_KEY,
  );

  const result: ProfilesResult = {
    qv360: [],
    infoproduto: [],
    diagnostics: [],
    stats: {
      qvIncomeValid: 0,
      qvIncomeMissing: 0,
      qvContributionValid: 0,
      qvContributionMissing: 0,
      leadRaw: 0,
      leadValid: 0,
      leadRemovedDomain: 0,
      leadRemovedManual: 0,
    },
    statuses: {
      anchor: {
        configured: Boolean(anchor),
        available: false,
        message: anchor ? "Carregando QV360" : "Credenciais públicas do Anchor não configuradas",
      },
      business: {
        configured: Boolean(business),
        available: false,
        message: business
          ? "Carregando leads"
          : "Credenciais públicas do Business Data não configuradas",
      },
    },
  };

  const [anchorResult, businessResult] = await Promise.allSettled([
    anchor ? loadAnchor(anchor) : Promise.resolve({ records: [], warnings: [] }),
    business
      ? loadBusiness(business)
      : Promise.resolve({ records: [], raw: 0, removedDomain: 0, removedManual: 0 }),
  ]);

  if (anchorResult.status === "fulfilled" && anchor) {
    result.qv360 = anchorResult.value.records;
    result.stats.qvIncomeValid = result.qv360.filter((record) => record.income !== null).length;
    result.stats.qvIncomeMissing = result.qv360.length - result.stats.qvIncomeValid;
    result.stats.qvContributionValid = result.qv360.filter(
      (record) => record.monthlyContribution !== null,
    ).length;
    result.stats.qvContributionMissing =
      result.qv360.length - result.stats.qvContributionValid;
    result.diagnostics.push(
      "Patrimônio QV360 calculado por cliente com bens móveis, bens imóveis, previdência privada, outros investimentos, investimentos, fundos de investimentos e renda fixa.",
      ...anchorResult.value.warnings,
    );
    result.statuses.anchor = {
      configured: true,
      available: true,
      message: `${anchorResult.value.records.length.toLocaleString("pt-BR")} clientes carregados`,
    };
  } else if (anchorResult.status === "rejected") {
    result.statuses.anchor.message = `QV360 indisponível: ${anchorResult.reason?.message ?? "erro de consulta"}`;
    result.diagnostics.push(result.statuses.anchor.message);
  }

  if (businessResult.status === "fulfilled" && business) {
    result.infoproduto = businessResult.value.records;
    result.stats.leadRaw = businessResult.value.raw;
    result.stats.leadValid = businessResult.value.records.length;
    result.stats.leadRemovedDomain = businessResult.value.removedDomain;
    result.stats.leadRemovedManual = businessResult.value.removedManual;
    result.statuses.business = {
      configured: true,
      available: true,
      message: businessResult.value.records.length
        ? `${businessResult.value.records.length.toLocaleString("pt-BR")} inscrições externas carregadas`
        : "Conexão ativa, mas nenhuma linha está visível para a chave pública; verifique a política RLS",
    };
  } else if (businessResult.status === "rejected") {
    result.statuses.business.message = `Leads indisponíveis: ${businessResult.reason?.message ?? "erro de consulta"}`;
    result.diagnostics.push(result.statuses.business.message);
  }

  return result;
}
