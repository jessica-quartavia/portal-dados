import { getAuthSupabase } from './supabaseAuthClient';
import { emptyComercialData } from './comercial/mockData';
import type {
  ComercialDashboardData,
  ComercialFilters,
  ComercialValidationRow,
} from '../types/comercial';

export const COMERCIAL_VIEW = 'vw_comercial_agendamentos_portal';
export const COMERCIAL_SCHEMA = 'dw_bitrix';

const PAGE_SIZE = 1000;
const INCOME_ORDER = ['Acima de 20k', 'De 15k à 20k', 'Nao informado'] as const;

export type ComercialFetchResult = {
  data: ComercialDashboardData;
  pendingConnection: boolean;
  error: string | null;
  info: string | null;
};

type ComercialViewRow = {
  agendamento_id: string | null;
  bitrix_deal_id: string | null;
  nome_cliente: string | null;
  nome_closer: string | null;
  nome_sdr: string | null;
  data_agendamento: string | null;
  created_at: string | null;
  status_agendamento: string | null;
  stage_name: string | null;
  faixa_renda: string | null;
  valor_renda: string | null;
  origem_tag: string | null;
  is_reuniao_agendada?: boolean | null;
  is_novo_agendamento?: boolean | null;
  is_realizada?: boolean | null;
  is_futura?: boolean | null;
  is_no_show?: boolean | null;
};

function isAuthConfigured(): boolean {
  const url = import.meta.env.PUBLIC_AUTH_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_AUTH_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url?.trim() && key?.trim());
}

function isViewMissingError(error: { message?: string; code?: string; details?: string }): boolean {
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.code ?? ''}`.toLowerCase();
  return (
    text.includes('does not exist') ||
    text.includes('could not find the table') ||
    text.includes('could not find the table') ||
    text.includes('schema cache') ||
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST116'
  );
}

function isPermissionError(error: { message?: string; code?: string }): boolean {
  const text = (error.message ?? '').toLowerCase();
  return (
    text.includes('permission denied') ||
    text.includes('row-level security') ||
    error.code === '42501' ||
    error.code === 'PGRST301'
  );
}

function parseRange(filters: ComercialFilters) {
  const start = new Date(`${filters.start}T00:00:00`);
  const endExclusive = new Date(`${filters.end}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive, endInclusive: new Date(`${filters.end}T23:59:59`) };
}

function inScheduledRange(row: ComercialViewRow, start: Date, endExclusive: Date) {
  if (!row.data_agendamento) return false;
  const d = new Date(row.data_agendamento);
  return d >= start && d < endExclusive;
}

function inCreatedRange(row: ComercialViewRow, start: Date, endExclusive: Date) {
  if (!row.created_at) return false;
  const d = new Date(row.created_at);
  return d >= start && d < endExclusive;
}

function inEitherRange(row: ComercialViewRow, start: Date, endExclusive: Date) {
  return inScheduledRange(row, start, endExclusive) || inCreatedRange(row, start, endExclusive);
}

const STATUS_LABELS: Record<string, string> = {
  '167': 'Agendado',
  '169': 'Confirmado',
  '171': 'Realizado',
  '173': 'No-Show',
  '175': 'No-Show Técnico',
  '177': 'Reagendado',
  '179': 'Cancelado pelo Cliente',
  '187': 'Cancelado pelo Time',
  '189': 'Aguardando Agendamento',
  '205': 'Aguardando Agendamento',
  '207': 'Agendado',
  '209': 'Confirmado',
  '211': 'Realizado',
  '213': 'No-Show',
  '215': 'No-Show Técnico',
  '217': 'Reagendado',
  '219': 'Cancelado pelo Cliente',
  '221': 'Cancelado pelo Time',
  '367': 'Desqualificado',
  '369': 'Sem perfil',
  '371': 'Comprou no pitch',
  '373': 'Comprou c/ comercial',
};

function normalizeAppointmentStatus(status: string | null, stageName: string | null): string {
  const trimmed = status?.trim();
  if (!trimmed) {
    if (stageName?.trim().toLowerCase() === 'aguardando reagendamento') {
      return 'Aguardando Reagendamento';
    }
    return 'Nao informado';
  }
  const mapped = STATUS_LABELS[trimmed];
  if (mapped) return mapped;
  if (stageName?.trim().toLowerCase() === 'aguardando reagendamento' && mapped === 'Aguardando Agendamento') {
    return 'Aguardando Reagendamento';
  }
  return trimmed;
}

function classifyNoShowType(row: ComercialViewRow): string {
  const stage = row.stage_name?.trim().toLowerCase() ?? '';
  const status = row.status_agendamento?.trim() ?? '';
  const normalized = normalizeAppointmentStatus(row.status_agendamento, row.stage_name);

  if (
    stage === 'aguardando reagendamento' &&
    (!status || ['189', '205', 'aguardando agendamento'].includes(status.toLowerCase()))
  ) {
    return 'Aguardando Reagendamento';
  }
  if (['167', '207', 'agendado'].includes(status.toLowerCase()) || normalized === 'Agendado') {
    return 'Nao informado';
  }
  return normalized;
}

