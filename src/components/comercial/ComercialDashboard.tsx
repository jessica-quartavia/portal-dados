import { useCallback, useEffect, useMemo, useState } from 'react';
import './comercial-dashboard.css';
import { fetchComercialDashboard } from '../../lib/comercial';
import { emptyComercialData } from '../../lib/comercial/mockData';
import type {
  ComercialDashboardData,
  ComercialPreset,
  ComercialTab,
} from '../../types/comercial';
import BarList from './BarList';
import DailyIncomeChart from './DailyIncomeChart';
import MeetingsTable from './MeetingsTable';
import MetricCard from './MetricCard';

const REFRESH_INTERVAL_MS = 30_000;

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

function presetRange(preset: ComercialPreset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'yesterday') return { start: addDays(today, -1), end: today };
  if (preset === '7d') return { start: addDays(today, -6), end: addDays(today, 1) };
  if (preset === '30d') return { start: addDays(today, -29), end: addDays(today, 1) };
  if (preset === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: addDays(today, 1) };
  }
  return { start: today, end: addDays(today, 1) };
}

function formatTime(date?: Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ComercialDashboard() {
  const [preset, setPreset] = useState<ComercialPreset>('today');
  const initialRange = useMemo(() => presetRange('today'), []);
  const [startDate, setStartDate] = useState(toInputDate(initialRange.start));
  const [endDate, setEndDate] = useState(toInputDate(addDays(initialRange.end, -1)));
  const [data, setData] = useState<ComercialDashboardData>(emptyComercialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [lastConsultedAt, setLastConsultedAt] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<ComercialTab>('dashboard');
  const [validationIndicator, setValidationIndicator] = useState('Todos');

  useEffect(() => {
    if (preset === 'custom') return;
    const range = presetRange(preset);
    setStartDate(toInputDate(range.start));
    setEndDate(toInputDate(addDays(range.end, -1)));
  }, [preset]);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetchComercialDashboard({ start: startDate, end: endDate });
      setData(result.data);
      setPendingConnection(result.pendingConnection);
      setError(result.error);
      setInfo(result.info);
    } catch (e) {
      setData(emptyComercialData());
      setPendingConnection(false);
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados.');
      setInfo(null);
    } finally {
      const consultedAt = new Date();
      setLastConsultedAt(consultedAt);
      setNextRefreshAt(new Date(consultedAt.getTime() + REFRESH_INTERVAL_MS));
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load(false);
    const timer = window.setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const validationIndicators = useMemo(() => {
    const indicators = Array.from(new Set(data.validationRows.map((row) => row.indicador)));
    return ['Todos', ...indicators];
  }, [data.validationRows]);

  const filteredValidationRows = useMemo(() => {
    if (validationIndicator === 'Todos') return data.validationRows;
    return data.validationRows.filter((row) => row.indicador === validationIndicator);
  }, [data.validationRows, validationIndicator]);

  return (
    <main className="comercial-shell">
      <header className="comercial-topbar">
        <div>
          <p className="comercial-eyebrow">QV Comercial</p>
          <h1>Dashboard — Agendamentos</h1>
        </div>
        <div className="comercial-refresh">
          <span className="comercial-live-pill">
            <span className="comercial-live-dot" />
            {loading || refreshing ? 'Atualizando' : `Atualizado em ${formatTime(lastConsultedAt)}`}
          </span>
          <span className="comercial-next-refresh">Próxima {formatTime(nextRefreshAt)}</span>
        </div>
      </header>

      {pendingConnection && info && (
        <div className="comercial-notice" role="status">
          {info}
        </div>
      )}

      {error && (
        <div className="comercial-notice comercial-notice--error" role="alert">
          {error}
        </div>
      )}

      {!pendingConnection && !error && info && (
        <div className="comercial-notice" role="status">
          {info}
        </div>
      )}

      <section className="comercial-filters" aria-label="Filtros do dashboard">
        <label>
          Período
          <select value={preset} onChange={(e) => setPreset(e.target.value as ComercialPreset)}>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Mês atual</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <label>
          Data inicial
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPreset('custom');
              setStartDate(e.target.value);
            }}
          />
        </label>
        <label>
          Data final
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPreset('custom');
              setEndDate(e.target.value);
            }}
          />
        </label>
      </section>

      <nav className="comercial-tabs" aria-label="Abas do dashboard">
        <button
          type="button"
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={activeTab === 'validation' ? 'active' : ''}
          onClick={() => setActiveTab('validation')}
        >
          Validação dos Dados
        </button>
      </nav>

      {activeTab === 'dashboard' ? (
        <>
          <section className="comercial-kpi-grid" aria-live="polite">
            <MetricCard
              title="Reuniões Agendadas"
              value={data.metrics.reunioesAgendadas}
              loading={loading}
            />
            <MetricCard
              title="Reuniões Realizadas"
              value={data.metrics.reunioesRealizadas}
              loading={loading}
              tone="success"
            />
            <MetricCard
              title="No-show"
              value={data.metrics.noShow}
              loading={loading}
              tone="warning"
            />
            <MetricCard
              title="Reuniões Futuras"
              value={data.metrics.reunioesFuturas}
              loading={loading}
              tone="info"
            />
            <MetricCard
              title="Novos Agendamentos"
              value={data.metrics.novosAgendamentos}
              loading={loading}
            />
          </section>

          <section className="comercial-content-grid">
            <BarList
              title="Tipos de no-show"
              rows={data.noShowTypes}
              loading={loading}
              emptyText="Sem status no período."
            />
            <BarList
              title="Novos agendamentos por renda"
              rows={data.income.map((row) => ({ tipo: row.faixa, quantidade: row.quantidade }))}
              loading={loading}
              emptyText="Sem renda no período."
            />
          </section>

          <DailyIncomeChart rows={data.incomeByDay} loading={loading} />

          <section className="comercial-panel comercial-panel--meetings">
            <MeetingsTable meetings={data.meetings} loading={loading} />
          </section>
        </>
      ) : (
        <section className="comercial-panel">
          <div className="comercial-validation-header">
            <div>
              <h2>Validação dos Dados</h2>
              <p>Registros nominais usados para auditar cards, gráficos e tabelas.</p>
            </div>
            <label>
              Indicador
              <select
                value={validationIndicator}
                onChange={(e) => setValidationIndicator(e.target.value)}
              >
                {validationIndicators.map((indicator) => (
                  <option key={indicator} value={indicator}>
                    {indicator} (
                    {indicator === 'Todos'
                      ? data.validationRows.length
                      : data.validationRows.filter((row) => row.indicador === indicator).length}
                    )
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="comercial-validation-count">
            {filteredValidationRows.length} registros encontrados.
          </p>
          {loading ? (
            <div className="comercial-empty">Carregando…</div>
          ) : filteredValidationRows.length === 0 ? (
            <div className="comercial-empty">Sem registros para validação.</div>
          ) : (
            <div className="comercial-table-wrap">
              <table className="comercial-table comercial-validation-table">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>ID Agenda</th>
                    <th>ID Negócio</th>
                    <th>Nome do Cliente</th>
                    <th>Data da Reunião</th>
                    <th>Criado em</th>
                    <th>Status da Reunião</th>
                    <th>Faixa de Renda</th>
                    <th>Valor/Renda</th>
                    <th>Closer</th>
                    <th>SDR</th>
                    <th>Origem ou Tag</th>
                    <th>Stage/Status Negócio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredValidationRows.map((row, index) => (
                    <tr key={`${row.indicador}-${row.agendamentoId}-${index}`}>
                      <td>{row.indicador}</td>
                      <td>{row.agendamentoId}</td>
                      <td>{row.bitrixDealId}</td>
                      <td>{row.nomeCliente}</td>
                      <td>{formatDateTime(row.dataAgendamento)}</td>
                      <td>{formatDateTime(row.dataCriacao)}</td>
                      <td>{row.statusAgendamento}</td>
                      <td>{row.faixaRenda}</td>
                      <td>{row.valorRenda}</td>
                      <td>{row.nomeCloser}</td>
                      <td>{row.nomeSdr}</td>
                      <td>{row.origemTag}</td>
                      <td>{row.stageStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
