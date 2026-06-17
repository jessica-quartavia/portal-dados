import '../../styles/produtos-dashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  qvCategorical,
  rechartsTheme,
} from '../../../packages/design-system/charts-theme';
import { emptyProdutosMetrics } from '../../lib/produtos/mockData';
import { fetchProdutosMetrics } from '../../lib/produtos';
import type { ProdutosCard, ProdutosMetricResponse, ProdutosTabKey } from '../../types/produtos';

const REFRESH_MS = 120_000;

const tabLabels = {
  clientes: 'Clientes',
  cancelamentos: 'Cancelamentos',
  operacao: 'Operação',
  produto: 'Produto',
} as const;

function formatTime(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function formatValue(card: ProdutosCard) {
  if (card.value === null || card.value === undefined) {
    return card.emptyLabel || '—';
  }
  if (card.format === 'percent') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(card.value);
  }
  if (card.format === 'decimal') {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(card.value);
  }
  if (card.format === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(card.value);
  }
  return new Intl.NumberFormat('pt-BR').format(card.value);
}

function Kpi({ card, highlight = false }: { card: ProdutosCard; highlight?: boolean }) {
  return (
    <div className={`metric-card ${highlight ? 'metric-card--highlight' : ''}`}>
      <span>{card.label}</span>
      <strong>{formatValue(card)}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function TimePill({ label, value }: { label: string; value?: string }) {
  return (
    <div className="time-pill">
      <span>{label}</span>
      <strong>{formatTime(value)}</strong>
    </div>
  );
}

function mergeSeries(
  cancellations: { period: string; value: number }[],
  refunds: { period: string; value: number }[],
) {
  const map = new Map<string, { period: string; cancelamentos: number; reembolsos: number }>();
  for (const item of cancellations) {
    map.set(item.period, { period: item.period, cancelamentos: item.value, reembolsos: 0 });
  }
  for (const item of refunds) {
    const current = map.get(item.period) || {
      period: item.period,
      cancelamentos: 0,
      reembolsos: 0,
    };
    current.reembolsos = item.value;
    map.set(item.period, current);
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export default function ProductOpsDashboard() {
  const [activeTab, setActiveTab] = useState<ProdutosTabKey>('clientes');
  const [reasonView, setReasonView] = useState<'top10' | 'all'>('top10');
  const [data, setData] = useState<ProdutosMetricResponse>(emptyProdutosMetrics);
  const [loading, setLoading] = useState(true);
  const [pendingConnection, setPendingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const dateDefaults = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    };
  }, []);

  const [filters, setFilters] = useState({
    start: dateDefaults.start,
    end: dateDefaults.end,
    program: '',
    cohort: '',
  });

  const loadMetrics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchProdutosMetrics(filters);
      if (signal?.aborted) return;
      setData(result.data);
      setPendingConnection(result.pendingConnection);
      setError(result.error);
      setInfo(result.info);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setData(emptyProdutosMetrics());
      setPendingConnection(false);
      setError(err instanceof Error ? err.message : 'Falha ao carregar métricas.');
      setInfo(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    loadMetrics(controller.signal);
    const id = window.setInterval(() => loadMetrics(), REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [loadMetrics]);

  const currentTab = data.tabs?.[activeTab];
  const churnReasons = data.tabs?.cancelamentos?.charts.churnReasons || [];
  const visibleChurnReasons = reasonView === 'top10' ? churnReasons.slice(0, 10) : churnReasons;

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <span className="qv-badge dashboard-kicker">Base QV</span>
          <h1>Produto, operação e clientes</h1>
          <p>
            Métricas de clientes, cancelamentos, operação e ascensões. Atualização automática a
            cada 2 minutos quando a conexão Supabase estiver ativa.
          </p>
        </div>
        <div className="refresh-panel">
          <TimePill label="Última atualização" value={data.refreshedAt} />
          <TimePill label="Próxima atualização" value={data.nextRefreshAt} />
          <button type="button" className="qv-btn qv-btn--secondary" onClick={() => loadMetrics()}>
            Atualizar agora
          </button>
        </div>
      </section>

      {pendingConnection && info && (
        <div className="warning-box" role="status">
          {info}
        </div>
      )}

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {!pendingConnection &&
        !error &&
        data.warnings?.map((warning) => (
          <div className="warning-box" key={warning}>
            {warning}
          </div>
        ))}
      {loading && <div className="loading-bar">Carregando métricas…</div>}

      <section className="filter-bar">
        <label>
          Início
          <input
            type="date"
            value={filters.start}
            onChange={(e) => setFilters((c) => ({ ...c, start: e.target.value }))}
          />
        </label>
        <label>
          Fim
          <input
            type="date"
            value={filters.end}
            onChange={(e) => setFilters((c) => ({ ...c, end: e.target.value }))}
          />
        </label>
        <label>
          Programa
          <select
            value={filters.program}
            onChange={(e) => setFilters((c) => ({ ...c, program: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="PHARUS">Pharus</option>
            <option value="DAVOS">Davos</option>
          </select>
        </label>
        <label>
          Coorte
          <input
            type="month"
            value={filters.cohort}
            onChange={(e) => setFilters((c) => ({ ...c, cohort: e.target.value }))}
          />
        </label>
      </section>

      <nav className="tabs" aria-label="Categorias do dashboard">
        {(Object.keys(tabLabels) as ProdutosTabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? 'tab tab--active' : 'tab'}
            onClick={() => setActiveTab(key)}
          >
            {tabLabels[key]}
          </button>
        ))}
      </nav>

      {currentTab && (
        <section className="tab-panel">
          <div className="kpi-grid">
            {currentTab.cards.map((card, index) => (
              <Kpi key={card.label} card={card} highlight={index === 0} />
            ))}
          </div>

          {activeTab === 'clientes' && data.tabs?.clientes && (
            <div className="chart-grid">
              <div className="qv-card chart-card">
                <h2>Novos clientes</h2>
                {data.tabs.clientes.charts.newClientsByMonth.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.tabs.clientes.charts.newClientsByMonth}>
                      <CartesianGrid
                        stroke={rechartsTheme.grid.stroke}
                        strokeDasharray={rechartsTheme.grid.strokeDasharray}
                        vertical={false}
                      />
                      <XAxis dataKey="period" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
                      <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} allowDecimals={false} />
                      <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} />
                      <Bar dataKey="value" name="Novos clientes" fill={qvCategorical[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Sem novos clientes no período." />
                )}
              </div>

              <div className="qv-card chart-card">
                <h2>Cancelamentos e reembolsos</h2>
                {mergeSeries(
                  data.tabs.clientes.charts.cancellationsByMonth,
                  data.tabs.clientes.charts.refundsByMonth,
                ).length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={mergeSeries(
                        data.tabs.clientes.charts.cancellationsByMonth,
                        data.tabs.clientes.charts.refundsByMonth,
                      )}
                    >
                      <CartesianGrid
                        stroke={rechartsTheme.grid.stroke}
                        strokeDasharray={rechartsTheme.grid.strokeDasharray}
                        vertical={false}
                      />
                      <XAxis dataKey="period" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
                      <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} allowDecimals={false} />
                      <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} />
                      <Line type="monotone" dataKey="cancelamentos" name="Cancelamentos" stroke={qvCategorical[6]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="reembolsos" name="Reembolsos até 7 dias" stroke={qvCategorical[0]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Sem cancelamentos ou reembolsos no período." />
                )}
              </div>
            </div>
          )}

          {activeTab === 'cancelamentos' && data.tabs?.cancelamentos && (
            <div className="chart-grid">
              <div className="qv-card chart-card">
                <h2>Cancelamentos por mês</h2>
                {data.tabs.cancelamentos.charts.byMonth.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.tabs.cancelamentos.charts.byMonth}>
                      <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} vertical={false} />
                      <XAxis dataKey="period" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
                      <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} allowDecimals={false} />
                      <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} />
                      <Bar dataKey="value" name="Cancelamentos" fill={qvCategorical[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Sem cancelamentos no período." />
                )}
              </div>

              <div className="qv-card chart-card">
                <h2>Cancelamentos por status</h2>
                {data.tabs.cancelamentos.charts.byStatus.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.tabs.cancelamentos.charts.byStatus} layout="vertical" margin={{ left: 28, right: 12 }}>
                      <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} horizontal={false} />
                      <XAxis type="number" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} allowDecimals={false} />
                      <YAxis type="category" dataKey="status" width={150} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
                      <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} />
                      <Bar dataKey="value" name="Registros" fill={qvCategorical[2]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Sem status de cancelamento no período." />
                )}
              </div>

              <div className="qv-card chart-card chart-card--wide">
                <div className="chart-card__header">
                  <h2>Motivos de churn</h2>
                  <div className="reason-toggle" aria-label="Visualização dos motivos de churn">
                    <button
                      type="button"
                      className={reasonView === 'top10' ? 'reason-toggle__button reason-toggle__button--active' : 'reason-toggle__button'}
                      onClick={() => setReasonView('top10')}
                    >
                      Top 10
                    </button>
                    <button
                      type="button"
                      className={reasonView === 'all' ? 'reason-toggle__button reason-toggle__button--active' : 'reason-toggle__button'}
                      onClick={() => setReasonView('all')}
                    >
                      Todos
                    </button>
                  </div>
                </div>
                <div className="reason-summary">
                  <span>
                    Preenchidos
                    <strong>
                      {new Intl.NumberFormat('pt-BR').format(
                        data.tabs.cancelamentos.charts.churnReasonSummary.filled,
                      )}
                    </strong>
                  </span>
                  <span>
                    Não preenchidos
                    <strong>
                      {new Intl.NumberFormat('pt-BR').format(
                        data.tabs.cancelamentos.charts.churnReasonSummary.empty,
                      )}
                    </strong>
                  </span>
                  <span>
                    Preenchimento
                    <strong>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'percent',
                        maximumFractionDigits: 1,
                      }).format(data.tabs.cancelamentos.charts.churnReasonSummary.fillRate)}
                    </strong>
                  </span>
                </div>
                {visibleChurnReasons.length ? (
                  <div className="reason-list">
                    {visibleChurnReasons.map((item, index) => (
                      <div className="reason-row" key={`${item.reason}-${index}`}>
                        <span className="reason-row__rank">{index + 1}</span>
                        <span className="reason-row__text">{item.reason}</span>
                        <strong>{new Intl.NumberFormat('pt-BR').format(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Sem motivos de churn no período." />
                )}
              </div>
            </div>
          )}

          {activeTab === 'operacao' && data.tabs?.operacao && (
            <div className="qv-card chart-card chart-card--wide">
              <h2>Agendado vs comparecido</h2>
              {data.tabs.operacao.charts.meetingSummary.length ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={data.tabs.operacao.charts.meetingSummary}>
                    <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} vertical={false} />
                    <XAxis dataKey="type" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} interval={0} angle={-12} textAnchor="end" height={80} />
                    <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} allowDecimals={false} />
                    <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} />
                    <Bar dataKey="scheduled" name="Agendadas" fill={qvCategorical[2]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="attended" name="Compareceu" fill={qvCategorical[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Sem reuniões no período." />
              )}
            </div>
          )}

          {activeTab === 'produto' && data.tabs?.produto && (
            <div className="qv-card chart-card chart-card--wide">
              <h2>Ascensões para Davos</h2>
              {data.tabs.produto.charts.ascensionsByMonth.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.tabs.produto.charts.ascensionsByMonth}>
                    <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} vertical={false} />
                    <XAxis dataKey="period" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
                    <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} allowDecimals={false} />
                    <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} />
                    <Bar dataKey="value" name="Ascensões" fill={qvCategorical[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Sem ascensões no período." />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