function flag(row: ComercialViewRow, key: keyof ComercialViewRow): boolean {
  const value = row[key];
  return value === true || value === 'true' || value === 't';
}

async function fetchPagedByDateColumn(
  column: 'data_agendamento' | 'created_at',
  startIso: string,
  endIso: string,
): Promise<{ rows: ComercialViewRow[]; error: { message?: string; code?: string; details?: string } | null }> {
  const rows: ComercialViewRow[] = [];
  let from = 0;
  let lastError: { message?: string; code?: string; details?: string } | null = null;

  while (true) {
    const { data, error } = await getAuthSupabase()
      .schema(COMERCIAL_SCHEMA)
      .from(COMERCIAL_VIEW)
      .select('*')
      .gte(column, startIso)
      .lt(column, endIso)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      lastError = error;
      break;
    }

    const page = (data ?? []) as ComercialViewRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows, error: lastError };
}

async function fetchAllComercialRows(
  startIso: string,
  endIso: string,
): Promise<{ rows: ComercialViewRow[]; error: { message?: string; code?: string; details?: string } | null }> {
  const [scheduled, created] = await Promise.all([
    fetchPagedByDateColumn('data_agendamento', startIso, endIso),
    fetchPagedByDateColumn('created_at', startIso, endIso),
  ]);

  const error = scheduled.error ?? created.error;
  if (error) return { rows: [], error };

  const merged = new Map<string, ComercialViewRow>();
  for (const row of [...scheduled.rows, ...created.rows]) {
    const key =
      row.agendamento_id ??
      `${row.bitrix_deal_id ?? 'deal'}-${row.data_agendamento ?? row.created_at ?? Math.random()}`;
    merged.set(key, row);
  }

  return { rows: [...merged.values()], error: null };
}

function buildValidationRows(
  rows: ComercialViewRow[],
  start: Date,
  endExclusive: Date,
): ComercialValidationRow[] {
  const validation: ComercialValidationRow[] = [];

  const push = (indicador: string, row: ComercialViewRow) => {
    validation.push({
      indicador,
      agendamentoId: row.agendamento_id ?? 'Nao informado',
      bitrixDealId: row.bitrix_deal_id ?? 'Nao informado',
      nomeCliente: row.nome_cliente ?? 'Nao informado',
      dataAgendamento: row.data_agendamento,
      dataCriacao: row.created_at,
      statusAgendamento: normalizeAppointmentStatus(row.status_agendamento, row.stage_name),
      faixaRenda: row.faixa_renda ?? 'Nao informado',
      nomeCloser: row.nome_closer ?? 'Nao informado',
      nomeSdr: row.nome_sdr ?? 'Nao informado',
      origemTag: row.origem_tag ?? 'Nao informado',
      valorRenda: row.valor_renda ?? 'Nao informado',
      stageStatus: row.stage_name ?? 'Nao informado',
    });
  };

  for (const row of rows) {
    if (!inEitherRange(row, start, endExclusive)) continue;

    if (inScheduledRange(row, start, endExclusive) && flag(row, 'is_reuniao_agendada')) {
      push('Reunioes Agendadas', row);
      push('Renda por dia', row);
      push('Reunioes', row);
    }
    if (inScheduledRange(row, start, endExclusive) && flag(row, 'is_realizada')) {
      push('Reunioes Realizadas', row);
    }
    if (inScheduledRange(row, start, endExclusive) && flag(row, 'is_no_show')) {
      push('No-show', row);
      push('Tipos de no-show', row);
    }
    if (inScheduledRange(row, start, endExclusive) && flag(row, 'is_futura')) {
      push('Reunioes Futuras', row);
    }
    if (inCreatedRange(row, start, endExclusive) && flag(row, 'is_novo_agendamento')) {
      push('Novos Agendamentos', row);
      push('Novos agendamentos por renda', row);
    }
  }

  return validation.sort((a, b) => {
    const byIndicador = a.indicador.localeCompare(b.indicador);
    if (byIndicador !== 0) return byIndicador;
    const byCloser = a.nomeCloser.localeCompare(b.nomeCloser);
    if (byCloser !== 0) return byCloser;
    return (b.dataAgendamento ?? '').localeCompare(a.dataAgendamento ?? '');
  });
}

