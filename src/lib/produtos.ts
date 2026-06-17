import {
  getProdutosSupabase,
  isProdutosSupabaseConfigured,
} from './supabaseProdutosClient';
import { emptyProdutosMetrics } from './produtos/mockData';
import type { ProdutosMetricResponse } from '../types/produtos';

export const PRODUTOS_TABLES = [
  'clients',
  'cancellations',
  'cancellation_statuses',
  'reembolsos',
  'reembolso_statuses',
  'reembolso_pagamentos',
  'client_meetings',
  'manual_meetings',
  'meeting_attendance',
  'csat_responses',
  'pipeline_items',
] as const;

const PAGE_SIZE = 1000;
const REFRESH_MS = 2 * 60_000;

export type ProdutosFilters = {
  start: string;
  end: string;
  program: string;
  cohort: string;
};

type Row = Record<string, string | number | boolean | null>;

export type ProdutosFetchResult = {
  data: ProdutosMetricResponse;
  pendingConnection: boolean;
  error: string | null;
  info: string | null;
};

function isTableMissingError(error: { message?: string; code?: string }): boolean {
  const text = (error.message ?? '').toLowerCase();
  return (
    text.includes('does not exist') ||
    text.includes('could not find the table') ||
    text.includes('schema cache') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
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

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(value: unknown) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function inRange(value: unknown, start: Date, end: Date) {
  const parsed = parseDate(value);
  return Boolean(parsed && parsed >= start && parsed <= end);
}

function asNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const text = value.trim();
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function standardizeReason(text: string) {
  const cleaned = text
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/[.;,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Sem motivo declarado';
  const lower = cleaned.toLocaleLowerCase('pt-BR');
  return `${lower.charAt(0).toLocaleUpperCase('pt-BR')}${lower.slice(1)}`
    .replace(/\bqv360\b/gi, 'QV360')
    .replace(/\bpov\b/gi, 'POV');
}

function getCancellationReason(item: Row, client?: Row) {
  const raw = String(item.motivo || client?.motivo_churn || '').trim();
  if (!raw) return 'Sem motivo declarado';
  const cleanLines = raw
    .replace(/motivo\s+formulario\s+cliente\s*:/i, '')
    .replace(/motivo\s+formul[aá]rio\s+cliente\s*:/i, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\*+|\*+$/g, '').trim())
    .map((line) =>
      line
        .replace(/^data e hora do pedido de cancelamento\s*:\s*\d{2}\/\d{2}\/\d{4}\s*/i, '')
        .replace(/\s*urg[eê]ncia\s*:\s*.*$/i, '')
        .replace(/^\(cliente pov\)\s*descri[cç][aã]o do motivo\s*/i, '')
        .trim(),
    )
    .filter((line) => {
      const normalized = normalizeText(line);
      return !(
        normalized.startsWith('solicitante:') ||
        normalized.startsWith('selecione ') ||
        normalized.startsWith('canal de entrada:') ||
        normalized.startsWith('cliente:') ||
        normalized.startsWith('engenheiro:') ||
        normalized.startsWith('formulario:') ||
        normalized.startsWith('formulário:')
      );
    })
    .map((line) => line.replace(/^(resumo|motivo|observa[cç][aã]o)\s*:\s*/i, ''))
    .filter(Boolean);
  const reason = cleanLines.join(' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  return standardizeReason(reason);
}

async function fetchTable(table: string): Promise<{ rows: Row[]; error: { message?: string; code?: string } | null }> {
  const client = getProdutosSupabase();
  if (!client) return { rows: [], error: { message: 'Cliente Produtos não configurado.' } };

  const rows: Row[] = [];
  let from = 0;
  let lastError: { message?: string; code?: string } | null = null;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      lastError = { message: `${table}: ${error.message}`, code: error.code };
      break;
    }

    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows, error: lastError };
}

function latestById(rows: Row[]) {
  const map = new Map<string, Row>();
  for (const row of rows) {
    const id = String(row.id ?? '');
    if (id) map.set(id, row);
  }
  return map;
}

function getClientDate(client: Row) {
  return parseDate(client.data_inicio_ciclo) || parseDate(client.created_at);
}

function getProgram(client: Row | undefined) {
  return String(client?.programa || '').toUpperCase();
}

function passFilters(client: Row | undefined, program: string, cohort: string) {
  if (program && getProgram(client) !== program) return false;
  if (cohort) {
    const entry = client ? getClientDate(client) : null;
    if (!entry || monthKey(entry) !== cohort) return false;
  }
  return true;
}

function cancellationStatusPriority(status: Row | undefined) {
  const name = normalizeText(status?.name);
  if (name === 'churn efetivado') return 50;
  if (name === 'retido') return 40;
  if (name === 'nao retido') return 30;
  if (name.includes('distrato')) return 20;
  return Number(status?.display_order || 0);
}

function cancellationEventDate(row: Row) {
  return parseDate(row.data_pedido || row.created_at);
}

function dedupeCancellationsByClient(rows: Row[], statusesById: Map<string, Row>) {
  const selected = new Map<string, Row>();
  for (const row of rows) {
    const key = String(row.client_id || normalizeText(row.client_name) || '');
    if (!key) continue;
    const current = selected.get(key);
    if (!current) {
      selected.set(key, row);
      continue;
    }
    const rowStatus = statusesById.get(String(row.status_id || ''));
    const currentStatus = statusesById.get(String(current.status_id || ''));
    const rowPriority = cancellationStatusPriority(rowStatus);
    const currentPriority = cancellationStatusPriority(currentStatus);
    if (rowPriority > currentPriority) {
      selected.set(key, row);
      continue;
    }
    const rowDate = cancellationEventDate(row)?.getTime() || 0;
    const currentDate = cancellationEventDate(current)?.getTime() || 0;
    if (rowPriority === currentPriority && rowDate > currentDate) {
      selected.set(key, row);
    }
  }
  return Array.from(selected.values());
}

function groupByMonth(rows: Row[], dateField: string, start: Date, end: Date, fallbackField?: string) {
  const groups = new Map<string, number>();
  for (const row of rows) {
    const parsed = parseDate(row[dateField] || (fallbackField ? row[fallbackField] : null));
    if (parsed && parsed >= start && parsed <= end) {
      const key = monthKey(parsed);
      groups.set(key, (groups.get(key) || 0) + 1);
    }
  }
  return Array.from(groups, ([period, value]) => ({ period, value })).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
}

function classifyMeeting(name: unknown) {
  const normalized = normalizeText(name);
  if (normalized.includes('kickoff')) return 'Kickoff';
  if (normalized.includes('tracao patrimonial')) return 'Tração Patrimonial';
  if (normalized.includes('sessao zero')) return 'Sessão Zero';
  if (normalized.includes('rota patrimonial')) return 'Rota Patrimonial';
  if (normalized.includes('ativacao das engrenagens')) return 'Ativação das Engrenagens';
  if (normalized.includes('central de inteligencia')) return 'Central de Inteligência';
  return 'Outros';
}

function buildMeetingRows(clientMeetings: Row[], manualMeetings: Row[]) {
  const calendly = clientMeetings.map((meeting) => ({
    client_id: meeting.client_id,
    attendance_key: meeting.calendly_event_uri,
    start_time: meeting.start_time,
    type: classifyMeeting(meeting.event_name),
  }));
  const manual = manualMeetings.map((meeting) => ({
    client_id: meeting.client_id,
    attendance_key: `manual:${meeting.id}`,
    start_time: meeting.start_time,
    type: classifyMeeting(meeting.title),
  }));
  return calendly.concat(manual);
}

function makeAttendanceIndex(attendanceRows: Row[]) {
  const index = new Map<string, Row[]>();
  for (const row of attendanceRows) {
    const key = String(row.calendly_event_uri || '');
    if (!key) continue;
    const candidates = [key];
    const tail = key.split('/').filter(Boolean).pop();
    if (tail) candidates.push(tail);
    for (const candidate of candidates) {
      const current = index.get(candidate) || [];
      current.push(row);
      index.set(candidate, current);
    }
  }
  return index;
}

function lookupAttendance(index: Map<string, Row[]>, key: unknown) {
  const text = String(key || '');
  if (!text) return [];
  const tail = text.split('/').filter(Boolean).pop();
  return (index.get(text) || []).concat(tail ? index.get(tail) || [] : []);
}

function buildMetrics(
  tableRows: Row[][],
  periodStart: Date,
  periodEnd: Date,
  program: string,
  cohort: string,
  now: Date,
): ProdutosMetricResponse {
  const [
    clients,
    cancellations,
    cancellationStatuses,
    reembolsos,
    _reembolsoStatuses,
    reembolsoPagamentos,
    clientMeetings,
    manualMeetings,
    meetingAttendance,
    csatResponses,
    pipelineItems,
  ] = tableRows;

  const clientsById = latestById(clients);
  const statusesById = latestById(cancellationStatuses);
  const reembolsosById = latestById(reembolsos);
  const filteredClients = clients.filter((client) => passFilters(client, program, cohort));

  const activeClients = filteredClients.filter((client) => {
    const entry = getClientDate(client);
    const churn = parseDate(client.data_churn);
    return (
      normalizeText(client.status) === 'ativo' &&
      Boolean(entry && entry <= periodEnd) &&
      (!churn || churn > periodEnd)
    );
  });

  const newClients = filteredClients.filter((client) =>
    inRange(client.data_inicio_ciclo || client.created_at, periodStart, periodEnd),
  );

  const allCancellationRecords = cancellations.filter((item) => {
    const client = clientsById.get(String(item.client_id || ''));
    return passFilters(client, program, cohort) && inRange(item.data_pedido || item.created_at, periodStart, periodEnd);
  });

  const allCancellationFacts = dedupeCancellationsByClient(allCancellationRecords, statusesById);

  const cancellationFacts = allCancellationFacts.filter((item) => {
    const client = clientsById.get(String(item.client_id || ''));
    const status = statusesById.get(String(item.status_id || ''));
    return (
      passFilters(client, program, cohort) &&
      inRange(item.data_pedido || item.created_at, periodStart, periodEnd) &&
      normalizeText(status?.name) === 'churn efetivado'
    );
  });

  const retainedCancellationFacts = allCancellationFacts.filter((item) => {
    const status = statusesById.get(String(item.status_id || ''));
    return normalizeText(status?.name) === 'retido';
  });

  const sevenDayCancellationFacts = allCancellationFacts.filter((item) => {
    const client = clientsById.get(String(item.client_id || ''));
    const eventDate = parseDate(item.data_pedido || item.created_at);
    const entryDate = client ? getClientDate(client) : null;
    if (!eventDate || !entryDate) return false;
    const days = Math.floor((eventDate.getTime() - entryDate.getTime()) / 86_400_000);
    return days >= 0 && days <= 7;
  });

  const completedRefundClientIds = new Set<string>();
  let completedRefundValue = 0;
  for (const payment of reembolsoPagamentos) {
    const refund = reembolsosById.get(String(payment.reembolso_id || ''));
    const client = clientsById.get(String(refund?.client_id || ''));
    const isPaid =
      payment.pago === true ||
      String(payment.pago).toLowerCase() === 'true' ||
      String(payment.pago).toLowerCase() === 't';
    const paidDate = payment.paid_at || payment.mes_referencia || payment.created_at;
    if (isPaid && refund && passFilters(client, program, cohort) && inRange(paidDate, periodStart, periodEnd)) {
      completedRefundClientIds.add(String(refund.client_id || payment.reembolso_id));
      completedRefundValue += asNumber(payment.valor);
    }
  }

  const registeredRefundValue = reembolsos
    .filter((item) => {
      const client = clientsById.get(String(item.client_id || ''));
      return passFilters(client, program, cohort) && inRange(item.data_churn || item.created_at, periodStart, periodEnd);
    })
    .reduce((total, item) => total + asNumber(item.valor_total), 0);

  const cancellationsByStatus = Array.from(
    allCancellationFacts.reduce((groups, item) => {
      const status = statusesById.get(String(item.status_id || ''));
      const label = String(status?.name || 'Sem status');
      groups.set(label, (groups.get(label) || 0) + 1);
      return groups;
    }, new Map<string, number>()),
    ([status, value]) => ({ status, value }),
  ).sort((a, b) => b.value - a.value);

  const cancellationReasonFacts = allCancellationFacts.map((item) => {
    const client = clientsById.get(String(item.client_id || ''));
    return { reason: getCancellationReason(item, client) };
  });

  const filledChurnReasons = cancellationReasonFacts.filter((item) => item.reason !== 'Sem motivo declarado').length;
  const emptyChurnReasons = cancellationReasonFacts.length - filledChurnReasons;

  const churnReasons = Array.from(
    cancellationReasonFacts
      .filter((item) => item.reason !== 'Sem motivo declarado')
      .reduce((groups, item) => {
        groups.set(item.reason, (groups.get(item.reason) || 0) + 1);
        return groups;
      }, new Map<string, number>()),
    ([reason, value]) => ({ reason, value }),
  ).sort((a, b) => b.value - a.value || a.reason.localeCompare(b.reason));

  const refundFacts = reembolsos.filter((item) => {
    const client = clientsById.get(String(item.client_id || ''));
    const churn = parseDate(item.data_churn || item.created_at);
    const entry = client ? getClientDate(client) : null;
    if (!churn || !entry) return false;
    const days = Math.floor((churn.getTime() - entry.getTime()) / 86_400_000);
    return (
      passFilters(client, program, cohort) &&
      churn >= periodStart &&
      churn <= periodEnd &&
      days >= 0 &&
      days <= 7
    );
  });

  const renewalFacts = pipelineItems.filter((item) => {
    const client = clientsById.get(String(item.client_id || ''));
    return (
      normalizeText(item.pipeline_type) === 'renovacao' &&
      normalizeText(item.stage) === 'renovacao_efetivada' &&
      passFilters(client, program, cohort) &&
      inRange(item.updated_at || item.created_at, periodStart, periodEnd)
    );
  });

  const ascentFacts = clients.filter(
    (client) =>
      getProgram(client) === 'DAVOS' &&
      passFilters(client, program, cohort) &&
      inRange(client.data_ascensao, periodStart, periodEnd),
  );

  const meetings = buildMeetingRows(clientMeetings, manualMeetings);
  const attendanceIndex = makeAttendanceIndex(meetingAttendance);
  const trackedMeetingTypes = [
    'Kickoff',
    'Tração Patrimonial',
    'Sessão Zero',
    'Rota Patrimonial',
    'Ativação das Engrenagens',
    'Central de Inteligência',
  ];

  const meetingSummary = trackedMeetingTypes.map((type) => {
    const scoped = meetings.filter((meeting) => {
      const client = clientsById.get(String(meeting.client_id || ''));
      return meeting.type === type && passFilters(client, program, cohort) && inRange(meeting.start_time, periodStart, periodEnd);
    });
    const attended = scoped.filter((meeting) =>
      lookupAttendance(attendanceIndex, meeting.attendance_key).some(
        (row) => normalizeText(row.status) === 'compareceu',
      ),
    );
    return {
      type,
      scheduled: scoped.length,
      attended: attended.length,
      attendanceRate: scoped.length ? attended.length / scoped.length : 0,
    };
  });

  const csatScores = csatResponses
    .filter((row) => inRange(row.meeting_date || row.created_at, periodStart, periodEnd))
    .map((row) => Number(row.score))
    .filter((score) => Number.isFinite(score));

  const csatAverage =
    csatScores.length > 0 ? csatScores.reduce((total, score) => total + score, 0) / csatScores.length : null;

  const nextRefresh = new Date(now.getTime() + REFRESH_MS);

  return {
    refreshedAt: now.toISOString(),
    nextRefreshAt: nextRefresh.toISOString(),
    pendingConnection: false,
    warnings:
      clients.length === 0
        ? [
            'A API retornou 0 linhas em public.clients. Se a base já está populada, revise RLS/grants para authenticated.',
          ]
        : [],
    tabs: {
      clientes: {
        cards: [
          { label: 'Clientes ativos', value: activeClients.length },
          { label: 'Novos clientes', value: newClients.length },
          { label: 'Cancelamentos voluntários', value: cancellationFacts.length },
          { label: 'Reembolsos até 7 dias', value: refundFacts.length },
          {
            label: 'Taxa reembolso / novos',
            value: newClients.length ? refundFacts.length / newClients.length : 0,
            format: 'percent',
          },
          { label: 'Renovações', value: new Set(renewalFacts.map((row) => row.client_id)).size },
        ],
        charts: {
          newClientsByMonth: groupByMonth(newClients, 'data_inicio_ciclo', periodStart, periodEnd, 'created_at'),
          cancellationsByMonth: groupByMonth(cancellationFacts, 'created_at', periodStart, periodEnd),
          refundsByMonth: groupByMonth(refundFacts, 'data_churn', periodStart, periodEnd),
        },
      },
      cancelamentos: {
        cards: [
          { label: 'Cancelamentos', value: allCancellationFacts.length },
          { label: 'Retidos', value: retainedCancellationFacts.length },
          { label: 'Cancelamentos autorizados', value: cancellationFacts.length },
          { label: 'Reembolsos realizados', value: completedRefundClientIds.size },
          { label: 'Valor reembolsado', value: roundCurrency(completedRefundValue), format: 'currency' },
          { label: 'Reembolso cadastrado', value: roundCurrency(registeredRefundValue), format: 'currency' },
          { label: 'Cancelamento 7 dias', value: sevenDayCancellationFacts.length },
        ],
        charts: {
          byMonth: groupByMonth(allCancellationFacts, 'data_pedido', periodStart, periodEnd, 'created_at'),
          byStatus: cancellationsByStatus,
          churnReasons,
          churnReasonSummary: {
            filled: filledChurnReasons,
            empty: emptyChurnReasons,
            fillRate: cancellationReasonFacts.length ? filledChurnReasons / cancellationReasonFacts.length : 0,
          },
        },
      },
      operacao: {
        cards: [
          {
            label: 'Reuniões agendadas',
            value: meetingSummary.reduce((total, item) => total + item.scheduled, 0),
          },
          {
            label: 'Reuniões com presença',
            value: meetingSummary.reduce((total, item) => total + item.attended, 0),
          },
          {
            label: 'Taxa de comparecimento',
            value:
              meetingSummary.reduce((total, item) => total + item.scheduled, 0) > 0
                ? meetingSummary.reduce((total, item) => total + item.attended, 0) /
                  meetingSummary.reduce((total, item) => total + item.scheduled, 0)
                : 0,
            format: 'percent',
          },
          { label: 'CSAT médio', value: csatAverage, format: 'decimal', emptyLabel: 'Sem respostas' },
        ],
        charts: { meetingSummary },
      },
      produto: {
        cards: [
          { label: 'Ascensões para Davos', value: ascentFacts.length },
          {
            label: 'Taxa de ascensão / base ativa',
            value: activeClients.length ? ascentFacts.length / activeClients.length : 0,
            format: 'percent',
          },
        ],
        charts: {
          ascensionsByMonth: groupByMonth(ascentFacts, 'data_ascensao', periodStart, periodEnd),
        },
      },
    },
  };
}

export async function fetchProdutosMetrics(filters: ProdutosFilters): Promise<ProdutosFetchResult> {
  const empty = emptyProdutosMetrics();
  const now = new Date();

  if (!isProdutosSupabaseConfigured()) {
    return {
      data: empty,
      pendingConnection: true,
      error: null,
      info: 'Configure PUBLIC_PRODUTOS_SUPABASE_URL e PUBLIC_PRODUTOS_SUPABASE_ANON_KEY para carregar o dashboard Produtos.',
    };
  }

  const periodEnd = parseDate(filters.end) || now;
  const periodStart =
    parseDate(filters.start) ||
    new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate() - 120));
  const program = String(filters.program || '').toUpperCase();
  const cohort = String(filters.cohort || '');

  try {
    const results = await Promise.all(PRODUTOS_TABLES.map((table) => fetchTable(table)));
    const firstError = results.find((r) => r.error)?.error;

    if (firstError) {
      if (isTableMissingError(firstError)) {
        return {
          data: empty,
          pendingConnection: true,
          error: null,
          info: `Tabela não encontrada ou não exposta (${firstError.message}). Verifique public.* e docs/produtos-dashboard.md.`,
        };
      }
      if (isPermissionError(firstError)) {
        return {
          data: empty,
          pendingConnection: true,
          error: null,
          info: 'Sem permissão de leitura nas tabelas public.*. Aplique políticas RLS para authenticated (ver docs/produtos-dashboard.md).',
        };
      }
      return {
        data: { ...empty, refreshedAt: now.toISOString(), error: firstError.message },
        pendingConnection: false,
        error: firstError.message ?? 'Falha ao consultar dados de Produtos.',
        info: null,
      };
    }

    const tableRows = results.map((r) => r.rows);
    return {
      data: buildMetrics(tableRows, periodStart, periodEnd, program, cohort, now),
      pendingConnection: false,
      error: null,
      info: null,
    };
  } catch (e) {
    return {
      data: empty,
      pendingConnection: false,
      error: e instanceof Error ? e.message : 'Falha inesperada ao carregar Produtos.',
      info: null,
    };
  }
}
