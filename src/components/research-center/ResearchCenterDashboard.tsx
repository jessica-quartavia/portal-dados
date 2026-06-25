import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./ResearchCenterDashboard.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { qvCategorical, rechartsTheme } from "../../../packages/design-system/charts-theme";
import { getResearchCenterSnapshot } from "../../services/researchCenterService";
import { mapEmptySnapshot } from "../../mappers/researchCenterMapper";
import type { DashboardSection, EngineerMetrics, NamedValue, ResearchCenterFilters, ResearchCenterSnapshot, RenewalRow } from "../../types/researchCenter";

const REFRESH_INTERVAL_MS = 120_000;
const initialFilters: ResearchCenterFilters = {
  period: "Ultimos 30 dias",
  startDate: "",
  endDate: "",
  product: "Todos",
  stage: "Todos",
  theme: "Todos",
  engineer: "Todos",
  origin: "Todos",
  status: "Todos",
  cycle: "Todos",
};
const fallbackDb = mapEmptySnapshot("Carregando dados dinamicos do Supabase...");

const navItems: { id: DashboardSection; title: string; icon: IconName }[] = [
  { id: "overview", title: "Visao Geral", icon: "pulse" },
  { id: "nps", title: "NPS", icon: "target" },
  { id: "csat", title: "CSAT", icon: "star" },
  { id: "churn", title: "Cancelamentos", icon: "trend" },
  { id: "feedback", title: "Feedback", icon: "message" },
  { id: "engineers", title: "Engenheiros", icon: "users" },
  { id: "renewal", title: "Renovacao", icon: "cycle" },
];

type IconName = "pulse" | "target" | "star" | "trend" | "message" | "users" | "cycle" | "refresh" | "filter" | "download";

function Icon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" {...common}>
      {name === "pulse" && <path d="M3 12h4l2-6 4 12 2-6h6" />}
      {name === "target" && <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>}
      {name === "star" && <path d="m12 3 2.7 5.5 6.1.9-4.4 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.2 6.1-.9L12 3z" />}
      {name === "trend" && <path d="M4 17 9 12l4 4 7-9M15 7h5v5" />}
      {name === "message" && <path d="M5 6h14v10H8l-3 3V6z" />}
      {name === "users" && <><path d="M16 19c0-2-1.8-3.5-4-3.5S8 17 8 19" /><circle cx="12" cy="9" r="3" /><path d="M4 18c.3-1.5 1.4-2.6 3-3M17 15c1.6.4 2.7 1.5 3 3" /></>}
      {name === "cycle" && <><path d="M20 7a7 7 0 0 0-12-3L5 7" /><path d="M5 3v4h4" /><path d="M4 17a7 7 0 0 0 12 3l3-3" /><path d="M19 21v-4h-4" /></>}
      {name === "refresh" && <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18 9a6 6 0 0 0-10-3L4 10M6 15a6 6 0 0 0 10 3l4-4" /></>}
      {name === "filter" && <path d="M4 6h16M7 12h10M10 18h4" />}
      {name === "download" && <><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" /></>}
    </svg>
  );
}

function SectionHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="rc-section-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="rc-section-actions">{actions}</div>}
    </header>
  );
}

function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <article className="qv-kpi rc-kpi">
      <p className="qv-kpi__label">{metric.label}</p>
      <div className="rc-kpi__row">
        <strong className="qv-kpi__value">{metric.value}</strong>
      </div>
      <small>{metric.detail}</small>
      {typeof metric.progress === "number" && <ProgressBar value={metric.progress} />}
    </article>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="rc-progress" aria-label={`${value}%`}>
      <span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function ChartCard({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`qv-card rc-chart-card ${wide ? "rc-span-12" : ""}`}>
      <header>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="rc-chart-body">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rc-empty">
      <strong>Sem dados para exibir</strong>
      <span>{message}</span>
    </div>
  );
}

