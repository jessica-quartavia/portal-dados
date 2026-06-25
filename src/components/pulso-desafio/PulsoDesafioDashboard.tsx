import { useState, useEffect, useMemo, useCallback, Component, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  computeKpis,
  getAgendaPorStatus,
  getTiposNoShow,
  formatDate,
  STATUS_LABELS,
  STATUS_CORES,
} from '../../lib/pulsoDesafio';
import type {
  AgendamentoRow,
  FiltrosPulso,
  FiltrosTabela,
  PeriodoRapido,
  StatusGrupo,
  RendaBucket,
} from '../../types/pulsoDesafio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function applyQuickPeriod(p: PeriodoRapido): { dataInicio: string; dataFim: string } {
  const today = new Date();
  if (p === 'hoje')  return { dataInicio: fmtDate(today), dataFim: fmtDate(today) };
  if (p === 'ontem') {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    return { dataInicio: fmtDate(y), dataFim: fmtDate(y) };
  }
  if (p === '7d') {
    const s = new Date(today); s.setDate(s.getDate() - 6);
    return { dataInicio: fmtDate(s), dataFim: fmtDate(today) };
  }
  if (p === '30d') {
    const s = new Date(today); s.setDate(s.getDate() - 29);
    return { dataInicio: fmtDate(s), dataFim: fmtDate(today) };
  }
  return { dataInicio: '', dataFim: '' };
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