function aggregateComercial(rows: ComercialViewRow[], filters: ComercialFilters): ComercialDashboardData {
  const { start, endExclusive } = parseRange(filters);
  const scheduled = rows.filter((r) => inScheduledRange(r, start, endExclusive));
  const created = rows.filter((r) => inCreatedRange(r, start, endExclusive));

  const reunioesAgendadas = scheduled.filter((r) => flag(r, 'is_reuniao_agendada')).length;
  const novosAgendamentos = created.filter((r) => flag(r, 'is_novo_agendamento')).length;
  const reunioesRealizadas = scheduled.filter((r) => flag(r, 'is_realizada')).length;
  const reunioesFuturas = scheduled.filter((r) => flag(r, 'is_futura')).length;
  const noShow = scheduled.filter((r) => flag(r, 'is_no_show')).length;

  const noShowRows = scheduled.filter((r) => flag(r, 'is_no_show'));
  const noShowCounts = new Map<string, number>();
  for (const row of noShowRows) {
    const tipo = classifyNoShowType(row);
    noShowCounts.set(tipo, (noShowCounts.get(tipo) ?? 0) + 1);
  }
  const noShowTypes = [...noShowCounts.entries()]
    .map(([tipo, quantidade]) => ({ tipo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const novosRows = created.filter((r) => flag(r, 'is_novo_agendamento'));
  const incomeCounts = new Map<string, number>();
  for (const row of novosRows) {
    const faixa = row.faixa_renda ?? 'Nao informado';
    incomeCounts.set(faixa, (incomeCounts.get(faixa) ?? 0) + 1);
  }
  const income = INCOME_ORDER.map((faixa) => ({
    faixa,
    quantidade: incomeCounts.get(faixa) ?? 0,
  }));

  const incomeByDayMap = new Map<string, number>();
  for (const row of scheduled.filter((r) => flag(r, 'is_reuniao_agendada'))) {
    if (!row.data_agendamento) continue;
    const dia = row.data_agendamento.slice(0, 10);
    const faixa = row.faixa_renda ?? 'Nao informado';
    const key = `${dia}|${faixa}`;
    incomeByDayMap.set(key, (incomeByDayMap.get(key) ?? 0) + 1);
  }
  const incomeByDay = [...incomeByDayMap.entries()].map(([key, quantidade]) => {
    const [dia, faixa] = key.split('|');
    return { dia, faixa, quantidade };
  });

  const meetings = scheduled
    .filter((r) => flag(r, 'is_reuniao_agendada'))
    .sort((a, b) => {
      const closer = (a.nome_closer ?? '').localeCompare(b.nome_closer ?? '');
      if (closer !== 0) return closer;
      return (b.data_agendamento ?? '').localeCompare(a.data_agendamento ?? '');
    })
    .slice(0, 200)
    .map((row) => ({
      nomeCliente: row.nome_cliente ?? 'Nao informado',
      nomeCloser: row.nome_closer ?? 'Nao informado',
      nomeSdr: row.nome_sdr ?? 'Nao informado',
      dataAgendamento: row.data_agendamento,
      statusAgendamento: normalizeAppointmentStatus(row.status_agendamento, row.stage_name),
      bitrixDealId: row.bitrix_deal_id,
    }));

  return {
    metrics: {
      reunioesAgendadas,
      novosAgendamentos,
      reunioesRealizadas,
      reunioesFuturas,
      noShow,
    },
    noShowTypes,
    income,
    incomeByDay,
    meetings,
    validationRows: buildValidationRows(rows, start, endExclusive),
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchComercialDashboard(filters: ComercialFilters): Promise<ComercialFetchResult> {
  const empty = emptyComercialData();

  if (!isAuthConfigured()) {
    return {
      data: empty,
      pendingConnection: true,
      error: null,
      info: 'Configure PUBLIC_AUTH_SUPABASE_URL e PUBLIC_AUTH_SUPABASE_ANON_KEY para carregar o dashboard Comercial.',
    };
  }

  const { start, endExclusive } = parseRange(filters);
  const startIso = start.toISOString();
  const endIso = endExclusive.toISOString();

  try {
    const { rows, error } = await fetchAllComercialRows(startIso, endIso);

    if (error) {
      if (isViewMissingError(error)) {
        return {
          data: empty,
          pendingConnection: true,
          error: null,
          info: `View ${COMERCIAL_SCHEMA}.${COMERCIAL_VIEW} ainda não publicada. Execute sql/dw_bitrix/002_vw_comercial_agendamentos_portal.sql no Business Data.`,
        };
      }
      if (isPermissionError(error)) {
        return {
          data: empty,
          pendingConnection: true,
          error: null,
          info: `Sem permissão de leitura em ${COMERCIAL_SCHEMA}.${COMERCIAL_VIEW}. Conceda GRANT SELECT TO authenticated.`,
        };
      }
      return {
        data: empty,
        pendingConnection: false,
        error: error.message ?? 'Falha ao consultar dados do Comercial.',
        info: null,
      };
    }

    return {
      data: aggregateComercial(rows, filters),
      pendingConnection: false,
      error: null,
      info: rows.length === 0 ? 'Nenhum registro retornado para o período selecionado.' : null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha inesperada ao carregar Comercial.';
    if (message.includes('PUBLIC_AUTH_SUPABASE')) {
      return { data: empty, pendingConnection: true, error: null, info: message };
    }
    return { data: empty, pendingConnection: false, error: message, info: null };
  }
}
