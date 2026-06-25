import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { qvCategorical, rechartsTheme } from "../../packages/design-system/charts-theme";
import {
  journeyStages,
  type CompletenessLevel,
  type CustomerJourneyRow,
  type DashboardMetrics,
  type JourneyStage,
} from "../data/pharusJourney";

type DashboardPage = "funil" | "tempo" | "financeiro" | "avaliacao" | "operacional";

const dashboardPages: { id: DashboardPage; label: string }[] = [
  { id: "funil", label: "Funil da Jornada" },
  { id: "tempo", label: "Tempo Médio entre Etapas" },
  { id: "financeiro", label: "Dados Financeiros" },
  { id: "avaliacao", label: "Avaliação das Reuniões" },
  { id: "operacional", label: "Saúde Operacional" },
];

type Filters = {
  startDate: string;
  endDate: string;
  stage: string;
  meetingType: string;
  advisor: string;
  status: string;
  completeness: string;
  search: string;
};

const initialFilters: Filters = {
  startDate: "",
  endDate: "",
  stage: "",
  meetingType: "",
  advisor: "",
  status: "",
  completeness: "",
  search: "",
};

const emptyMetrics: DashboardMetrics = {
  configured: false,
  loadedAt: new Date().toISOString(),
  sourceStatuses: [],
  warnings: [],
  statusValues: [],
  meetingTypes: [],
  filters: {
    stages: [...journeyStages],
    statuses: [],
    meetingTypes: [],
    advisors: [],
    completenessLevels: ["Completo", "Parcial", "Baixo preenchimento", "Sem dados financeiros"],
  },
  customers: [],
  overview: {
    totalCustomers: 0,
    activeCustomers: 0,
    concludedCustomers: 0,
    totalConversion: 0,
    averageTotalDays: null,
    averageTotalBase: 0,
    financialCompletePercent: 0,
  },
  funnel: [],
  conversions: [],
  stageDurations: [],
  financial: {
    completePercent: 0,
    incompletePercent: 0,
    levels: [],
    missingFields: [],
  },
  evaluations: {
    byMeeting: [],
    qualityTags: [],
    smallSample: false,
  },
  operational: {
    alerts: [],
    delayBands: [],
  },
};

const integer = new Intl.NumberFormat("pt-BR");
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const orangePalette = [
  "#7a3d10",
  "var(--color-primary-active)",
  "var(--color-primary-hover)",
  "var(--color-primary)",
  "#ff8f3d",
  "var(--color-primary-soft)",
  "#ffd1a6",
];

