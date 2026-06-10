import { getAuthSupabase } from './supabaseAuthClient';
import type {
  AgendamentoRow,
  PulsoKpis,
  AgendaPorDia,
  AgendaPorStatus,
  AgendaPorStage,
  DistribuicaoRenda,
  FiltrosPulso,
  StatusGrupo,
  RendaBucket,
} from '../types/pulsoDesafio';

const VIEW = 'vw_pulso_desafio_agendamentos_portal';
const SCHEMA = 'dw_bitrix';

export const STATUS_LABELS: Record<StatusGrupo, string> = {
  realizada: 'Realizada',
  futura: 'Futura',
  no_show: 'No-show',
  cancelamento: 'Cancelamento',
  no_show_absoluto: 'No-show absoluto',
  no_show_comercial: 'No-show comercial',
  reagendamento: 'Re-agendamento',
  outro: 'Outro',
};

export const STATUS_CORES: Record<StatusGrupo, string> = {
  realizada: '#3fb950',
  futura: '#3b82f6',
  no_show: '#f5a623',
  cancelamento: '#e5484d',
  no_show_absoluto: '#c792ea',
  no_show_comercial: '#56d4dd',
  reagendamento: '#ffb066',
  outro: '#7a7a7a',
};

export async function fetchDesafioTags(): Promise<string[]> {
  const { data, error } = await getAuthSupabase()
    .schema(SCHEMA)
    .from(VIEW)
    .select('desafio_tag')
    .not('desafio_tag', 'is', null)
    .order('desafio_tag');

  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const row of data ?? []) {
    const tag = (row as { desafio_tag: string }).desafio_tag;
    if (tag && !seen.has(tag)) { seen.add(tag); tags.push(tag); }
  }
  return tags;
}

export async function fetchStageTags(desafio: string): Promise<string[]> {
  let query = getAuthSupabase()
    .schema(SCHEMA)
    .from(VIEW)
    .select('stage_name')
    .not('stage_name', 'is', null);

  if (desafio) query = query.eq('desafio_tag', desafio);

  const { data, error } = await query.order('stage_name');
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const stages: string[] = [];
  for (const row of data ?? []) {
    const s = (row as { stage_name: string }).stage_name;
    if (s && !seen.has(s)) { seen.add(s); stages.push(s); }
  }
  return stages;
}

export async function fetchAgendamentos(filtros: FiltrosPulso): Promise<AgendamentoRow[]> {
  let query = getAuthSupabase()
    .schema(SCHEMA)
    .from(VIEW)
    .select('*')
    .order('data_agendamento', { ascending: false });

  if (filtros.desafio)    query = query.eq('desafio_tag', filtros.desafio);
  if (filtros.dataInicio) query = query.gte('data_agendamento', filtros.dataInicio);
  if (filtros.dataFim)    query = query.lte('data_agendamento', filtros.dataFim + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AgendamentoRow[];
}

export function computeKpis(rows: AgendamentoRow[]): PulsoKpis {
  return {
    totalAgendas:      rows.length,
    realizadas:        rows.filter((r) => r.status_grupo === 'realizada').length,
    futuras:           rows.filter((r) => r.status_grupo === 'futura').length,
    noShow:            rows.filter((r) => r.status_grupo === 'no_show').length,
    novosAgendamentos: rows.filter((r) => r.ordem_agendamento === 1).length,
    cancelamentos:     rows.filter((r) => r.status_grupo === 'cancelamento').length,
    noShowAbsoluto:    rows.filter((r) => r.status_grupo === 'no_show_absoluto').length,
    noShowComercial:   rows.filter((r) => r.status_grupo === 'no_show_comercial').length,
    reagendamentos:    rows.filter((r) => r.status_grupo === 'reagendamento').length,
    acima20k:          rows.filter((r) => r.renda_bucket === 'acima_20k').length,
    ate20k:            rows.filter((r) => r.renda_bucket === 'ate_20k').length,
    naoInformado:      rows.filter((r) => r.renda_bucket === 'nao_informado').length,
  };
}

export function getAgendaPorStatus(rows: AgendamentoRow[]): AgendaPorStatus[] {
  const counts = new Map<StatusGrupo, number>();
  for (const r of rows) {
    const g: StatusGrupo = r.status_grupo ?? 'outro';
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      count,
      cor: STATUS_CORES[status] ?? '#7a7a7a',
    }));
}