function HorizontalBar({ data, suffix = "", decimals = 0, statusColors = false }: { data: NamedValue[]; suffix?: string; decimals?: number; statusColors?: boolean }) {
  if (!data.length) return <EmptyState message="Ajuste os filtros ou conecte uma fonte de dados." />;
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);
  return (
    <div className="rc-hbar-list">
      {data.map((entry, index) => {
        const color = statusColors ? statusColor(entry.value, suffix) : qvCategorical[index % qvCategorical.length];
        return (
          <div className="rc-hbar-row" key={entry.name} title={`${entry.name}: ${Number(entry.value).toFixed(decimals)}${suffix}`}>
            <div className="rc-hbar-label">{entry.name}</div>
            <div className="rc-hbar-track">
              <span className="rc-hbar-fill" style={{ width: `${Math.max(2, (Math.abs(entry.value) / max) * 100)}%`, background: color }} />
              <strong>{Number(entry.value).toFixed(decimals)}{suffix}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerticalBar({ data, suffix = "", decimals = 0 }: { data: NamedValue[]; suffix?: string; decimals?: number }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 24, right: 24, left: 0, bottom: 16 }}>
        <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} vertical={false} />
        <XAxis dataKey="name" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} interval={0} />
        <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(decimals)}${suffix}`} {...rechartsTheme.tooltip} />
        <Bar dataKey="value" fill={qvCategorical[0]} radius={[8, 8, 0, 0]}>
          <LabelList dataKey="value" position="top" formatter={(value: number) => `${Number(value).toFixed(decimals)}${suffix}`} fill="var(--color-text)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ data }: { data: NamedValue[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!data.length || total <= 0) return <EmptyState message="Sem dados para montar a distribuicao." />;
  return (
    <div className="rc-donut-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip formatter={(value, name) => [`${value} (${Math.round((Number(value) / total) * 100)}%)`, name]} {...rechartsTheme.tooltip} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={104} paddingAngle={3} label={({ value }) => `${Math.round((Number(value) / total) * 100)}%`}>
            {data.map((entry, index) => <Cell key={entry.name} fill={qvCategorical[index % qvCategorical.length]} />)}
          </Pie>
          <Legend {...rechartsTheme.legend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function StackedSentiment({ data }: { data: Array<{ stage: string; positive: number; neutral: number; negative: number }> }) {
  if (!data.length) return <EmptyState message="Sem respostas suficientes para segmentar sentimento por etapa." />;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 24, right: 24, left: 0, bottom: 16 }}>
        <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} vertical={false} />
        <XAxis dataKey="stage" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip {...rechartsTheme.tooltip} />
        <Legend {...rechartsTheme.legend} />
        <Bar dataKey="positive" name="Positivo" stackId="sentiment" fill={qvCategorical[0]} radius={[8, 8, 0, 0]}><LabelList dataKey="positive" position="inside" fill="var(--color-text-on-primary)" fontSize={11} /></Bar>
        <Bar dataKey="neutral" name="Neutro" stackId="sentiment" fill={qvCategorical[2]}><LabelList dataKey="neutral" position="inside" fill="var(--color-bg)" fontSize={11} /></Bar>
        <Bar dataKey="negative" name="Negativo" stackId="sentiment" fill={qvCategorical[6]} radius={[8, 8, 0, 0]}><LabelList dataKey="negative" position="inside" fill="var(--color-text)" fontSize={11} /></Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineTrend({ data, suffix = "", decimals = 0 }: { data: NamedValue[]; suffix?: string; decimals?: number }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 24, right: 28, left: 0, bottom: 16 }}>
        <CartesianGrid stroke={rechartsTheme.grid.stroke} strokeDasharray={rechartsTheme.grid.strokeDasharray} />
        <XAxis dataKey="name" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(decimals)}${suffix}`} {...rechartsTheme.tooltip} />
        <Line type="monotone" dataKey="value" stroke={qvCategorical[0]} strokeWidth={3} dot={{ r: 4, fill: qvCategorical[0] }} activeDot={{ r: 6 }}>
          <LabelList dataKey="value" position="top" formatter={(value: number) => `${Number(value).toFixed(decimals)}${suffix}`} fill="var(--color-text)" fontSize={12} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