function formatDays(value: number | null): string {
  return value === null ? "Sem base" : `${decimal.format(value)} dias`;
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inPeriod(customer: CustomerJourneyRow, filters: Filters): boolean {
  if (!filters.startDate && !filters.endDate) return true;
  if (!customer.lastMovementAt) return false;
  const date = new Date(customer.lastMovementAt);
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function filterCustomers(customers: CustomerJourneyRow[], filters: Filters): CustomerJourneyRow[] {
  return customers.filter((customer) => {
    if (!inPeriod(customer, filters)) return false;
    if (filters.stage && customer.currentStage !== filters.stage) return false;
    if (filters.meetingType && !customer.meetingTypes.includes(filters.meetingType)) return false;
    if (filters.advisor && customer.advisorId !== filters.advisor) return false;
    if (filters.completeness && customer.completenessLevel !== filters.completeness) return false;
    if (filters.status && customer.scheduleStatus !== filters.status) return false;
    if (filters.search && !customer.maskedId.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function KpiCard({
  label,
  value,
  detail,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
  tone?: "warning" | "danger" | "success";
}) {
  return (
    <article className={`qv-journey-kpi ${highlight ? "qv-journey-kpi--highlight" : ""} ${tone ? `qv-journey-kpi--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`qv-card qv-journey-panel ${className}`}>
      <header className="qv-journey-panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="qv-journey-empty">
      <strong>Sem dados suficientes</strong>
      <span>{message}</span>
    </div>
  );
}

function FunnelChart({ data }: { data: DashboardMetrics["funnel"] }) {
  if (!data.length) return <EmptyState message="Configure a conexão Supabase para carregar o funil." />;
  const chartData = data.map((item) => ({
    ...item,
    label: `${integer.format(item.count)} · ${percent.format(item.totalPercent)}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 16, right: 72, left: 64, bottom: 8 }}>
        <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} horizontal={false} />
        <XAxis type="number" allowDecimals={false} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <YAxis type="category" dataKey="stage" width={172} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip
          formatter={(value, name, props) => [
            `${integer.format(Number(value))} clientes · ${percent.format(props.payload.totalPercent)} do total`,
            "Quantidade",
          ]}
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "var(--color-primary-tint)" }}
        />
        <Bar dataKey="count" name="Clientes" radius={[0, 4, 4, 0]} minPointSize={(value: number) => (value > 0 ? 8 : 0)} maxBarSize={34}>
          {data.map((item, index) => (
            <Cell key={item.stage} fill={orangePalette[index % orangePalette.length]} />
          ))}
          <LabelList dataKey="label" position="right" fill="var(--color-text)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HorizontalBars({
  data,
  dataKey,
  nameKey,
  formatter = (value: number) => integer.format(value),
  emptyMessage,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  formatter?: (value: number) => string;
  emptyMessage: string;
}) {
  if (!data.some((item) => Number(item[dataKey] ?? 0) > 0)) return <EmptyState message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 16, right: 76, left: 48, bottom: 8 }}>
        <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} horizontal={false} />
        <XAxis type="number" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <YAxis type="category" dataKey={nameKey} width={156} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip
          formatter={(value) => [formatter(Number(value)), "Valor"]}
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "var(--color-primary-tint)" }}
        />
        <Bar dataKey={dataKey} name="Valor" fill={qvCategorical[0]} radius={[0, 4, 4, 0]} maxBarSize={28} minPointSize={(value: number) => (value > 0 ? 8 : 0)}>
          <LabelList dataKey={dataKey} position="right" fill="var(--color-text)" fontSize={12} formatter={formatter} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StageColumnChart({ data }: { data: { stage: string; count: number }[] }) {
  if (!data.some((item) => item.count > 0)) return <EmptyState message="Nenhum cliente passou pelos filtros atuais." />;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 28, right: 24, left: 0, bottom: 64 }}>
        <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} vertical={false} />
        <XAxis
          dataKey="stage"
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={72}
        />
        <YAxis allowDecimals={false} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip
          formatter={(value) => [integer.format(Number(value)), "Clientes"]}
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "var(--color-primary-tint)" }}
        />
        <Bar dataKey="count" name="Clientes" radius={[4, 4, 0, 0]} maxBarSize={52} fill="var(--color-primary)">
          <LabelList dataKey="count" position="top" fill="var(--color-text)" fontSize={12} formatter={(value: number) => integer.format(value)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function CustomerJourneyDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [activePage, setActivePage] = useState<DashboardPage>("funil");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pharus-journey?ts=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        const details = payload.details ? ` Detalhe: ${payload.details}` : "";
        throw new Error(`${payload.error ?? "Falha ao carregar dados."}${details}`);
      }
      setMetrics(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredCustomers = useMemo(() => filterCustomers(metrics.customers, filters), [metrics.customers, filters]);
  const visibleStageCounts = useMemo(
    () =>
      journeyStages.map((stage) => ({
        stage,
        count: filteredCustomers.filter((customer) => customer.currentStage === stage).length,
      })),
    [filteredCustomers],
  );
  const visibleDelayBands = useMemo(
    () =>
      ["0 a 7 dias", "8 a 15 dias", "16 a 30 dias", "Mais de 30 dias"].map((band) => ({
        band,
        count: filteredCustomers.filter((customer) => customer.delayBand === band).length,
      })),
    [filteredCustomers],
  );

  const tableRows = filteredCustomers
    .slice()
    .sort((a, b) => (b.daysStopped ?? -1) - (a.daysStopped ?? -1))
    .slice(0, 30);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="qv-journey-dashboard">
      <section className="qv-journey-hero">
        <div>
          <span className="qv-journey-eyebrow">Pharus · Jornada do cliente</span>
          <h1>Dashboard Jornada do Cliente</h1>
          <p>Acompanhamento operacional da jornada, reuniões, completude financeira e saúde de avanço.</p>
        </div>
        <div className="qv-journey-hero__actions">
          <span className={loading ? "qv-journey-status qv-journey-status--loading" : "qv-journey-status"}>
            {loading ? "Atualizando dados" : `Última atualização ${formatUpdated(metrics.loadedAt)}`}
          </span>
          <button className="qv-btn qv-btn--secondary" type="button" onClick={() => void refresh()} disabled={loading}>
            Atualizar
          </button>
        </div>
      </section>

      {error && <div className="qv-journey-error">{error}</div>}

      <section className="qv-card qv-journey-filters" aria-label="Filtros globais">
        <div className="qv-journey-section-heading">
          <div>
            <h2>Filtros globais</h2>
            <p>Filtros aplicados principalmente à tabela operacional e à distribuição por etapa.</p>
          </div>
          <button className="qv-btn qv-btn--ghost" type="button" onClick={() => setFilters(initialFilters)}>
            Limpar filtros
          </button>
        </div>
        <div className="qv-journey-filter-grid">
          <label>
            <span>Período inicial</span>
            <input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} />
          </label>
          <label>
            <span>Período final</span>
            <input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} />
          </label>
          <label>
            <span>Etapa atual</span>
            <select value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}>
              <option value="">Todas</option>
              {metrics.filters.stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>
          <label>
            <span>Tipo de reunião</span>
            <select value={filters.meetingType} onChange={(event) => updateFilter("meetingType", event.target.value)} disabled={!metrics.filters.meetingTypes.length}>
              <option value="">Todos visíveis</option>
              {metrics.filters.meetingTypes.map((meeting) => <option key={meeting} value={meeting}>{meeting}</option>)}
            </select>
          </label>
          <label>
            <span>Consultor responsável</span>
            <select value={filters.advisor} onChange={(event) => updateFilter("advisor", event.target.value)} disabled={!metrics.filters.advisors.length}>
              <option value="">Todos visíveis</option>
              {metrics.filters.advisors.map((advisor) => <option key={advisor} value={advisor}>{advisor}</option>)}
            </select>
          </label>
          <label>
            <span>Status da reunião</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Todos</option>
              {["Agendado", "Sem agenda futura", "Sem agendamento visível", ...metrics.filters.statuses].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Completude financeira</span>
            <select value={filters.completeness} onChange={(event) => updateFilter("completeness", event.target.value)}>
              <option value="">Todos</option>
              {metrics.filters.completenessLevels.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label>
            <span>Buscar ID mascarado</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="cli-..." />
          </label>
        </div>
      </section>

      <nav className="qv-card qv-journey-tabs" aria-label="Páginas do dashboard">
        {dashboardPages.map((page) => (
          <button
            key={page.id}
            className={activePage === page.id ? "qv-journey-tab qv-journey-tab--active" : "qv-journey-tab"}
            type="button"
            onClick={() => setActivePage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      {activePage === "funil" && <section className="qv-journey-kpi-grid" aria-label="Visão geral">
        <KpiCard label="Clientes cadastrados" value={integer.format(metrics.overview.totalCustomers)} detail={`${integer.format(filteredCustomers.length)} após filtros`} highlight />
        <KpiCard label="Clientes em jornada" value={integer.format(metrics.overview.activeCustomers)} detail="Não concluídos" />
        <KpiCard label="Clientes concluídos" value={integer.format(metrics.overview.concludedCustomers)} detail={percent.format(metrics.overview.totalConversion)} tone="success" />
        <KpiCard label="Tempo médio total" value={formatDays(metrics.overview.averageTotalDays)} detail={`Base: ${integer.format(metrics.overview.averageTotalBase)} clientes`} />
        <KpiCard label="Dados financeiros completos" value={percent.format(metrics.overview.financialCompletePercent)} detail="Score ≥ 80%" tone="warning" />
      </section>}

      {activePage === "funil" && <div className="qv-journey-grid">
        <Panel title="Funil da Jornada" subtitle="Quantidade, percentual do total e conversão entre etapas" className="qv-journey-span-12">
          <FunnelChart data={metrics.funnel} />
        </Panel>
        <Panel title="Etapa Atual do Cliente" subtitle="Distribuição dos clientes visíveis após filtros" className="qv-journey-span-12">
          <StageColumnChart data={visibleStageCounts} />
        </Panel>
      </div>}

      {activePage === "funil" && <section className="qv-journey-conversion-grid">
        {metrics.conversions.map((conversion) => (
          <article className="qv-card qv-journey-conversion" key={conversion.label}>
            <span>{conversion.label}</span>
            <strong>{percent.format(conversion.to / Math.max(1, metrics.overview.totalCustomers))}</strong>
            <small>{integer.format(conversion.to)} de {integer.format(metrics.overview.totalCustomers)} clientes</small>
          </article>
        ))}
      </section>}

      {activePage === "tempo" && <div className="qv-journey-grid">
        <Panel title="Tempo Médio entre Etapas" subtitle="Considera apenas clientes com as duas datas necessárias" className="qv-journey-span-12">
          <div className="qv-journey-duration-cards">
            {metrics.stageDurations.map((duration) => (
              <KpiCard
                key={duration.label}
                label={duration.label}
                value={formatDays(duration.averageDays)}
                detail={`Base: ${integer.format(duration.base)} clientes`}
              />
            ))}
          </div>
        </Panel>
      </div>}

      {activePage === "financeiro" && <div className="qv-journey-grid">
        <Panel title="Dados Financeiros" subtitle="Score por cliente: renda, reserva, aporte, transações, contas, patrimônio e dívidas" className="qv-journey-span-12">
          <div className="qv-journey-financial-cards">
            <KpiCard label="Clientes completos" value={percent.format(metrics.financial.completePercent)} detail="80% ou mais dos blocos" highlight />
            <KpiCard label="Clientes incompletos" value={percent.format(metrics.financial.incompletePercent)} detail="Abaixo de 80%" tone="warning" />
            {metrics.financial.levels.map((level) => (
              <KpiCard
                key={level.level}
                label={level.level}
                value={integer.format(level.count)}
                detail={percent.format(level.percent)}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Campos financeiros mais faltantes" subtitle="Ordenado do maior vazio para o menor" className="qv-journey-span-12">
          <HorizontalBars
            data={metrics.financial.missingFields.map((field) => ({
              field: field.available ? field.field : `${field.field} · sem leitura`,
              missing: field.missing,
            }))}
            dataKey="missing"
            nameKey="field"
            emptyMessage="Sem base financeira disponível para calcular campos faltantes."
          />
        </Panel>
      </div>}

      {activePage === "avaliacao" && <div className="qv-journey-grid">
        <Panel title="Avaliação das Reuniões" subtitle="Notas médias por tipo de reunião e quantidade de avaliações" className="qv-journey-span-8">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={metrics.evaluations.byMeeting.map((meeting) => ({
                ...meeting,
                label: meeting.averageStars
                  ? `${decimal.format(meeting.averageStars)} · ${integer.format(meeting.count)} aval.`
                  : "Sem avaliações",
              }))}
              layout="vertical"
              margin={{ top: 16, right: 72, left: 48, bottom: 8 }}
            >
              <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} horizontal={false} />
              <XAxis type="number" domain={[0, 5]} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
              <YAxis type="category" dataKey="meetingType" width={172} stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
              <Tooltip contentStyle={rechartsTheme.tooltip.contentStyle} labelStyle={rechartsTheme.tooltip.labelStyle} cursor={{ fill: "var(--color-primary-tint)" }} />
              <Legend wrapperStyle={rechartsTheme.legend.wrapperStyle} />
              <Bar dataKey="averageStars" name="Nota média" fill={qvCategorical[0]} radius={[0, 4, 4, 0]} maxBarSize={30}>
                <LabelList dataKey="label" position="right" fill="var(--color-text)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Feedbacks e dimensões" className="qv-journey-span-4">
          <div className="qv-journey-feedback-list">
            {metrics.evaluations.qualityTags.length ? metrics.evaluations.qualityTags.map((tag) => (
              <div key={tag.label}>
                <span className={tag.sentiment === "positive" ? "qv-badge qv-badge--success" : "qv-badge qv-badge--danger"}>
                  {tag.sentiment === "positive" ? "Positivo" : "Atenção"}
                </span>
                <strong>{tag.label}</strong>
                <small>{integer.format(tag.count)} menções</small>
              </div>
            )) : <EmptyState message="Nenhuma dimensão de feedback está visível para a chave pública atual." />}
          </div>
        </Panel>
      </div>}

      {activePage === "operacional" && <section className="qv-journey-alert-grid">
        {metrics.operational.alerts.map((alert) => (
          <KpiCard
            key={alert.label}
            label={alert.label}
            value={integer.format(alert.value)}
            detail={alert.detail}
            tone={alert.value > 0 ? "warning" : "success"}
          />
        ))}
      </section>}

      {activePage === "operacional" && <div className="qv-journey-grid">
        <Panel title="Faixas de atraso" subtitle="Clientes não concluídos por dias desde o último avanço" className="qv-journey-span-12">
          <HorizontalBars data={visibleDelayBands} dataKey="count" nameKey="band" emptyMessage="Nenhum cliente parado nos filtros atuais." />
        </Panel>
        <Panel title="Tabela operacional de acompanhamento" className="qv-journey-span-12">
          <div className="qv-journey-table-wrap">
            <table className="qv-table qv-journey-table">
              <thead>
                <tr>
                  <th>Nome do cliente</th>
                  <th>Etapa atual</th>
                  <th>Data última movimentação</th>
                  <th>Dias parados</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.customerName}</td>
                    <td>{customer.currentStage}</td>
                    <td>{customer.lastMovementAt ? new Date(customer.lastMovementAt).toLocaleDateString("pt-BR") : "Sem movimentação"}</td>
                    <td>{customer.daysStopped === null ? "—" : decimal.format(customer.daysStopped)}</td>
                  </tr>
                ))}
                {!tableRows.length && (
                  <tr>
                    <td colSpan={4}>Nenhum cliente encontrado para os filtros atuais.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>}

      <style>{`
        .qv-journey-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .qv-journey-hero,
        .qv-journey-section-heading,
        .qv-journey-panel__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
        }
        .qv-journey-hero h1 {
          margin: var(--space-1) 0 var(--space-2);
          font-size: var(--fs-2xl);
          line-height: var(--lh-tight);
        }
        .qv-journey-hero p,
        .qv-journey-section-heading p,
        .qv-journey-panel__header p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
        }
        .qv-journey-eyebrow {
          color: var(--color-primary);
          font-size: var(--fs-xs);
          font-weight: var(--fw-semibold);
          text-transform: uppercase;
        }
        .qv-journey-hero__actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .qv-journey-status {
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
        }
        .qv-journey-status--loading {
          color: var(--color-warning);
        }
        .qv-journey-error,
        .qv-journey-note {
          border-left: 3px solid var(--color-warning);
          background: var(--color-warning-soft);
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
          padding: var(--space-3);
        }
        .qv-journey-filters {
          padding: var(--space-5);
        }
        .qv-journey-section-heading {
          margin-bottom: var(--space-4);
        }
        .qv-journey-section-heading h2,
        .qv-journey-panel__header h2 {
          margin: 0;
          font-size: var(--fs-lg);
        }
        .qv-journey-filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .qv-journey-filter-grid label {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
          font-weight: var(--fw-medium);
        }
        .qv-journey-filter-grid input,
        .qv-journey-filter-grid select {
          min-height: 40px;
          border: 1px solid var(--color-border-strong);
          border-radius: var(--radius-md);
          background: var(--color-surface-2);
          color: var(--color-text);
          font: inherit;
          padding: 0 var(--space-3);
        }
        .qv-journey-filter-grid input:disabled,
        .qv-journey-filter-grid select:disabled {
          color: var(--color-text-subtle);
          cursor: not-allowed;
          opacity: 0.7;
        }
        .qv-journey-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          padding: var(--space-3);
        }
        .qv-journey-tab {
          min-height: 40px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface-2);
          color: var(--color-text-muted);
          cursor: pointer;
          font: inherit;
          font-size: var(--fs-sm);
          font-weight: var(--fw-semibold);
          padding: 0 var(--space-4);
        }
        .qv-journey-tab--active {
          border-color: var(--color-primary);
          background: var(--color-primary-tint);
          color: var(--color-text);
        }
        .qv-journey-kpi-grid,
        .qv-journey-alert-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .qv-journey-alert-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
        .qv-journey-kpi {
          display: grid;
          grid-template-rows: minmax(34px, auto) minmax(34px, auto) minmax(32px, auto);
          align-content: start;
          min-width: 0;
          min-height: 150px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          padding: var(--space-4);
        }
        .qv-journey-kpi--highlight {
          border-color: var(--color-primary);
          background: var(--color-primary-tint);
        }
        .qv-journey-kpi span {
          display: block;
          min-height: 34px;
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
          line-height: var(--lh-normal);
        }
        .qv-journey-kpi strong {
          display: block;
          margin-top: var(--space-2);
          overflow: hidden;
          color: var(--color-text);
          font-size: var(--fs-xl);
          line-height: var(--lh-tight);
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .qv-journey-kpi--highlight strong {
          color: var(--color-primary);
        }
        .qv-journey-kpi--warning strong { color: var(--color-warning); }
        .qv-journey-kpi--danger strong { color: var(--color-danger); }
        .qv-journey-kpi--success strong { color: var(--color-success); }
        .qv-journey-kpi small {
          display: block;
          min-height: 32px;
          margin-top: var(--space-2);
          color: var(--color-text-subtle);
          font-size: var(--fs-xs);
        }
        .qv-journey-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: var(--space-5);
        }
        .qv-journey-span-4 { grid-column: span 4; }
        .qv-journey-span-5 { grid-column: span 5; }
        .qv-journey-span-6 { grid-column: span 6; }
        .qv-journey-span-7 { grid-column: span 7; }
        .qv-journey-span-8 { grid-column: span 8; }
        .qv-journey-span-9 { grid-column: span 9; }
        .qv-journey-span-12 { grid-column: span 12; }
        .qv-journey-panel {
          min-width: 0;
          overflow: hidden;
        }
        .qv-journey-conversion-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(170px, 1fr));
          gap: var(--space-4);
        }
        .qv-journey-conversion {
          display: grid;
          grid-template-rows: minmax(42px, auto) 34px 20px;
          align-items: start;
          padding: var(--space-4);
        }
        .qv-journey-conversion span,
        .qv-journey-conversion small {
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
        }
        .qv-journey-conversion span {
          line-height: 1.45;
        }
        .qv-journey-conversion strong {
          display: block;
          margin: 0;
          color: var(--color-primary);
          font-size: var(--fs-xl);
          line-height: 1;
        }
        .qv-journey-conversion small {
          align-self: end;
          line-height: 1.35;
        }
        .qv-journey-duration-cards,
        .qv-journey-mini-kpis {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .qv-journey-financial-cards {
          display: grid;
          grid-template-columns: repeat(6, minmax(140px, 1fr));
          gap: var(--space-4);
        }
        .qv-journey-duration-cards {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .qv-journey-mini-kpis--stack {
          grid-template-columns: 1fr;
        }
        .qv-journey-feedback-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .qv-journey-feedback-list > div {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: var(--space-3);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--space-3);
        }
        .qv-journey-feedback-list strong {
          font-size: var(--fs-sm);
          text-transform: capitalize;
        }
        .qv-journey-feedback-list small {
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
        }
        .qv-journey-empty {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          border: 1px dashed var(--color-border-strong);
          border-radius: var(--radius-md);
          color: var(--color-text-muted);
          text-align: center;
        }
        .qv-journey-empty strong {
          color: var(--color-text);
        }
        .qv-journey-empty span {
          max-width: 360px;
          font-size: var(--fs-sm);
        }
        .qv-journey-table-wrap {
          overflow-x: auto;
        }
        .qv-journey-table {
          min-width: 720px;
        }
        .qv-journey-table td:nth-child(4),
        .qv-journey-table th:nth-child(4) {
          text-align: right;
        }
        .qv-dot {
          width: 9px;
          height: 9px;
          flex: 0 0 auto;
          border-radius: var(--radius-full);
          margin-top: var(--space-1);
          background: var(--color-text-subtle);
        }
        .qv-dot--success { background: var(--color-success); }
        .qv-dot--warning { background: var(--color-warning); }
        button:disabled {
          cursor: wait;
          opacity: 0.65;
        }
        @media (max-width: 1120px) {
          .qv-journey-kpi-grid,
          .qv-journey-alert-grid,
          .qv-journey-conversion-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .qv-journey-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .qv-journey-span-4,
          .qv-journey-span-5,
          .qv-journey-span-6,
          .qv-journey-span-7,
          .qv-journey-span-8,
          .qv-journey-span-9,
          .qv-journey-span-12 {
            grid-column: span 12;
          }
          .qv-journey-duration-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .qv-journey-financial-cards {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 680px) {
          .qv-journey-hero,
          .qv-journey-section-heading {
            flex-direction: column;
          }
          .qv-journey-hero__actions {
            width: 100%;
            justify-content: space-between;
          }
          .qv-journey-kpi-grid,
          .qv-journey-alert-grid,
          .qv-journey-conversion-grid,
          .qv-journey-filter-grid,
          .qv-journey-duration-cards,
          .qv-journey-mini-kpis,
          .qv-journey-financial-cards {
            grid-template-columns: 1fr;
          }
          .qv-journey-hero h1 {
            font-size: var(--fs-xl);
          }
        }
      `}</style>
    </div>
  );
}