export function getAgendaPorDia(rows: AgendamentoRow[]): AgendaPorDia[] {
  const map = new Map<string, AgendaPorDia>();
  for (const r of rows) {
    const dia = r.data_referencia ?? r.data_agendamento?.slice(0, 10);
    if (!dia) continue;
    if (!map.has(dia)) {
      map.set(dia, { data: dia, total: 0, realizadas: 0, futuras: 0, cancelamentos: 0, no_show: 0 });
    }
    const entry = map.get(dia)!;
    entry.total++;
    if (r.status_grupo === 'realizada')    entry.realizadas++;
    if (r.status_grupo === 'futura')       entry.futuras++;
    if (r.status_grupo === 'cancelamento') entry.cancelamentos++;
    if (r.status_grupo === 'no_show' || r.status_grupo === 'no_show_absoluto' || r.status_grupo === 'no_show_comercial') {
      entry.no_show++;
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v);
}

export function getAgendaPorStage(rows: AgendamentoRow[]): AgendaPorStage[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const s = r.stage_name ?? 'Sem etapa';
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stage_name, count]) => ({ stage_name, count }));
}

export function getDistribuicaoRenda(rows: AgendamentoRow[]): DistribuicaoRenda[] {
  const counts = { acima_20k: 0, ate_20k: 0, nao_informado: 0 };
  for (const r of rows) {
    const b: RendaBucket = r.renda_bucket ?? 'nao_informado';
    counts[b]++;
  }
  return [
    { bucket: 'acima_20k',    label: 'Acima de 20k', count: counts.acima_20k },
    { bucket: 'ate_20k',      label: 'Até 20k',       count: counts.ate_20k },
    { bucket: 'nao_informado', label: 'Não informado', count: counts.nao_informado },
  ];
}

export interface NovosPorRenda {
  label: string;
  count: number;
  cor: string;
}

export function getNovosAgendamentosPorRenda(rows: AgendamentoRow[]): NovosPorRenda[] {
  const novos = rows.filter((r) => r.ordem_agendamento === 1);
  const counts = { acima_20k: 0, ate_20k: 0, nao_informado: 0 };
  for (const r of novos) {
    const b = (r.renda_bucket as RendaBucket) || 'nao_informado';
    if (b === 'acima_20k' || b === 'ate_20k' || b === 'nao_informado') counts[b]++;
    else counts.nao_informado++;
  }
  return [
    { label: 'Acima de 20k',  count: counts.acima_20k,    cor: '#f47920' },
    { label: 'Até 20k',       count: counts.ate_20k,      cor: '#8ab4f8' },
    { label: 'Não informado', count: counts.nao_informado, cor: '#3a3a3a' },
  ];
}

export interface TipoNoShow {
  tipo: string;
  count: number;
}

const GRUPOS_NOSHOW: StatusGrupo[] = ['no_show', 'no_show_absoluto', 'no_show_comercial', 'cancelamento', 'reagendamento'];

export function getTiposNoShow(rows: AgendamentoRow[]): TipoNoShow[] {
  const relevant = rows.filter((r) => GRUPOS_NOSHOW.includes(r.status_grupo ?? ('outro' as StatusGrupo)));
  const counts = new Map<string, number>();
  for (const r of relevant) {
    const raw = r.status_agendamento?.trim();
    const tipo = raw || STATUS_LABELS[r.status_grupo ?? 'outro'] || 'Não informado';
    counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tipo, count]) => ({ tipo, count }));
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
