"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import MetricCard from "./MetricCard";
import BarList from "./BarList";
import DailyIncomeChart from "./DailyIncomeChart";

type DashboardData = {
  metrics: {
    reunioesAgendadas: number;
    novosAgendamentos: number;
    reunioesRealizadas: number;
    reunioesFuturas: number;
    noShow: number;
  };
  noShowTypes: Array<{ tipo: string; quantidade: number }>;
  income: Array<{ faixa: string; quantidade: number }>;
  incomeByDay: Array<{ dia: string; faixa: string; quantidade: number }>;
  meetings: Array<{
    nomeCliente: string;
    nomeCloser: string;
    nomeSdr: string;
    dataAgendamento: string | null;
    statusAgendamento: string;
  }>;
  validationRows: Array<{
    indicador: string;
    agendamentoId: string;
    bitrixDealId: string;
    nomeCliente: string;
    dataAgendamento: string | null;
    dataCriacao: string | null;
    statusAgendamento: string;
    faixaRenda: string;
    nomeCloser: string;
    nomeSdr: string;
    origemTag: string;
    valorRenda: string;
    stageStatus: string;
  }>;
  generatedAt: string;
};

type Preset = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";
type Tab = "dashboard" | "validation";
const REFRESH_INTERVAL_MS = 30000;

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

function presetRange(preset: Preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "yesterday") return { start: addDays(today, -1), end: today };
  if (preset === "7d") return { start: addDays(today, -6), end: addDays(today, 1) };
  if (preset === "30d") return { start: addDays(today, -29), end: addDays(today, 1) };
  if (preset === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: addDays(today, 1) };
  return { start: today, end: addDays(today, 1) };
}

