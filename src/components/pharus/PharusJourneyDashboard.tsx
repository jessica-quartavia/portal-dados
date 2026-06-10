import { useState, useEffect, useMemo, useCallback } from 'react';
import { getPharusSupabase } from '../../lib/supabasePharusClient';
import {
  computeKpis,
  getFunnelProgress,
  getCurrentStepDistribution,
  getStepBottlenecks,
  getClientHistory,
} from '../../lib/pharusJourney';
import type { UserProgress, ClientHistory } from '../../types/pharus';
import PharusFunnelChart from './PharusFunnelChart';

type RealtimeStatus = 'connecting' | 'connected' | 'error';

function formatDays(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(1)}d`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Inline style constants (tokens) ────────────────────────────────────────

const S = {
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
  } as React.CSSProperties,

  kpiCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: 'var(--fs-sm)',
    color: 'var(--color-text-muted)',
    margin: '0 0 var(--space-2)',
  } as React.CSSProperties,

  kpiValue: {
    fontSize: 'var(--fs-kpi)',
    fontWeight: 'var(--fw-bold)',
    lineHeight: 'var(--lh-tight)',
    margin: 0,
  } as React.CSSProperties,

  kpiSub: {
    fontSize: 'var(--fs-xs)',
    color: 'var(--color-text-subtle)',
    marginTop: 'var(--space-1)',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    margin: '0 0 var(--space-4)',
    color: 'var(--color-text)',
  } as React.CSSProperties,

  badge: (variant: 'onboarding' | 'pos' | 'done' | 'pending') => {
    const map = {
      onboarding: {
        background: 'var(--color-primary-tint)',
        color: 'var(--color-primary)',
      },
      pos: {
        background: 'var(--color-info-soft)',
        color: 'var(--color-info)',
      },
      done: {
        background: 'var(--color-success-soft)',
        color: 'var(--color-success)',
      },
      pending: {
        background: 'var(--color-warning-soft)',
        color: 'var(--color-warning)',
      },
    };
    return {
      ...map[variant],
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 'var(--fs-xs)',
      fontWeight: 'var(--fw-medium)',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      whiteSpace: 'nowrap',
    } as React.CSSProperties;
  },
} as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div style={S.kpiCard}>
      <p style={S.kpiLabel}>{label}</p>
      <p
        style={{
          ...S.kpiValue,
          color: highlight ? 'var(--color-primary)' : 'var(--color-text)',
        }}
      >
        {value}
      </p>
      {sub && <p style={S.kpiSub}>{sub}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: RealtimeStatus }) {
  const colorMap: Record<RealtimeStatus, string> = {
    connecting: 'var(--color-warning)',
    connected: 'var(--color-success)',
    error: 'var(--color-danger)',
  };
  const labelMap: Record<RealtimeStatus, string> = {
    connecting: 'Conectando…',
    connected: 'Realtime ativo',
    error: 'Sem conexão realtime',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colorMap[status],
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {labelMap[status]}
    </span>
  );
}

function ClientTimeline({ history }: { history: ClientHistory }) {
  if (history.steps.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>
        Nenhuma etapa encontrada para este cliente.
      </p>
    );
  }
  return (
    <div>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-4)' }}>
        Etapa atual:{' '}
        <strong style={{ color: 'var(--color-text)' }}>
          {history.currentStep?.label ?? '—'}
        </strong>
        {' '}
        <span style={S.badge(history.currentStep?.phase === 'pos_onboarding' ? 'pos' : 'onboarding')}>
          {history.currentStep?.phase === 'pos_onboarding' ? 'Pós-onboarding' : 'Onboarding'}
        </span>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="qv-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Etapa</th>
              <th style={{ width: '14%' }}>Fase</th>
              <th style={{ width: '26%' }}>Data do evento</th>
              <th style={{ width: '16%', textAlign: 'right' }}>Δ etapa anterior</th>
              <th style={{ width: '16%', textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.steps.map((entry) => (
              <tr key={entry.step.step}>
                <td style={{ fontWeight: 'var(--fw-medium)' }}>{entry.step.label}</td>
                <td>
                  <span style={S.badge(entry.step.phase === 'pos_onboarding' ? 'pos' : 'onboarding')}>
                    {entry.step.phase === 'pos_onboarding' ? 'Pós' : 'On'}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
                  {formatDate(entry.eventAt)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                  {entry.durationDays != null
                    ? formatDays(entry.durationDays)
                    : <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={S.badge(entry.completedAt ? 'done' : 'pending')}>
                    {entry.completedAt ? 'Concluído' : 'Em andamento'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────────────

export default function PharusJourneyDashboard() {
  const [records, setRecords] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchId, setSearchId] = useState('');
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    const { data, error: fetchError } = await getPharusSupabase()
      .schema('core')
      .from('user_progress')
      .select('id,user_id,step,created_at,completed_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setRecords((data as UserProgress[]) ?? []);
    setLastUpdated(new Date());
    setError(null);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));

    const sb = getPharusSupabase();
    const channel = sb
      .channel('pharus-user-progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'core', table: 'user_progress' },
        () => { fetchData(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          setRealtimeStatus('error');
        }
      });

    return () => { sb.removeChannel(channel); };
  }, [fetchData]);

  const kpis = useMemo(() => computeKpis(records), [records]);
  const funnelData = useMemo(() => getFunnelProgress(records), [records]);
  const currentDistribution = useMemo(() => getCurrentStepDistribution(records), [records]);
  const bottlenecks = useMemo(() => getStepBottlenecks(records), [records]);

  function handleSearch() {
    const id = searchId.trim();
    if (!id) return;
    const history = getClientHistory(records, id);
    if (history.steps.length === 0) {
      setClientHistory(null);
      setSearchNotFound(true);
    } else {
      setClientHistory(history);
      setSearchNotFound(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 120,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 0.6,
            }}
          />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...S.card,
          borderColor: 'var(--color-danger)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-7)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={{ color: 'var(--color-danger)', fontWeight: 'var(--fw-semibold)', margin: 0 }}>
          Erro ao carregar dados
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
          {error}
        </p>
        <button
          className="qv-btn qv-btn--secondary"
          onClick={() => { setError(null); setLoading(true); fetchData().finally(() => setLoading(false)); }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div
        style={{
          ...S.card,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-7)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 32, opacity: 0.4 }}>📭</span>
        <p style={{ color: 'var(--color-text-muted)', fontWeight: 'var(--fw-semibold)', margin: 0 }}>
          Nenhum registro encontrado
        </p>
        <p style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--fs-sm)', margin: 0 }}>
          A tabela <code>core.user_progress</code> está vazia.
        </p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Dashboard header strip */}
      <div
        style={{
          ...S.card,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)', margin: 0, lineHeight: 'var(--lh-tight)' }}>
            Pharus Journey Analytics
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', margin: 'var(--space-1) 0 0' }}>
            Observabilidade da jornada dos clientes no App Pharus
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusDot status={realtimeStatus} />
          {lastUpdated && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)' }}>
              Atualizado {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
        <KpiCard
          label="Total de clientes"
          value={kpis.totalClients}
          highlight
        />
        <KpiCard
          label="Em onboarding"
          value={kpis.onboardingClients}
          sub="etapas 1–5"
        />
        <KpiCard
          label="Em pós-onboarding"
          value={kpis.posOnboardingClients}
          sub="etapas 6–9"
        />
        <KpiCard
          label="Tempo médio / etapa"
          value={kpis.avgDaysBetweenSteps > 0 ? formatDays(kpis.avgDaysBetweenSteps) : '—'}
          sub="entre etapas consecutivas"
        />
        <KpiCard
          label="Maior gargalo"
          value={kpis.biggestBottleneck}
          sub="etapa com maior espera"
        />
      </div>

      {/* Funnel chart + Bottlenecks */}
      <div className="qv-grid">
        {/* Funil de progresso */}
        <div className="qv-col-6 qv-card">
          <h2 style={S.sectionTitle}>Funil de progresso</h2>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)', margin: '-8px 0 var(--space-4)' }}>
            Clientes que chegaram em cada etapa (um mesmo cliente pode aparecer em várias)
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#f47920', display: 'inline-block' }} />
              Onboarding
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#8ab4f8', display: 'inline-block' }} />
              Pós-onboarding
            </span>
          </div>
          <PharusFunnelChart data={funnelData} />
        </div>

        {/* Gargalos atuais */}
        <div className="qv-col-6 qv-card">
          <h2 style={S.sectionTitle}>Gargalos atuais</h2>
          {bottlenecks.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>
              Nenhum cliente parado no momento.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="qv-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Fase</th>
                    <th style={{ textAlign: 'right' }}>Clientes</th>
                    <th style={{ textAlign: 'right' }}>Média</th>
                    <th style={{ textAlign: 'right' }}>Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {bottlenecks.map((row) => (
                    <tr key={row.step.step}>
                      <td style={{ fontWeight: 'var(--fw-medium)' }}>{row.step.label}</td>
                      <td>
                        <span style={S.badge(row.step.phase === 'pos_onboarding' ? 'pos' : 'onboarding')}>
                          {row.step.phase === 'pos_onboarding' ? 'Pós' : 'On'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {row.clientCount}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.avgDays > 7 ? 'var(--color-danger)' : row.avgDays > 3 ? 'var(--color-warning)' : 'var(--color-text)' }}>
                        {formatDays(row.avgDays)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        {formatDays(row.maxDays)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Current distribution */}
      <div className="qv-grid">
        <div className="qv-col-12 qv-card">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            <h2 style={{ ...S.sectionTitle, margin: 0 }}>Distribuição atual da base</h2>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-subtle)' }}>
              1 etapa por cliente · soma = {kpis.totalClients} cliente{kpis.totalClients !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {currentDistribution.map((d) => (
              <div
                key={d.step.step}
                style={{
                  background: 'var(--color-surface-2)',
                  border: `1px solid ${d.count > 0 ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                  minWidth: 140,
                  flex: '1 1 140px',
                  opacity: d.count === 0 ? 0.45 : 1,
                }}
              >
                <p style={{ margin: '0 0 4px', fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
                  {d.step.label}
                </p>
                <p style={{ margin: '0 0 6px', fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', color: d.count > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                  {d.count}
                </p>
                <span style={S.badge(d.step.phase === 'pos_onboarding' ? 'pos' : 'onboarding')}>
                  {d.step.phase === 'pos_onboarding' ? 'Pós' : 'Onboarding'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client search */}
      <div className="qv-col-12 qv-card" style={S.card}>
        <h2 style={S.sectionTitle}>Busca por cliente</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Insira o user_id do cliente"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              minWidth: 240,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px var(--space-4)',
              color: 'var(--color-text)',
              fontSize: 'var(--fs-sm)',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              height: 40,
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          />
          <button
            className="qv-btn qv-btn--primary"
            onClick={handleSearch}
            style={{ height: 40 }}
          >
            Buscar
          </button>
          {(clientHistory || searchNotFound) && (
            <button
              className="qv-btn qv-btn--ghost"
              onClick={() => { setClientHistory(null); setSearchNotFound(false); setSearchId(''); }}
              style={{ height: 40 }}
            >
              Limpar
            </button>
          )}
        </div>

        {searchNotFound && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>
            Nenhum registro encontrado para o ID{' '}
            <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              {searchId}
            </code>
            .
          </p>
        )}

        {clientHistory && (
          <ClientTimeline history={clientHistory} />
        )}

        {!clientHistory && !searchNotFound && (
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--fs-sm)' }}>
            Digite um user_id para ver o histórico completo da jornada.
          </p>
        )}
      </div>
    </div>
  );
}