const S = {
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    margin: '0 0 var(--space-4)',
    color: 'var(--color-text)',
  } as React.CSSProperties,

  kpiCard: (highlight?: boolean) => ({
    background: 'var(--color-surface)',
    border: `1px solid ${highlight ? 'rgba(244,121,32,.3)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    flex: '1 1 140px',
    minWidth: 0,
  } as React.CSSProperties),

  kpiLabel: {
    fontSize: 'var(--fs-sm)',
    color: 'var(--color-text-muted)',
    margin: '0 0 var(--space-2)',
  } as React.CSSProperties,

  kpiValue: (highlight?: boolean) => ({
    fontSize: 'var(--fs-kpi)',
    fontWeight: 'var(--fw-bold)',
    lineHeight: 'var(--lh-tight)',
    margin: 0,
    color: highlight ? 'var(--color-primary)' : 'var(--color-text)',
  } as React.CSSProperties),

  kpiSub: {
    fontSize: 'var(--fs-xs)',
    color: 'var(--color-text-subtle)',
    marginTop: 'var(--space-1)',
  } as React.CSSProperties,

  input: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0 var(--space-3)',
    height: 36,
    color: 'var(--color-text)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    outline: 'none',
    width: '100%',
  } as React.CSSProperties,

  select: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0 var(--space-3)',
    height: 36,
    color: 'var(--color-text)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 180,
  } as React.CSSProperties,

  dateInput: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0 var(--space-3)',
    height: 36,
    color: 'var(--color-text)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    outline: 'none',
    colorScheme: 'dark',
    width: 150,
  } as React.CSSProperties,
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, highlight }: {
  label: string; value: number | string; sub?: string; highlight?: boolean;
}) {
  return (
    <div style={S.kpiCard(highlight)}>
      <p style={S.kpiLabel}>{label}</p>
      <p style={S.kpiValue(highlight)}>{value}</p>
      {sub && <p style={S.kpiSub}>{sub}</p>}
    </div>
  );
}

function FilterLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{
      fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)',
      color: 'var(--color-text-subtle)', textTransform: 'uppercase',
      letterSpacing: '0.06em', marginBottom: 4, display: 'block',
    }}>
      {children}
    </span>
  );
}

function QvTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--fs-sm)',
    }}>
      {label && <p style={{ margin: '0 0 6px', color: 'var(--color-text-muted)' }}>{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color ?? 'var(--color-text)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function StatusBadge({ grupo }: { grupo: StatusGrupo | null | undefined }) {
  const g: StatusGrupo = grupo ?? 'outro';
  const cor = STATUS_CORES[g] ?? '#7a7a7a';
  return (
    <span style={{
      background: cor + '22', color: cor,
      fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)',
      padding: '2px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[g] ?? g}
    </span>
  );
}

function RendaBadge({ bucket, raw }: { bucket: RendaBucket | null | undefined; raw: string | null }) {
  const map: Record<string, { bg: string; fg: string }> = {
    acima_20k: { bg: 'var(--color-primary-tint)', fg: 'var(--color-primary)' },
    ate_20k:   { bg: 'var(--color-info-soft)',    fg: 'var(--color-info)' },
  };
  const { bg = 'transparent', fg = 'var(--color-text-subtle)' } = map[bucket ?? ''] ?? {};
  const label = raw ? (raw.length > 14 ? raw.slice(0, 14) + '…' : raw) : '—';
  return (
    <span style={{
      background: bg, color: fg, fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)',
      padding: '2px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─── MiniBarList ─────────────────────────────────────────────────────────────
// Visualização de lista com barras de progresso inline (sem recharts)

function MiniBarList({ items, emptyMsg }: {
  items: { label: string; count: number; cor?: string }[];
  emptyMsg?: string;
}) {
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>{emptyMsg ?? 'Sem dados.'}</p>;
  }
  const max = Math.max(...visible.map((i) => i.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {items.map(({ label, count, cor }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
              {label}
            </span>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: count > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)', flexShrink: 0, marginLeft: 8 }}>
              {count}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)' }}>
            <div style={{
              height: 4, borderRadius: 2,
              background: count > 0 ? (cor ?? 'var(--color-primary)') : 'transparent',
              width: `${Math.round((count / max) * 100)}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function PulsoDesafioDashboardInner() {

  const [rows, setRows] = useState<AgendamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filtros globais — aplicados via query
  const [filtros, setFiltros] = useState<FiltrosPulso>({ desafio: '', dataInicio: '', dataFim: '' });
  const [periodo, setPeriodo] = useState<PeriodoRapido>('');

  // Filtros locais — apenas na tabela
  const [filtrosTabela, setFiltrosTabela] = useState<FiltrosTabela>({
    sdrCloser: '', clienteNome: '', email: '', bitrixDealId: '',
  });

  // Paginação visual da tabela
  const [visibleCount, setVisibleCount] = useState(30);

  const desafioTags = useMemo(
    () => [...new Set(rows.map((r) => r.desafio_tag).filter((t): t is string => t != null))].sort(),
    [rows],
  );

  const load = useCallback(async (f: FiltrosPulso) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        desafio: f.desafio,
        dataInicio: f.dataInicio,
        dataFim: f.dataFim,
      });
      const response = await fetch(`/api/pulso-desafio?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        const details = payload.details ? ` Detalhe: ${payload.details}` : '';
        throw new Error(`${payload.error ?? 'Falha ao carregar dados.'}${details}`);
      }
      setRows(payload.rows ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[PulsoDesafio] error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filtros); }, [filtros, load]);

  // Reset paginação quando qualquer filtro mudar
  useEffect(() => { setVisibleCount(30); }, [filtros, filtrosTabela]);

  useEffect(() => {
    const onFocus = () => load(filtros);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [filtros, load]);

  // rows = filteredRowsGlobal (server já aplicou desafio + data range)
  const kpis       = useMemo(() => computeKpis(rows),        [rows]);
  const porStatus  = useMemo(() => getAgendaPorStatus(rows), [rows]);
  const tiposNoShow = useMemo(() => getTiposNoShow(rows),    [rows]);

  // filteredRowsTable — aplica filtros locais da tabela sobre os rows já filtrados
  const filteredRowsTable = useMemo(() => {
    let r = rows;
    const { sdrCloser, clienteNome, email, bitrixDealId } = filtrosTabela;

    if (sdrCloser.trim()) {
      const q = normalizeText(sdrCloser);
      r = r.filter((row) =>
        normalizeText(row.sdr_nome ?? row.sdr_user_id).includes(q) ||
        normalizeText(row.closer_nome ?? row.closer_user_id).includes(q)
      );
    }
    if (clienteNome.trim()) {
      const q = normalizeText(clienteNome);
      r = r.filter((row) => normalizeText(row.cliente_nome).includes(q));
    }
    if (email.trim()) {
      const q = normalizeText(email);
      r = r.filter((row) => normalizeText(row.email).includes(q));
    }
    if (bitrixDealId.trim()) {
      const q = bitrixDealId.trim().toLowerCase();
      r = r.filter((row) => String(row.bitrix_deal_id ?? '').toLowerCase().includes(q));
    }
    return r;
  }, [rows, filtrosTabela]);

  const handlePeriodo = useCallback((p: PeriodoRapido) => {
    setPeriodo(p);
    const datas = applyQuickPeriod(p);
    setFiltros((prev) => ({ ...prev, ...datas }));
  }, []);

  const handleDateChange = useCallback((key: 'dataInicio' | 'dataFim', val: string) => {
    setPeriodo('');
    setFiltros((prev) => ({ ...prev, [key]: val }));
  }, []);

  const temFiltroGlobal = filtros.desafio || filtros.dataInicio || filtros.dataFim;
  const temFiltroTabela = filtrosTabela.sdrCloser || filtrosTabela.clienteNome || filtrosTabela.email || filtrosTabela.bitrixDealId;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && rows.length === 0) {
    return (
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-7)', minHeight: 120 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '2px solid var(--color-border-strong)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>Carregando dados…</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Erro ─────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ ...S.card, borderColor: 'var(--color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-7)', textAlign: 'center', minHeight: 160 }}>
        <p style={{ color: 'var(--color-danger)', fontWeight: 'var(--fw-semibold)', margin: 0, fontSize: 'var(--fs-base)' }}>Erro ao carregar dados</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', margin: 0, fontFamily: 'var(--font-mono)', maxWidth: 560, wordBreak: 'break-word' }}>{error}</p>
        <button className="qv-btn qv-btn--secondary" onClick={() => load(filtros)}>Tentar novamente</button>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)', margin: 0, lineHeight: 'var(--lh-tight)' }}>
            Pulso Desafio — Agendamentos
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', margin: 'var(--space-1) 0 0' }}>
            Acompanhamento em tempo real de agendas, comparecimento, no-shows e renda dos leads do desafio.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button className="qv-btn qv-btn--secondary" onClick={() => load(filtros)} disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M12 7A5 5 0 1 1 7 2v0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 2l2-2M7 2L5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {loading ? 'Atualizando…' : 'Atualizar agora'}
          </button>
          {lastUpdated && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)' }}>
              Atualizado {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Filtros globais */}
      <div style={{ ...S.card, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>

        {/* Desafio */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <FilterLabel>Desafio</FilterLabel>
          <select value={filtros.desafio}
            onChange={(e) => setFiltros((p) => ({ ...p, desafio: e.target.value }))}
            style={S.select}>
            <option value="">Todos os desafios</option>
            {desafioTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Data início */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <FilterLabel>Data início</FilterLabel>
          <input type="date" value={filtros.dataInicio}
            onChange={(e) => handleDateChange('dataInicio', e.target.value)}
            style={S.dateInput} />
        </div>

        {/* Data fim */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <FilterLabel>Data fim</FilterLabel>
          <input type="date" value={filtros.dataFim}
            onChange={(e) => handleDateChange('dataFim', e.target.value)}
            style={S.dateInput} />
        </div>

        {/* Período rápido */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <FilterLabel>Período</FilterLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['hoje', 'ontem', '7d', '30d'] as PeriodoRapido[]).map((p) => {
              const labels: Record<string, string> = { hoje: 'Hoje', ontem: 'Ontem', '7d': '7 dias', '30d': '30 dias' };
              const active = periodo === p;
              return (
                <button key={p}
                  onClick={() => handlePeriodo(active ? '' : p)}
                  style={{
                    height: 36, padding: '0 12px', fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: active ? 'var(--color-primary-tint)' : 'var(--color-surface-2)',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}>
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {temFiltroGlobal && (
          <button className="qv-btn qv-btn--ghost"
            onClick={() => { setFiltros({ desafio: '', dataInicio: '', dataFim: '' }); setPeriodo(''); }}
            style={{ height: 36 }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-7)', textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" opacity=".3" style={{ color: 'var(--color-text-subtle)' }} />
            <path d="M22 22l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3" style={{ color: 'var(--color-text-subtle)' }} />
          </svg>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>
            Nenhum agendamento encontrado
          </p>
          <p style={{ margin: 0, color: 'var(--color-text-subtle)', fontSize: 'var(--fs-sm)' }}>
            {temFiltroGlobal
              ? 'Nenhum resultado para os filtros selecionados.'
              : 'A view não retornou dados. Verifique se a view foi criada e se há dados.'}
          </p>
          {temFiltroGlobal && (
            <button className="qv-btn qv-btn--ghost"
              onClick={() => { setFiltros({ desafio: '', dataInicio: '', dataFim: '' }); setPeriodo(''); }}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* KPIs principais */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <KpiCard label="Agendas" value={kpis.totalAgendas} highlight />
            <KpiCard label="Realizadas" value={kpis.realizadas}
              sub={`${kpis.totalAgendas ? Math.round(kpis.realizadas / kpis.totalAgendas * 100) : 0}% do total`} />
            <KpiCard label="Futuras"            value={kpis.futuras} />
            <KpiCard label="No-show"            value={kpis.noShow} />
            <KpiCard label="Novos agendamentos" value={kpis.novosAgendamentos} sub="1ª agenda do lead" />
          </div>

          {/* Detalhamento no-show */}
          <div style={S.card}>
            <h2 style={S.sectionTitle}>Detalhamento no-show</h2>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <KpiCard label="Cancelamentos"     value={kpis.cancelamentos} />
              <KpiCard label="No-show absoluto"  value={kpis.noShowAbsoluto} />
              <KpiCard label="No-show comercial" value={kpis.noShowComercial} />
              <KpiCard label="Re-agendamentos"   value={kpis.reagendamentos} />
            </div>
          </div>

          {/* Gráficos */}
          <div className="qv-grid">
            <div className="qv-col-6 qv-card">
              <h2 style={S.sectionTitle}>Agendas por status</h2>
              {porStatus.length === 0
                ? <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>Sem dados.</p>
                : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={porStatus} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ fill: '#b3b3b3', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                      <Tooltip content={<QvTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                      <Bar dataKey="count" name="Agendas" radius={[0, 4, 4, 0]}>
                        {porStatus.map((e) => <Cell key={e.status} fill={e.cor} />)}
                        <LabelList dataKey="count" position="right" style={{ fill: '#7a7a7a', fontSize: 11, fontFamily: 'monospace' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
            <div className="qv-col-6 qv-card">
              <h2 style={S.sectionTitle}>Tipos de no-show</h2>
              <p style={{ margin: '-8px 0 var(--space-4)', fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)' }}>
                No-shows, cancelamentos e reagendamentos — por categoria
              </p>
              <MiniBarList
                items={tiposNoShow.map((t) => ({ label: t.tipo, count: t.count, cor: '#f5a623' }))}
                emptyMsg="Nenhum no-show ou cancelamento encontrado."
              />
            </div>
          </div>

          {/* Tabela operacional */}
          <div style={S.card}>
            <h2 style={{ ...S.sectionTitle, marginBottom: 'var(--space-3)' }}>Tabela operacional</h2>

            {/* Filtros locais da tabela */}
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)', fontWeight: 'var(--fw-medium)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Filtros abaixo afetam apenas a tabela operacional
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 160px', minWidth: 0 }}>
                  <FilterLabel>SDR ou Closer</FilterLabel>
                  <input type="text" placeholder="Nome do SDR ou Closer" value={filtrosTabela.sdrCloser}
                    onChange={(e) => setFiltrosTabela((p) => ({ ...p, sdrCloser: e.target.value }))}
                    style={S.input} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 160px', minWidth: 0 }}>
                  <FilterLabel>Cliente</FilterLabel>
                  <input type="text" placeholder="Nome do cliente" value={filtrosTabela.clienteNome}
                    onChange={(e) => setFiltrosTabela((p) => ({ ...p, clienteNome: e.target.value }))}
                    style={S.input} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 160px', minWidth: 0 }}>
                  <FilterLabel>E-mail</FilterLabel>
                  <input type="text" placeholder="E-mail do cliente" value={filtrosTabela.email}
                    onChange={(e) => setFiltrosTabela((p) => ({ ...p, email: e.target.value }))}
                    style={S.input} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 140px', minWidth: 0 }}>
                  <FilterLabel>ID Bitrix</FilterLabel>
                  <input type="text" placeholder="Bitrix Deal ID" value={filtrosTabela.bitrixDealId}
                    onChange={(e) => setFiltrosTabela((p) => ({ ...p, bitrixDealId: e.target.value }))}
                    style={S.input} />
                </div>
                {temFiltroTabela && (
                  <button className="qv-btn qv-btn--ghost" style={{ height: 36 }}
                    onClick={() => setFiltrosTabela({ sdrCloser: '', clienteNome: '', email: '', bitrixDealId: '' })}>
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {filteredRowsTable.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
                Nenhuma linha corresponde aos filtros da tabela.
              </p>
            ) : (() => {
              const visibleRows = filteredRowsTable.slice(0, visibleCount);
              const hasMore = visibleCount < filteredRowsTable.length;
              return (
              <>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)', margin: '0 0 var(--space-3)' }}>
                Exibindo {visibleRows.length} de {filteredRowsTable.length} registro{filteredRowsTable.length !== 1 ? 's' : ''}
                {temFiltroTabela ? ` (filtrado de ${rows.length})` : ''}
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="qv-table">
                  <thead>
                    <tr>
                      <th>Desafio</th>
                      <th>Cliente / Deal</th>
                      <th>E-mail</th>
                      <th>Data agenda</th>
                      <th>Status</th>
                      <th>Funil / Etapa</th>
                      <th>Renda</th>
                      <th>SDR</th>
                      <th>Closer</th>
                      <th>Responsável</th>
                      <th style={{ textAlign: 'right' }}>Bitrix Deal ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.agendamento_id}>
                        <td>
                          <span style={{ background: 'var(--color-primary-tint)', color: 'var(--color-primary)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)', padding: '2px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
                            {row.desafio_tag ?? '—'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.cliente_nome ?? '—'}
                        </td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>
                          {row.email ?? '—'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>
                          {formatDate(row.data_agendamento)}
                        </td>
                        <td><StatusBadge grupo={row.status_grupo} /></td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>
                          {row.funil_nome ?? row.stage_name ?? '—'}
                        </td>
                        <td><RendaBadge bucket={row.renda_bucket} raw={row.renda_raw} /></td>
                        <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {row.sdr_nome?.trim() || row.sdr_user_id?.trim() || 'Sem SDR'}
                        </td>
                        <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {row.closer_nome?.trim() || row.closer_user_id?.trim() || 'Sem Closer'}
                        </td>
                        <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {row.responsavel_nome ?? row.responsavel_user_id ?? '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)' }}>
                          {row.bitrix_deal_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                  <button
                    className="qv-btn qv-btn--secondary"
                    onClick={() => setVisibleCount((c) => c + 30)}
                  >
                    Exibir mais
                  </button>
                </div>
              )}
              </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null };

  static getDerivedStateFromError(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[PulsoDesafio] uncaught render error:', msg);
    return { error: msg };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#1a1a1a', border: '1px solid #e5484d', borderRadius: '12px', padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', minHeight: 160 }}>
          <p style={{ color: '#e5484d', fontWeight: 600, margin: 0, fontSize: '16px' }}>Erro inesperado no dashboard</p>
          <p style={{ color: '#b3b3b3', fontSize: '13px', fontFamily: 'monospace', margin: 0, maxWidth: 560, wordBreak: 'break-word' }}>{this.state.error}</p>
          <button style={{ marginTop: 8, padding: '8px 20px', background: 'transparent', border: '1px solid #3a3a3a', borderRadius: '8px', color: '#b3b3b3', cursor: 'pointer', fontSize: '13px' }}
            onClick={() => this.setState({ error: null })}>
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function PulsoDesafioDashboard() {
  return (
    <ErrorBoundary>
      <PulsoDesafioDashboardInner />
    </ErrorBoundary>
  );
}