function formatTime(date?: Date | null) {
  if (!date) return "--";
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function DashboardClient() {
  const [preset, setPreset] = useState<Preset>("30d");
  const initialRange = useMemo(() => presetRange("30d"), []);
  const [startDate, setStartDate] = useState(toInputDate(initialRange.start));
  const [endDate, setEndDate] = useState(toInputDate(addDays(initialRange.end, -1)));
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastConsultedAt, setLastConsultedAt] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [validationIndicator, setValidationIndicator] = useState("Todos");

  useEffect(() => {
    if (preset === "custom") return;
    const range = presetRange(preset);
    setStartDate(toInputDate(range.start));
    setEndDate(toInputDate(addDays(range.end, -1)));
  }, [preset]);

  const queryRange = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = addDays(new Date(`${endDate}T00:00:00`), 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [startDate, endDate]);

  const loadData = useCallback(async (isBackground = false) => {
    setError("");
    if (isBackground) setRefreshing(true);
    else setLoading(true);

    const params = new URLSearchParams({
      start: queryRange.start,
      end: queryRange.end
    });

    try {
      const response = await fetch(`/api/dashboard?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        const details = payload.details ? ` Detalhe: ${payload.details}` : "";
        throw new Error(`${payload.error ?? "Falha ao atualizar dados."}${details}`);
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha inesperada.");
    } finally {
      const consultedAt = new Date();
      setLastConsultedAt(consultedAt);
      setNextRefreshAt(new Date(consultedAt.getTime() + REFRESH_INTERVAL_MS));
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryRange]);

  useEffect(() => {
    loadData(false);
    const timer = window.setInterval(() => loadData(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const validationIndicators = useMemo(() => {
    const indicators = Array.from(new Set((data?.validationRows ?? []).map((row) => row.indicador)));
    return ["Todos", ...indicators];
  }, [data?.validationRows]);

  const filteredValidationRows = useMemo(() => {
    const rows = data?.validationRows ?? [];
    if (validationIndicator === "Todos") return rows;
    return rows.filter((row) => row.indicador === validationIndicator);
  }, [data?.validationRows, validationIndicator]);

  return (
    <main className="dashboard-shell" style={{ "--chart-info": "#8ab4f8", "--chart-success": "#3fb950", "--chart-warning": "#f5a623", "--chart-danger": "#e5484d" } as CSSProperties}>
      <header className="topbar">
        <div>
          <p className="eyebrow">QV Comercial</p>
          <h1>Dashboard - Agendamentos</h1>
        </div>
        <div className="refresh-status">
          <span className="live-pill">
            <span className="live-dot" />
            {refreshing ? "Atualizando" : `Atualizado em ${formatTime(lastConsultedAt)}`}
          </span>
          <span className="next-refresh">Proxima {formatTime(nextRefreshAt)}</span>
        </div>
      </header>

      <section className="filters" aria-label="Filtros do dashboard">
        <label>
          Periodo
          <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="month">Mes atual</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <label>
          Data inicial
          <input type="date" value={startDate} onChange={(event) => {
            setPreset("custom");
            setStartDate(event.target.value);
          }} />
        </label>
        <label>
          Data final
          <input type="date" value={endDate} onChange={(event) => {
            setPreset("custom");
            setEndDate(event.target.value);
          }} />
        </label>
      </section>

      {error ? <div className="notice">{error}</div> : null}

      <nav className="dashboard-tabs" aria-label="Abas do dashboard">
        <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button className={activeTab === "validation" ? "active" : ""} onClick={() => setActiveTab("validation")}>Validacao dos Dados</button>
      </nav>

      {activeTab === "dashboard" ? (
        <>
          <section className="kpi-grid" aria-live="polite">
            <MetricCard title="Reunioes Agendadas" value={data?.metrics.reunioesAgendadas} loading={loading} />
            <MetricCard title="Reunioes Realizadas" value={data?.metrics.reunioesRealizadas} loading={loading} tone="success" />
            <MetricCard
              title="No-show"
              value={data?.metrics.noShow}
              loading={loading}
              tone="warning"
            />
            <MetricCard title="Reunioes Futuras" value={data?.metrics.reunioesFuturas} loading={loading} tone="info" />
            <MetricCard title="Novos Agendamentos" value={data?.metrics.novosAgendamentos} loading={loading} />
          </section>

          <section className="content-grid">
            <BarList title="Tipos de no-show" rows={data?.noShowTypes ?? []} loading={loading} emptyText="Sem status no periodo." />
            <BarList title="Novos agendamentos por renda" rows={(data?.income ?? []).map((row) => ({ tipo: row.faixa, quantidade: row.quantidade }))} loading={loading} emptyText="Sem renda no periodo." />
          </section>

          <DailyIncomeChart rows={data?.incomeByDay ?? []} loading={loading} />

          <section className="panel table-panel">
            <div className="panel-header">
              <h2>Reunioes</h2>
            </div>
            {loading ? (
              <div className="empty-state">Carregando...</div>
            ) : !data?.meetings.length ? (
              <div className="empty-state">Sem reunioes no periodo.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome do Cliente</th>
                      <th>Nome do Closer</th>
                      <th>Nome do SDR</th>
                      <th>Data do Agendamento</th>
                      <th>Status do Agendamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.meetings.map((meeting, index) => (
                      <tr key={`${meeting.nomeCliente}-${meeting.dataAgendamento}-${index}`}>
                        <td>{meeting.nomeCliente}</td>
                        <td>{meeting.nomeCloser}</td>
                        <td>{meeting.nomeSdr}</td>
                        <td>{formatDateTime(meeting.dataAgendamento)}</td>
                        <td>{meeting.statusAgendamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="panel table-panel">
          <div className="validation-header">
            <div>
              <h2>Validacao dos Dados</h2>
              <p>Registros nominais usados para auditar cards, graficos e tabelas.</p>
            </div>
            <label>
              Indicador
              <select value={validationIndicator} onChange={(event) => setValidationIndicator(event.target.value)}>
                {validationIndicators.map((indicator) => (
                  <option key={indicator} value={indicator}>
                    {indicator} ({indicator === "Todos"
                      ? data?.validationRows.length ?? 0
                      : data?.validationRows.filter((row) => row.indicador === indicator).length ?? 0})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="validation-count">{filteredValidationRows.length} registros encontrados.</p>
          {loading ? (
            <div className="empty-state">Carregando...</div>
          ) : filteredValidationRows.length === 0 ? (
            <div className="empty-state">Sem registros para validacao.</div>
          ) : (
            <div className="table-wrap">
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>ID Agenda</th>
                    <th>ID Negocio</th>
                    <th>Nome do Cliente</th>
                    <th>Data da Reuniao</th>
                    <th>Criado em</th>
                    <th>Status da Reuniao</th>
                    <th>Faixa de Renda</th>
                    <th>Valor/Renda</th>
                    <th>Closer</th>
                    <th>SDR</th>
                    <th>Origem ou Tag</th>
                    <th>Stage/Status Negocio</th>
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
      <style>{`button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #111 0%, var(--color-bg) 58%);
}

.login-panel {
  width: min(440px, 100%);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--color-surface), #141414);
  box-shadow: var(--shadow);
  padding: 28px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: var(--color-primary);
  display: grid;
  place-items: center;
  color: #151515;
  font-weight: 900;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: 40px;
  line-height: 1.04;
}

h2 {
  margin: 0;
  font-size: 18px;
}

.muted {
  color: var(--color-text-muted);
  line-height: 1.5;
}

.btn {
  min-height: 42px;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  background: var(--color-surface-2);
  color: var(--color-text);
  padding: 9px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn:hover {
  border-color: var(--color-primary);
}

.btn-primary,
.btn-accent {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #141414;
  font-weight: 800;
}

.btn-primary {
  width: 100%;
  margin-top: 14px;
}

.google-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: conic-gradient(#4285f4 0 25%, #34a853 0 50%, #fbbc05 0 75%, #ea4335 0);
  border: 2px solid rgba(255, 255, 255, 0.85);
}

.dashboard-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: 28px;
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.refresh-status {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.next-refresh {
  color: var(--color-text-muted);
  font-size: 13px;
}

.live-pill,
.user-pill {
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-muted);
  padding: 9px 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--chart-success);
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 14px;
  margin-bottom: 16px;
}

label {
  display: grid;
  gap: 7px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
}

select,
input {
  color-scheme: dark;
  width: 100%;
  background: var(--color-surface-2);
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  padding: 9px 10px;
  outline: none;
}

select:focus,
input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.notice {
  border: 1px solid rgba(244, 121, 32, 0.35);
  background: var(--color-primary-soft);
  border-radius: 8px;
  color: #ffd8bd;
  padding: 12px;
  margin-bottom: 16px;
}

.dashboard-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.dashboard-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  padding: 11px 12px;
  font-weight: 800;
}

.dashboard-tabs button.active {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.kpi-card,
.panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.kpi-card {
  min-height: 132px;
  padding: 16px;
  display: grid;
  align-content: space-between;
}

.kpi-card span {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

.kpi-card strong {
  font-size: 38px;
  line-height: 1;
}

.tone-success strong {
  color: var(--chart-success);
}

.tone-warning strong {
  color: var(--chart-warning);
}

.tone-info strong {
  color: var(--chart-info);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 16px;
}

.panel {
  min-height: 320px;
  padding: 16px;
}

.panel-header {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.bar-list {
  display: grid;
  gap: 16px;
}

.bar-row {
  display: grid;
  gap: 8px;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.bar-label strong {
  color: var(--color-text);
}

.bar-track {
  height: 12px;
  border-radius: 999px;
  background: var(--color-surface-2);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  min-width: 2px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), #ffb066);
}

.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: var(--color-text-subtle);
}

.income-day-panel {
  margin-top: 16px;
  min-height: 280px;
}

.daily-income-list {
  display: grid;
  gap: 18px;
}

.daily-income-group {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 16px;
}

.daily-income-group:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.daily-income-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  font-weight: 800;
}

.daily-income-heading strong {
  color: var(--color-text);
}

.table-panel {
  margin-top: 16px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  border-bottom: 1px solid var(--color-border);
  padding: 12px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

td {
  color: var(--color-text);
}

tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.validation-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
  gap: 16px;
  align-items: end;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 14px;
  margin-bottom: 14px;
}

.validation-header p {
  margin: 6px 0 0;
  color: var(--color-text-muted);
}

.validation-count {
  margin: 0 0 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.validation-table {
  min-width: 1500px;
}

@media (max-width: 980px) {
  .topbar {
    display: grid;
  }

  .refresh-status {
    justify-items: stretch;
  }

  .filters,
  .kpi-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .validation-header {
    grid-template-columns: 1fr;
  }

  .btn-accent {
    width: 100%;
  }
}

@media (max-width: 620px) {
  .dashboard-shell {
    padding: 18px;
  }

  .topbar-actions {
    justify-content: stretch;
  }

   .kpi-card strong {
    font-size: 32px;
  }

  h1 {
    font-size: 30px;
  }
}

        .iapmai26-dashboard-styles { display: contents; }
      `}</style>

    </main>
  );
}