function DataTable({ rows }: { rows: ResearchCenterSnapshot["researchRows"] }) {
  if (!rows.length) return <EmptyState message="Sem log qualitativo retornado pela leitura atual." />;
  return (
    <div className="rc-table-wrap">
      <table className="qv-table rc-table">
        <thead><tr><th>Data</th><th>Fonte</th><th>Aprendizado Chave</th><th>Acao Tomada</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={`${row.date}-${row.source}`}><td>{row.date}</td><td>{row.source}</td><td>{row.learning}</td><td>{row.action}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function RankingList({ mode, db }: { mode: "nps" | "csat" | "retention" | "feedback"; db: ResearchCenterSnapshot }) {
  const source = db.nps.byEngineer;
  if (!source.length) return <EmptyState message="Sem base por engenheiro para montar ranking." />;
  const sorted = [...source].sort((a, b) => {
    if (mode === "csat") return b.csat - a.csat;
    if (mode === "retention") return b.retention - a.retention;
    if (mode === "feedback") return b.feedbacks - a.feedbacks;
    return b.nps - a.nps;
  }).slice(0, 10);
  return (
    <div className="rc-ranking">
      {sorted.map((engineer, index) => (
        <article className="rc-ranking-row" key={engineer.name}>
          <span className="rc-rank">{index + 1}</span>
          <div><strong>{engineer.name}</strong><small>{engineer.clients} clientes</small></div>
          <div className="rc-ranking-stats">
            {mode === "nps" && <><span>{engineer.responses} respostas</span><strong>NPS {engineer.nps}</strong><small>P {engineer.promoters} | N {engineer.neutrals} | D {engineer.detractors}</small></>}
            {mode === "csat" && <><span>{engineer.responses} avaliacoes</span><strong>{engineer.csat.toFixed(1)} CSAT</strong><small>{"★".repeat(Math.round(engineer.csat))}</small></>}
            {mode === "retention" && <><span>{Math.round((engineer.churn / 100) * engineer.clients)} cancelamentos</span><strong>{engineer.retention.toFixed(1)}%</strong><small>churn {engineer.churn.toFixed(1)}%</small></>}
            {mode === "feedback" && <><span>{engineer.feedbacks} feedbacks</span><strong>{Math.round((engineer.feedbacks / 689) * 100)}%</strong><small>volume relativo</small></>}
          </div>
        </article>
      ))}
    </div>
  );
}

function FeedbackTable({ db }: { db: ResearchCenterSnapshot }) {
  const rows = db.feedback.rows;
  if (!rows.length) return <EmptyState message="Sem verbatims retornados pela leitura atual." />;
  return (
    <div className="rc-table-wrap rc-table-wrap--feedback">
      <table className="qv-table rc-table rc-feedback-table">
        <thead><tr><th>Data</th><th>Engenheiro</th><th>Cliente</th><th>Tema</th><th>Sentimento</th><th>Feedback</th><th>Acao sugerida</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={`${row.date}-${row.engineer}-${row.theme}-${row.text}`}><td>{row.date}</td><td>{row.engineer}</td><td>{row.client}</td><td>{row.theme}</td><td><span className={`rc-badge rc-badge--${row.sentiment.toLowerCase()}`}>{row.sentiment}</span></td><td>{row.text}</td><td>{row.action}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function EngineerCard({ engineer }: { engineer: EngineerMetrics }) {
  return (
    <article className="qv-card rc-engineer-card">
      <header>
        <span className="rc-avatar">{engineer.initials}</span>
        <div><h3>{engineer.name}</h3><p>{engineer.clients} clientes ativos</p></div>
      </header>
      <span className="rc-badge rc-badge--accent">{engineer.badge}</span>
      <div className="rc-metric-block">
        <div><strong>NPS {engineer.nps}</strong><small>Meta 70+ | P {engineer.promoters} | N {engineer.neutrals} | D {engineer.detractors}</small></div>
        <ProgressBar value={Math.max(0, engineer.nps)} />
      </div>
      <div className="rc-metric-block">
        <div><strong>CSAT {engineer.csat.toFixed(1)}</strong><small>Meta 4.5+</small></div>
        <ProgressBar value={(engineer.csat / 5) * 100} />
      </div>
      <div className="rc-mini-grid">
        <span><small>Feedbacks</small><strong>{engineer.feedbacks}</strong></span>
        <span className={engineer.churn > 4 ? "rc-critical" : "rc-good"}><small>Churn</small><strong>{engineer.churn.toFixed(1)}%</strong></span>
        <span><small>Retencao</small><strong>{engineer.retention.toFixed(1)}%</strong></span>
      </div>
    </article>
  );
}

function statusColor(value: number, suffix: string) {
  if (suffix === "%") {
    if (value > 4) return "var(--color-danger)";
    if (value >= 2.5) return "var(--color-warning)";
    return "var(--color-success)";
  }
  if (value >= 70 || value >= 4.5) return "var(--color-success)";
  if (value >= 50 || value >= 4) return "var(--color-warning)";
  return "var(--color-danger)";
}

function exportRowsCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportFeedbackCsv(db: ResearchCenterSnapshot) {
  const rows = db.feedback.rows;
  const headers = ["data", "engenheiro", "cliente", "tema", "sentimento", "feedback", "acao_sugerida"];
  exportRowsCsv("dashboard-csat-nps-cancelamentos-feedback.csv", headers, rows.map((row) => [row.date, row.engineer, row.client, row.theme, row.sentiment, row.text, row.action]));
}

export default function ResearchCenterDashboard() {
  const [active, setActive] = useState<DashboardSection>("overview");
  const [db, setDb] = useState<ResearchCenterSnapshot>(fallbackDb);
  const [lastSync, setLastSync] = useState(formatSync(fallbackDb.generatedAt));
  const [nextSync, setNextSync] = useState(formatTime(new Date(Date.now() + REFRESH_INTERVAL_MS)));
  const [filters, setFilters] = useState<ResearchCenterFilters>(initialFilters);
  const [tab, setTab] = useState("raw");
  const [isLoading, setIsLoading] = useState(false);

  const filterOptions = db.filterOptions;

  useEffect(() => {
    refresh(filters);
    const interval = window.setInterval(() => refresh(filters), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [filters]);

  async function refresh(currentFilters = filters) {
    setIsLoading(true);
    try {
      const next = await getResearchCenterSnapshot(currentFilters);
      setDb(next);
      setLastSync(formatSync(next.generatedAt));
      setNextSync(formatTime(new Date(Date.now() + REFRESH_INTERVAL_MS)));
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter<Key extends keyof ResearchCenterFilters>(key: Key, value: ResearchCenterFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rc-shell">
      <div className="rc-main">
        <header className="rc-page-head">
          <div className="rc-page-title">
            <span className="rc-pill">Base QV</span>
            <h1>Dashboard CSAT, NPS e Cancelamentos</h1>
            <p>Indicadores de satisfacao, feedbacks, churn e renovacao com leitura dinamica do banco Backup Base QV.</p>
          </div>
          <aside className="rc-update-panel">
            <div className="rc-update-grid">
              <span><small>Ultima atualizacao</small><strong>{lastSync}</strong></span>
              <span><small>Proxima atualizacao</small><strong>{nextSync}</strong></span>
            </div>
            <button className="qv-btn qv-btn--primary" type="button" onClick={() => refresh(filters)} disabled={isLoading}><Icon name="refresh" />Atualizar agora</button>
          </aside>
        </header>

        <section className="qv-card rc-filter-card" aria-label="Filtros do dashboard">
          <label><span>Periodo</span><select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}><option>Ultimos 30 dias</option><option>Ultimos 90 dias</option><option>Este mes</option><option>Personalizado</option><option>Todos</option></select></label>
          <label><span>Data inicio</span><input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} /></label>
          <label><span>Data fim</span><input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} /></label>
          <label><span>Produto</span><select value={filters.product} onChange={(event) => updateFilter("product", event.target.value)}>{filterOptions.products.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Etapa</span><select value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}>{filterOptions.stages.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Tema</span><select value={filters.theme} onChange={(event) => updateFilter("theme", event.target.value)}>{filterOptions.themes.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Engenheiro</span><select value={filters.engineer} onChange={(event) => updateFilter("engineer", event.target.value)}>{filterOptions.engineers.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Origem</span><select value={filters.origin} onChange={(event) => updateFilter("origin", event.target.value)}>{filterOptions.origins.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Status</span><select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>{filterOptions.statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Ciclo</span><select value={filters.cycle} onChange={(event) => updateFilter("cycle", event.target.value)}>{filterOptions.cycles.map((value) => <option key={value}>{value}</option>)}</select></label>
        </section>

        <nav className="rc-horizontal-tabs" aria-label="Secoes do dashboard">
          {navItems.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} type="button" onClick={() => setActive(item.id)}><Icon name={item.icon} />{item.title}</button>)}
        </nav>

        {isLoading && <div className="rc-loading"><span />Atualizando metricas...</div>}

        <main className="rc-content">
          {import.meta.env.DEV && db.warnings.length > 0 && <Warnings warnings={db.warnings} />}
          {active === "overview" && <Overview db={db} tab={tab} setTab={setTab} />}
          {active === "nps" && <Nps db={db} />}
          {active === "csat" && <Csat db={db} />}
          {active === "churn" && <Churn db={db} />}
          {active === "feedback" && <Feedback db={db} tab={tab} setTab={setTab} />}
          {active === "engineers" && <Engineers db={db} />}
          {active === "renewal" && <Renewal db={db} />}
        </main>
      </div>
    </div>
  );
}

function formatSync(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function Warnings({ warnings }: { warnings: string[] }) {
  return <div className="rc-warning">{warnings.slice(0, 3).map((warning) => <span key={warning}>{warning}</span>)}</div>;
}

function Overview({ db, tab, setTab }: { db: ResearchCenterSnapshot; tab: string; setTab: (tab: string) => void }) {
  return (
    <>
      <SectionHeader title="Visao Geral" subtitle="Resumo executivo de satisfacao, feedbacks e cancelamentos" />
      <h2 className="rc-section-kicker">O Pulso - Visao Macro</h2>
      <div className="rc-kpi-grid">{db.overviewKpis.map((metric) => <KpiCard key={metric.label} metric={metric} />)}</div>
      <h2 className="rc-section-kicker">Analise Detalhada</h2>
      <div className="rc-chart-grid">
        <ChartCard title="Top 10 motivos de cancelamento" subtitle="Motivos menores agrupados em Outros"><HorizontalBar data={db.churn.reasons} /></ChartCard>
        <ChartCard title="Sentimento por Etapa da Jornada"><StackedSentiment data={db.feedback.byStage} /></ChartCard>
        <ChartCard title="Dados Qualitativos & Log de Pesquisa" wide>
          <Tabs items={[["raw", "Feedback Bruto"], ["learn", "Log de Aprendizados"]]} active={tab} onChange={setTab} />
          {tab === "raw" ? <FeedbackTable db={db} /> : <DataTable rows={db.researchRows} />}
        </ChartCard>
      </div>
    </>
  );
}

function Nps({ db }: { db: ResearchCenterSnapshot }) {
  const hasNps = db.nps.totalResponses > 0;
  return (
    <>
      <SectionHeader title="Net Promoter Score (NPS)" subtitle="Acompanhe a satisfacao e lealdade dos clientes por engenheiro patrimonial" />
      <div className="rc-kpi-grid">
        <KpiCard metric={{ label: "NPS atual", value: hasNps ? String(db.nps.score) : "-", detail: `${db.nps.totalResponses} respostas no Backup Base QV`, trend: "base real", tone: "neutral" }} />
        <KpiCard metric={{ label: "Total respostas", value: String(db.nps.totalResponses), detail: `De ${db.activeClients} clientes ativos` }} />
        <KpiCard metric={{ label: "Promotores", value: String(db.nps.distribution.find((item) => item.name === "Promotores")?.value ?? 0), detail: "notas 9 e 10" }} />
        <KpiCard metric={{ label: "Neutros", value: String(db.nps.distribution.find((item) => item.name === "Neutros")?.value ?? 0), detail: "notas 7 e 8" }} />
        <KpiCard metric={{ label: "Detratores", value: String(db.nps.distribution.find((item) => item.name === "Detratores")?.value ?? 0), detail: "notas 0 a 6", tone: "negative" }} />
      </div>
      <div className="rc-chart-grid">
        <ChartCard title="NPS por Engenheiro">{hasNps ? <HorizontalBar data={db.nps.byEngineer.map((e) => ({ name: e.name, value: e.nps }))} statusColors /> : <EmptyState message="Nenhuma resposta NPS encontrada no banco." />}</ChartCard>
        <ChartCard title="Distribuicao de Respondentes"><Donut data={db.nps.distribution} /></ChartCard>
        <ChartCard title="Ranking de Engenheiros por NPS"><RankingList mode="nps" db={db} /></ChartCard>
      </div>
    </>
  );
}

function Csat({ db }: { db: ResearchCenterSnapshot }) {
  const hasCsat = db.csat.totalResponses > 0;
  const satisfied = db.csat.ratingDistribution.filter((item) => Number.parseInt(item.name, 10) >= 4).reduce((sum, item) => sum + item.value, 0);
  const neutral = db.csat.ratingDistribution.filter((item) => Number.parseInt(item.name, 10) === 3).reduce((sum, item) => sum + item.value, 0);
  const dissatisfied = db.csat.ratingDistribution.filter((item) => Number.parseInt(item.name, 10) <= 2).reduce((sum, item) => sum + item.value, 0);
  return (
    <>
      <SectionHeader title="Customer Satisfaction (CSAT)" subtitle="Indice de satisfacao do cliente em cada interacao com os engenheiros" />
      <div className="rc-kpi-grid rc-kpi-grid--inline rc-kpi-grid--six">
        <KpiCard metric={{ label: "CSAT medio", value: hasCsat && db.csat.average !== null ? db.csat.average.toFixed(1) : "-", detail: "public.csat_responses" }} />
        <KpiCard metric={{ label: "Total avaliacoes", value: String(db.csat.totalResponses), detail: "registros no banco" }} />
        <KpiCard metric={{ label: "% satisfeitos", value: hasCsat ? `${Math.round((satisfied / db.csat.totalResponses) * 100)}%` : "-", detail: "CSAT 4 e 5" }} />
        <KpiCard metric={{ label: "% neutros", value: hasCsat ? `${Math.round((neutral / db.csat.totalResponses) * 100)}%` : "-", detail: "CSAT 3" }} />
        <KpiCard metric={{ label: "% insatisfeitos", value: hasCsat ? `${Math.round((dissatisfied / db.csat.totalResponses) * 100)}%` : "-", detail: "CSAT 1 e 2", tone: "negative" }} />
      </div>
      {!hasCsat && <EmptyState message="A tabela public.csat_responses esta acessivel, mas nao retornou respostas no periodo/filtro atual." />}
      <div className="rc-chart-grid">
        <ChartCard title="CSAT por Engenheiro">{db.csat.byEngineer.length ? <HorizontalBar data={db.csat.byEngineer} /> : <EmptyState message="Sem respostas CSAT reais por engenheiro." />}</ChartCard>
        <ChartCard title="CSAT por Etapa da Jornada">{db.csat.byStage.length ? <VerticalBar data={db.csat.byStage} /> : <EmptyState message="Sem respostas CSAT reais para segmentar por etapa." />}</ChartCard>
        <ChartCard title="Evolucao do CSAT da Equipe">{db.csat.evolution.length ? <LineTrend data={db.csat.evolution} /> : <EmptyState message="Sem serie historica CSAT no banco." />}</ChartCard>
        <ChartCard title="Ranking de Engenheiros por CSAT">{hasCsat ? <RankingList mode="csat" db={db} /> : <EmptyState message="Sem ranking CSAT para exibir." />}</ChartCard>
      </div>
    </>
  );
}

function Churn({ db }: { db: ResearchCenterSnapshot }) {
  return (
    <>
      <SectionHeader title="Cancelamentos e Churn" subtitle="Acompanhe a taxa de cancelamentos e retencao por engenheiro patrimonial" />
      <div className="rc-kpi-grid">
        <KpiCard metric={{ label: "Cancelamentos no periodo", value: String(db.churn.cancellations30d), detail: "conforme filtros aplicados" }} />
        <KpiCard metric={{ label: "Taxa de Churn", value: `${db.churn.rate.toFixed(1)}%`, detail: "calculada sobre clientes ativos", trend: "base real", tone: "neutral" }} />
        <KpiCard metric={{ label: "Cancelamentos voluntarios", value: String(db.churn.reasons[0]?.value ?? 0), detail: db.churn.reasons[0]?.name ?? "sem motivo principal" }} />
        <KpiCard metric={{ label: "Reembolsos ate 7 dias", value: String(db.churn.statuses.find((item) => item.name.toLowerCase().includes("reembolso"))?.value ?? 0), detail: "status de cancelamento" }} />
        <KpiCard metric={{ label: "Clientes em Risco", value: String(db.nps.distribution.find((item) => item.name === "Detratores")?.value ?? 0), detail: "NPS detrator no banco", tone: "negative" }} />
        <KpiCard metric={{ label: "Renovacoes", value: String(db.renewedClients), detail: "clientes renovados na base" }} />
      </div>
      <div className="rc-chart-grid">
        <ChartCard title="Taxa de Churn por Engenheiro"><HorizontalBar data={db.churn.byEngineer} suffix="%" decimals={1} statusColors /></ChartCard>
        <ChartCard title="Cancelamentos por Status"><Donut data={db.churn.statuses} /></ChartCard>
        <ChartCard title="Principais Motivos de Cancelamento"><HorizontalBar data={db.churn.reasons} /></ChartCard>
        <ChartCard title="Evolucao do Churn">{db.churn.evolution.length ? <LineTrend data={db.churn.evolution} suffix="%" decimals={1} /> : <EmptyState message="Sem serie historica de churn no banco." />}</ChartCard>
        <ChartCard title="Ranking de Engenheiros por Retencao" wide><RankingList mode="retention" db={db} /></ChartCard>
      </div>
    </>
  );
}

function Feedback({ db, tab, setTab }: { db: ResearchCenterSnapshot; tab: string; setTab: (tab: string) => void }) {
  return (
    <>
      <SectionHeader title="Feedback e Verbatims" subtitle="Verbatims dos clientes e analise qualitativa por engenheiro" actions={<><button className="qv-btn qv-btn--secondary"><Icon name="filter" />Filtros</button><button className="qv-btn qv-btn--primary" onClick={() => exportFeedbackCsv(db)}><Icon name="download" />Exportar</button></>} />
      <div className="rc-kpi-grid">
        <KpiCard metric={{ label: "Total Feedbacks", value: String(db.feedback.total), detail: "respostas NPS no banco", trend: "base real", tone: "neutral" }} />
        <KpiCard metric={{ label: "Sentimento Positivo", value: `${Math.round(((db.feedback.sentiment.find((item) => item.name === "Positivo")?.value ?? 0) / Math.max(1, db.feedback.total)) * 100)}%`, detail: `${db.feedback.sentiment.find((item) => item.name === "Positivo")?.value ?? 0} de ${db.feedback.total} feedbacks` }} />
        <KpiCard metric={{ label: "Sentimento Negativo", value: `${Math.round(((db.feedback.sentiment.find((item) => item.name === "Negativo")?.value ?? 0) / Math.max(1, db.feedback.total)) * 100)}%`, detail: `${db.feedback.sentiment.find((item) => item.name === "Negativo")?.value ?? 0} de ${db.feedback.total} feedbacks`, tone: "negative" }} />
        <KpiCard metric={{ label: "Mais Feedbacks", value: String(Math.max(...db.nps.byEngineer.map((item) => item.responses), 0)), detail: db.nps.byEngineer[0]?.name ?? "Sem base" }} />
      </div>
      <div className="rc-chart-grid">
        <ChartCard title="Volume de Feedback por Engenheiro"><HorizontalBar data={db.nps.byEngineer.map((e) => ({ name: e.name, value: e.responses }))} /></ChartCard>
        <ChartCard title="Distribuicao de Sentimento"><Donut data={db.feedback.sentiment} /></ChartCard>
        <ChartCard title="Feedback por Tema" wide><VerticalBar data={db.feedback.byTheme} /></ChartCard>
        <ChartCard title="Feedback por Etapa da Jornada" wide><StackedSentiment data={db.feedback.byStage} /></ChartCard>
        <ChartCard title="Analise inferior" wide>
          <Tabs items={[["ranking", "Ranking por Volume"], ["verbatims", "Verbatims Recentes"], ["critical", "Temas Criticos"], ["actions", "Acoes Sugeridas"]]} active={tab} onChange={setTab} />
          {tab === "verbatims" ? <FeedbackTable db={db} /> : <RankingList mode="feedback" db={db} />}
        </ChartCard>
      </div>
    </>
  );
}

function Engineers({ db }: { db: ResearchCenterSnapshot }) {
  const cards = db.nps.byEngineer;
  const hasCsat = db.csat.totalResponses > 0;
  return (
    <>
      <SectionHeader title="Engenheiros Patrimoniais" subtitle="Visao consolidada da performance de cada engenheiro da equipe" />
      <section className="qv-card rc-team-summary">
        <span><small>Engenheiros</small><strong>{cards.length}</strong></span>
        <span><small>Total Clientes</small><strong>{db.activeClients}</strong></span>
        <span><small>NPS Medio</small><strong>{db.nps.score}</strong></span>
        <span><small>CSAT Medio</small><strong>{hasCsat && db.csat.average !== null ? db.csat.average.toFixed(1) : "Sem base"}</strong></span>
        <span><small>Churn Medio</small><strong>{db.churn.rate.toFixed(1)}%</strong></span>
        <span><small>Renovados</small><strong>{db.renewedClients}</strong></span>
        <span><small>Em risco</small><strong>{db.atRiskClients}</strong></span>
      </section>
      {cards.length ? <div className="rc-engineer-grid">{cards.map((engineer) => <EngineerCard key={engineer.name} engineer={engineer} />)}</div> : <EmptyState message="Sem dados por engenheiro na leitura atual." />}
    </>
  );
}

function Renewal({ db }: { db: ResearchCenterSnapshot }) {
  const [query, setQuery] = useState("");
  const rows = db.renewal.rows.filter((row) => `${row.client} ${row.clientId} ${row.engineer} ${row.origin} ${row.currentStatus}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <SectionHeader title="Renovacao" subtitle="Ciclos e Recorrencia" actions={<button className="qv-btn qv-btn--primary" onClick={() => exportRenewalCsv(rows)}><Icon name="download" />Exportar</button>} />
      <div className="rc-kpi-grid rc-kpi-grid--inline rc-kpi-grid--eight">{db.renewal.kpis.map((metric) => <KpiCard key={metric.label} metric={metric} />)}</div>
      <div className="rc-chart-grid">
        <ChartCard title="Clientes Renovados por Ciclo">{db.renewal.renewedByCycle.length ? <VerticalBar data={db.renewal.renewedByCycle} /> : <EmptyState message="Sem campo de ciclo/renovacao validado na leitura atual." />}</ChartCard>
        <ChartCard title="Origem dos Clientes Renovados">{db.renewal.originOfRenewed.length ? <Donut data={db.renewal.originOfRenewed} /> : <EmptyState message="Origem dos renovados ainda nao identificada." />}</ChartCard>
        <ChartCard title="Status dos Clientes Renovados">{db.renewal.statusOfRenewed.length ? <Donut data={db.renewal.statusOfRenewed} /> : <EmptyState message="Sem renovados para classificar por status." />}</ChartCard>
        <ChartCard title="Cancelamentos por Ciclo">{db.renewal.cancellationsByCycle.length ? <VerticalBar data={db.renewal.cancellationsByCycle} /> : <EmptyState message="Sem cancelamentos com ciclo identificado." />}</ChartCard>
        <ChartCard title="Motivos de Cancelamento dos Renovados"><HorizontalBar data={db.renewal.cancellationReasons} /></ChartCard>
        <ChartCard title="Funil de Renovacao"><FunnelChart data={db.renewal.funnel} /></ChartCard>
        <ChartCard title="Cohort de Renovacao por Ciclo" wide>
          {db.renewal.cohort.length ? <CohortTable rows={db.renewal.cohort} /> : <EmptyState message="Para cohort, validar mes de entrada, ciclo, renovacao e cancelamento por cliente." />}
        </ChartCard>
        <ChartCard title="Tabela Detalhada de Renovacao" wide>
          <div className="rc-table-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, engenheiro, origem ou status" /></div>
          <RenewalTable rows={rows} />
        </ChartCard>
      </div>
    </>
  );
}

function FunnelChart({ data }: { data: ResearchCenterSnapshot["renewal"]["funnel"] }) {
  return (
    <div className="rc-funnel">
      {data.map((item, index) => (
        <div className="rc-funnel-row" key={item.name}>
          <span>{index + 1}</span>
          <div>
            <strong>{item.name}</strong>
            <small>{item.previousRate}% da etapa anterior | {item.baseRate}% da base</small>
          </div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function CohortTable({ rows }: { rows: Array<Record<string, string | number>> }) {
  const columns = Object.keys(rows[0] || {});
  return <div className="rc-table-wrap"><table className="qv-table rc-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div>;
}

function RenewalTable({ rows }: { rows: RenewalRow[] }) {
  return (
    <div className="rc-table-wrap">
      <table className="qv-table rc-table rc-table--wide">
        <thead><tr><th>Cliente</th><th>ID</th><th>Engenheiro</th><th>Origem</th><th>Produto</th><th>Entrada</th><th>Inicio ciclo</th><th>Fim ciclo</th><th>Ciclo</th><th>Renovou?</th><th>Status</th><th>Ativo?</th><th>Cancelou?</th><th>Data cancel.</th><th>Antes ciclo?</th><th>Antes 1o?</th><th>Nao renovou?</th><th>Motivo</th><th>Obs.</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={`${row.clientId}-${row.currentCycle}`}><td>{row.client}</td><td>{row.clientId}</td><td>{row.engineer}</td><td>{row.origin}</td><td>{row.product}</td><td>{row.entryDate}</td><td>{row.currentCycleStart}</td><td>{row.currentCycleEnd}</td><td>{row.currentCycle}</td><td>{row.renewed ? "Sim" : "Nao"}</td><td>{row.currentStatus}</td><td>{row.active ? "Sim" : "Nao"}</td><td>{row.cancelled ? "Sim" : "Nao"}</td><td>{row.cancellationDate}</td><td>{row.cancelledBeforeCycleEnd ? "Sim" : "Nao"}</td><td>{row.cancelledBeforeFirstCycle ? "Sim" : "Nao"}</td><td>{row.reachedCycleEndAndDidNotRenew ? "Sim" : "Nao"}</td><td>{row.cancellationReason}</td><td>{row.notes}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function exportRenewalCsv(rows: RenewalRow[]) {
  const headers = ["cliente", "id", "engenheiro", "origem", "produto", "entrada", "inicio_ciclo", "fim_ciclo", "ciclo", "renovou", "status", "ativo", "cancelou", "data_cancelamento", "cancelou_antes_ciclo", "cancelou_antes_primeiro_ciclo", "fim_ciclo_nao_renovou", "motivo", "observacoes"];
  exportRowsCsv("research-center-renovacao.csv", headers, rows.map((row) => [row.client, row.clientId, row.engineer, row.origin, row.product, row.entryDate, row.currentCycleStart, row.currentCycleEnd, row.currentCycle, row.renewed ? "Sim" : "Nao", row.currentStatus, row.active ? "Sim" : "Nao", row.cancelled ? "Sim" : "Nao", row.cancellationDate, row.cancelledBeforeCycleEnd ? "Sim" : "Nao", row.cancelledBeforeFirstCycle ? "Sim" : "Nao", row.reachedCycleEndAndDidNotRenew ? "Sim" : "Nao", row.cancellationReason, row.notes]));
}

function Tabs({ items, active, onChange }: { items: [string, string][]; active: string; onChange: (tab: string) => void }) {
  return <div className="rc-tabs">{items.map(([id, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => onChange(id)}>{label}</button>)}</div>;
}
