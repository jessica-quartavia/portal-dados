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
import {
  qvCategorical,
  rechartsTheme,
} from "../../packages/design-system/charts-theme";
import { pendingMetrics } from "../data/pendingMetrics";
import {
  AGE_BANDS,
  CONTRIBUTION_BANDS,
  INCOME_BANDS,
  WEALTH_BANDS,
  ageBand,
  contributionBand,
  createDistribution,
  incomeBand,
  wealthBand,
  type DistributionDatum,
  type ProfileRecord,
} from "../data/profileNormalization";
import { loadProfiles, type ProfilesResult } from "../data/supabaseProfiles";

type AudienceFilter = "comparativo" | "qv360" | "infoproduto";
const AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1_000;
const SHOW_DETAILED_ANALYSIS = false;

type Filters = {
  startDate: string;
  endDate: string;
  costName: string;
  origin: string;
  audience: AudienceFilter;
  income: string;
  wealth: string;
  gender: string;
  age: string;
};

const initialFilters: Filters = {
  startDate: "",
  endDate: "",
  costName: "",
  origin: "",
  audience: "comparativo",
  income: "",
  wealth: "",
  gender: "",
  age: "",
};

const emptyProfiles: ProfilesResult = {
  qv360: [],
  infoproduto: [],
  diagnostics: [],
  stats: {
    qvIncomeValid: 0,
    qvIncomeMissing: 0,
    qvContributionValid: 0,
    qvContributionMissing: 0,
    leadRaw: 0,
    leadValid: 0,
    leadRemovedDomain: 0,
    leadRemovedManual: 0,
  },
  statuses: {
    anchor: { configured: false, available: false, message: "Aguardando conexão" },
    business: { configured: false, available: false, message: "Aguardando conexão" },
  },
};

const integer = new Intl.NumberFormat("pt-BR");
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

function predominantBand(
  records: ProfileRecord[],
  classifier: (record: ProfileRecord) => string | null,
): string {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const band = classifier(record);
    if (band) counts.set(band, (counts.get(band) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

function filterRecords(records: ProfileRecord[], filters: Filters): ProfileRecord[] {
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;

  return records.filter((record) => {
    const createdAt = record.createdAt ? new Date(record.createdAt) : null;
    if ((start || end) && !createdAt) return false;
    if (start && createdAt && createdAt < start) return false;
    if (end && createdAt && createdAt > end) return false;
    if (filters.income && incomeBand(record.income) !== filters.income) return false;
    if (filters.wealth && wealthBand(record.wealth) !== filters.wealth) return false;
    if (filters.gender && record.gender !== filters.gender) return false;
    if (filters.age && ageBand(record.age) !== filters.age) return false;
    if (filters.origin && record.origin !== filters.origin) return false;
    return true;
  });
}

function KpiCard({
  label,
  value,
  detail,
  status,
  highlight = false,
}: {
  label: string;
  value: string;
  detail?: string;
  status?: string;
  highlight?: boolean;
}) {
  return (
    <article className="qv-profile-kpi">
      <div className="qv-profile-kpi__header">
        <p>{label}</p>
        {status && <span className="qv-badge qv-badge--warning">{status}</span>}
      </div>
      <strong className={highlight ? "qv-profile-kpi__value qv-profile-kpi__value--highlight" : "qv-profile-kpi__value"}>
        {value}
      </strong>
      {detail && <span className="qv-profile-kpi__detail">{detail}</span>}
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
    <section className={`qv-card qv-profile-panel ${className}`}>
      <header className="qv-profile-panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="qv-profile-empty">
      <strong>Sem dados para exibir</strong>
      <span>{message}</span>
    </div>
  );
}

function AgeDistributionBars({ records }: { records: ProfileRecord[] }) {
  const validAges = records.filter((record) => ageBand(record.age));
  const data = AGE_BANDS.map((band) => ({
    name: band,
    value: validAges.filter((record) => ageBand(record.age) === band).length,
  }))
    .sort((a, b) => b.value - a.value);
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <div className="qv-profile-age-bars">
      <div className="qv-profile-age-bars__header">
        <span>Distribuição etária</span>
        <strong>{integer.format(validAges.length)} com idade</strong>
      </div>
      <div className="qv-profile-age-ranking__labels" aria-hidden="true">
        <span>Faixa etária</span>
        <span>Pessoas</span>
        <span>Distribuição</span>
      </div>
      <div className="qv-profile-age-ranking">
        {data.map((item) => {
          const share = validAges.length > 0 ? item.value / validAges.length : 0;
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return (
            <div className="qv-profile-age-ranking__row" key={item.name}>
              <strong>{item.name}</strong>
              <span>{integer.format(item.value)} - {percent.format(share)}</span>
              <div className="qv-profile-age-ranking__track" aria-hidden="true">
                {item.value > 0 && (
                  <span
                    className="qv-profile-age-ranking__bar"
                    style={{ width: `${width}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonChart({
  data,
  unavailable,
}: {
  data: DistributionDatum[];
  unavailable?: string;
}) {
  const hasData = data.some((item) => item.qv360 > 0 || item.infoproduto > 0);
  if (!hasData) return <EmptyChart message={unavailable ?? "A combinação atual de filtros não retornou registros."} />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 32, right: 8, left: -16, bottom: 24 }}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          vertical={false}
        />
        <XAxis
          dataKey="faixa"
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
          angle={-18}
          textAnchor="end"
          height={64}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 2)]}
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
        />
        <Tooltip
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "var(--color-primary-tint)" }}
        />
        <Legend wrapperStyle={rechartsTheme.legend.wrapperStyle} />
        <Bar
          dataKey="qv360"
          name="QV360"
          fill={qvCategorical[0]}
          radius={[4, 4, 0, 0]}
          minPointSize={(value: number) => (value > 0 ? 8 : 0)}
          maxBarSize={48}
        >
          <LabelList dataKey="qv360" position="top" fill="var(--color-text)" fontSize={12} />
        </Bar>
        <Bar
          dataKey="infoproduto"
          name="Infoproduto"
          fill={qvCategorical[2]}
          radius={[4, 4, 0, 0]}
          minPointSize={(value: number) => (value > 0 ? 8 : 0)}
          maxBarSize={48}
        >
          <LabelList dataKey="infoproduto" position="top" fill="var(--color-text)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function FunnelChart({ visits, leads, payments, refunds }: { visits: number; leads: number; payments: number; refunds: number }) {
  const data = [
    { etapa: "Visitas na VSL", valor: visits },
    { etapa: "Inscrições / leads", valor: leads },
    { etapa: "Pagamentos", valor: payments },
    { etapa: "Cancelamentos", valor: refunds },
    { etapa: "Clientes líquidos", valor: Math.max(0, payments - refunds) },
  ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 16, right: 48, left: 32, bottom: 8 }}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          horizontal={false}
        />
        <XAxis
          type="number"
          allowDecimals={false}
          domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 2)]}
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
        />
        <YAxis
          type="category"
          dataKey="etapa"
          width={128}
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
        />
        <Tooltip
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "var(--color-primary-tint)" }}
        />
        <Bar
          dataKey="valor"
          name="Quantidade"
          radius={[0, 4, 4, 0]}
          minPointSize={(value: number) => (value > 0 ? 8 : 0)}
          maxBarSize={34}
        >
          {data.map((item, index) => (
            <Cell key={item.etapa} fill={qvCategorical[index % qvCategorical.length]} />
          ))}
          <LabelList dataKey="valor" position="right" fill="var(--color-text)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function FinancialChart({
  grossRevenue,
  totalCost,
  netMargin,
  refunds,
}: {
  grossRevenue: number;
  totalCost: number;
  netMargin: number;
  refunds: number;
}) {
  const data = [
    { indicador: "Receita bruta", valor: grossRevenue },
    { indicador: "Custo", valor: totalCost },
    { indicador: "Margem líquida", valor: netMargin },
    { indicador: "Reembolsos", valor: refunds },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 44, right: 8, left: 8, bottom: 24 }}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          vertical={false}
        />
        <XAxis
          dataKey="indicador"
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
          angle={-12}
          textAnchor="end"
          height={56}
        />
        <YAxis
          domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 1)]}
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
          tickFormatter={(value) => currency.format(value)}
        />
        <Tooltip
          formatter={(value) => currency.format(Number(value))}
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "var(--color-primary-tint)" }}
        />
        <Bar
          dataKey="valor"
          name="Valor"
          radius={[4, 4, 0, 0]}
          minPointSize={(value: number) => (value > 0 ? 8 : 0)}
          maxBarSize={56}
        >
          {data.map((item, index) => (
            <Cell key={item.indicador} fill={qvCategorical[index % qvCategorical.length]} />
          ))}
          <LabelList
            dataKey="valor"
            position="top"
            fill="var(--color-text)"
            fontSize={12}
            formatter={(value: number) => currency.format(value)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ProfileInfoproductDashboard() {
  const [profiles, setProfiles] = useState<ProfilesResult>(emptyProfiles);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    const loaded = await loadProfiles();
    setProfiles(loaded);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const qv360 = useMemo(() => filterRecords(profiles.qv360, filters), [profiles.qv360, filters]);
  const infoproduto = useMemo(
    () => filterRecords(profiles.infoproduto, filters),
    [profiles.infoproduto, filters],
  );

  const displayedQv360 = filters.audience === "infoproduto" ? [] : qv360;
  const displayedInfoproduct = filters.audience === "qv360" ? [] : infoproduto;

  const ageDistribution = useMemo(
    () => createDistribution(displayedQv360, displayedInfoproduct, AGE_BANDS, (record) => ageBand(record.age)),
    [displayedQv360, displayedInfoproduct],
  );
  const incomeDistribution = useMemo(
    () => createDistribution(displayedQv360, displayedInfoproduct, INCOME_BANDS, (record) => incomeBand(record.income)),
    [displayedQv360, displayedInfoproduct],
  );
  const wealthDistribution = useMemo(
    () => createDistribution(displayedQv360, displayedInfoproduct, WEALTH_BANDS, (record) => wealthBand(record.wealth)),
    [displayedQv360, displayedInfoproduct],
  );
  const contributionDistribution = useMemo(
    () =>
      createDistribution(displayedQv360, displayedInfoproduct, CONTRIBUTION_BANDS, (record) =>
        contributionBand(record.monthlyContribution),
      ),
    [displayedQv360, displayedInfoproduct],
  );

  const qvContributions = qv360.flatMap((record) =>
    record.monthlyContribution === null ? [] : [record.monthlyContribution],
  );
  const leadContributions = infoproduto.flatMap((record) =>
    record.monthlyContribution === null ? [] : [record.monthlyContribution],
  );
  const qvIncomeValid = qv360.filter((record) => record.income !== null).length;
  const qvIncomeMissing = qv360.length - qvIncomeValid;
  const qvContributionValid = qv360.filter(
    (record) => record.monthlyContribution !== null,
  ).length;
  const qvContributionMissing = qv360.length - qvContributionValid;

  const payments = pendingMetrics.payments.value ?? 0;
  const visits = pendingMetrics.vslVisits.value ?? 0;
  const refunds = pendingMetrics.refunds.value ?? 0;
  const grossRevenue = pendingMetrics.grossRevenue.value ?? 0;
  const totalCost = pendingMetrics.cost.value ?? 0;
  const cac = payments > 0 ? totalCost / payments : 0;
  const conversionRate = infoproduto.length > 0 ? payments / infoproduto.length : 0;
  const netMargin = grossRevenue - totalCost - grossRevenue * 0.3;
  const netMarginPercent = grossRevenue > 0 ? netMargin / grossRevenue : 0;
  const refundPercent = payments > 0 ? refunds / payments : 0;
  const qvProfile = {
    income: predominantBand(qv360, (record) => incomeBand(record.income)),
    age: predominantBand(qv360, (record) => ageBand(record.age)),
    contribution: predominantBand(qv360, (record) =>
      contributionBand(record.monthlyContribution),
    ),
    wealth: predominantBand(qv360, (record) => wealthBand(record.wealth)),
  };
  const leadProfile = {
    income: predominantBand(infoproduto, (record) => incomeBand(record.income)),
    age: predominantBand(infoproduto, (record) => ageBand(record.age)),
    contribution: predominantBand(infoproduto, (record) =>
      contributionBand(record.monthlyContribution),
    ),
    wealth: predominantBand(infoproduto, (record) => wealthBand(record.wealth)),
  };

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="qv-profile-dashboard">
      <section className="qv-profile-hero">
        <div>
          <span className="qv-profile-eyebrow">Inteligência de público</span>
          <h1>Perfil de Cliente Atual vs. Infoproduto</h1>
          <p>Comparativo entre amostragem clientes QV e leads convertidos para nortear tomadas de ação</p>
        </div>
        <div className="qv-profile-hero__actions">
          <span className={loading ? "qv-profile-status qv-profile-status--loading" : "qv-profile-status"}>
            {loading ? "Atualizando dados" : lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · atualização automática a cada 2 min` : "Pronto"}
          </span>
          <button className="qv-btn qv-btn--secondary" type="button" onClick={() => void refresh()} disabled={loading}>
            Atualizar
          </button>
        </div>
      </section>

      <section className="qv-card qv-profile-filters" aria-label="Filtros do dashboard">
        <div className="qv-profile-section-heading">
          <div>
            <h2>Filtros</h2>
            <p>Selecione o período e o curso para atualizar a visualização.</p>
          </div>
          <button className="qv-btn qv-btn--ghost" type="button" onClick={() => setFilters(initialFilters)}>
            Limpar filtros
          </button>
        </div>

        <div className="qv-profile-filter-grid">
          <label>
            <span>Período inicial</span>
            <input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} />
          </label>
          <label>
            <span>Período final</span>
            <input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} />
          </label>
          <label>
            <span>Nome do curso</span>
            <select value={filters.costName} onChange={(event) => updateFilter("costName", event.target.value)}>
              <option value="">Todos os cursos</option>
            </select>
          </label>
        </div>
      </section>

      <section className="qv-profile-comparison">
        <article className="qv-profile-base qv-profile-base--qv">
          <header>
            <div>
              <span className="qv-profile-eyebrow">Fonte: amostragem clientes Pharus</span>
              <h2>Perfil base clientes</h2>
            </div>
            <strong className="qv-profile-base__count">{integer.format(qv360.length)}</strong>
          </header>
          <div className="qv-profile-base__hero">
            <span>Faixa receita</span>
            <strong>{qvProfile.income}</strong>
          </div>
          <div className="qv-profile-base__grid">
            <div><span>Faixa etária</span><strong>{qvProfile.age}</strong><small>Ver distribuição abaixo</small></div>
            <div><span>Faixa de aporte</span><strong>{qvProfile.contribution}</strong></div>
          </div>
          <AgeDistributionBars records={qv360} />
          <div className="qv-profile-base__grid qv-profile-base__grid--bottom qv-profile-base__grid--single">
            <div><span>Patrimônio (moda)</span><strong>{qvProfile.wealth}</strong></div>
          </div>
        </article>

        <article className="qv-profile-base qv-profile-base--lead">
          <header>
            <div>
              <span className="qv-profile-eyebrow qv-profile-eyebrow--lead">Fonte: Infoproduto</span>
              <h2>Perfil base infoproduto</h2>
            </div>
            <strong className="qv-profile-base__count">{integer.format(infoproduto.length)}</strong>
          </header>
          <div className="qv-profile-base__hero">
            <span>Faixa receita</span>
            <strong>{leadProfile.income}</strong>
          </div>
          <div className="qv-profile-base__grid">
            <div><span>Faixa etária</span><strong>{leadProfile.age}</strong><small>Ver distribuição abaixo</small></div>
            <div><span>Faixa de aporte</span><strong>{leadProfile.contribution}</strong></div>
          </div>
          <AgeDistributionBars records={infoproduto} />
          <div className="qv-profile-base__grid qv-profile-base__grid--bottom qv-profile-base__grid--single">
            <div><span>Patrimônio (moda)</span><strong>{leadProfile.wealth}</strong></div>
          </div>
        </article>
      </section>

      <section className="qv-profile-executive">
        <article className="qv-card qv-profile-executive__funnel">
          <h2>Funil do infoproduto</h2>
          <div className="qv-profile-metric-list">
            <div><span>Clique anúncio</span><strong>0</strong></div>
            <div><span>Visita VSL</span><strong>{integer.format(visits)}</strong></div>
            <div><span>Conversão</span><strong>{percent.format(conversionRate)}</strong></div>
            <div><span>Chargeback</span><strong>{integer.format(refunds)}</strong></div>
          </div>
        </article>

        <article className="qv-card qv-profile-executive__financial">
          <h2>Financeiro</h2>
          <div className="qv-profile-metric-list">
            <div><span>Custo</span><strong>{currency.format(totalCost)}</strong></div>
            <div><span>Receita</span><strong>{currency.format(grossRevenue)}</strong></div>
            <div><span>Gross margin</span><strong>{percent.format(netMarginPercent)}</strong></div>
            <div><span>CAC</span><strong>{currency.format(cac)}</strong></div>
          </div>
        </article>

        <article className="qv-profile-highlight-metric">
          <span>Conversão</span>
          <strong>{percent.format(conversionRate)}</strong>
          <small>Pagamentos sobre inscrições válidas</small>
        </article>

        <article className="qv-profile-highlight-metric qv-profile-highlight-metric--muted">
          <span>Janela de atribuição</span>
          <strong>Sem dados</strong>
          <small>Não calculada no período</small>
        </article>
      </section>

      {SHOW_DETAILED_ANALYSIS && <section>
        <div className="qv-profile-section-heading">
          <div>
            <span className="qv-profile-eyebrow">Exploração</span>
            <h2>Análise detalhada</h2>
            <p>Distribuições completas e comparações entre as duas bases.</p>
          </div>
        </div>
        <div className="qv-profile-chart-grid">
          <Panel title="Distribuição por faixa etária" subtitle="Quantidade de pessoas em cada faixa">
            <ComparisonChart data={ageDistribution} />
          </Panel>
          <Panel title="Distribuição por renda" subtitle="Receita mensal declarada">
            <ComparisonChart data={incomeDistribution} />
            <p className="qv-profile-chart-note">
              {qvIncomeMissing === 0
                ? "Não há clientes QV360 com renda nula na amostra analisada."
                : `Foram desconsiderados ${integer.format(qvIncomeMissing)} clientes QV360 sem informação de renda.`}
            </p>
          </Panel>
          <Panel title="Distribuição por patrimônio" subtitle="Patrimônio total por cliente">
            <ComparisonChart data={wealthDistribution} />
          </Panel>
          <Panel title="Aporte mensal por faixa" subtitle="Capacidade de aporte informada">
            <ComparisonChart data={contributionDistribution} />
            <p className="qv-profile-chart-note">
              {qvContributionMissing === 0
                ? "Não há clientes QV360 com aporte mensal nulo na amostra analisada."
                : `Foram desconsiderados ${integer.format(qvContributionMissing)} clientes QV360 sem informação de aporte mensal.`}
            </p>
          </Panel>
          <Panel title="Funil detalhado" subtitle="Visualização das etapas do infoproduto">
            <FunnelChart visits={visits} leads={infoproduto.length} payments={payments} refunds={refunds} />
          </Panel>
          <Panel title="Desempenho financeiro" subtitle="Valores aguardando integrações de custo e Hotmart">
            <FinancialChart grossRevenue={grossRevenue} totalCost={totalCost} netMargin={netMargin} refunds={refunds} />
          </Panel>
        </div>
      </section>}

      <style>{`
        .qv-profile-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .qv-profile-hero,
        .qv-profile-section-heading,
        .qv-profile-kpi__header,
        .qv-profile-financial-list > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
        }
        .qv-profile-hero h1 {
          margin: var(--space-1) 0 var(--space-2);
          font-size: var(--fs-2xl);
          line-height: var(--lh-tight);
        }
        .qv-profile-hero p,
        .qv-profile-panel__header p,
        .qv-profile-section-heading p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
        }
        .qv-profile-eyebrow {
          color: var(--color-primary);
          font-size: var(--fs-xs);
          font-weight: var(--fw-semibold);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .qv-profile-eyebrow--lead {
          color: var(--chart-3);
        }
        .qv-profile-hero__actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .qv-profile-status {
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
        }
        .qv-profile-status--loading {
          color: var(--color-warning);
        }
        .qv-profile-filters {
          padding: var(--space-5);
        }
        .qv-profile-section-heading {
          margin-bottom: var(--space-4);
        }
        .qv-profile-section-heading h2,
        .qv-profile-panel__header h2 {
          margin: 0;
          font-size: var(--fs-lg);
        }
        .qv-profile-filter-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .qv-profile-filter-grid label {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
          font-weight: var(--fw-medium);
        }
        .qv-profile-filter-grid input,
        .qv-profile-filter-grid select {
          min-height: 40px;
          width: 100%;
          border: 1px solid var(--color-border-strong);
          border-radius: var(--radius-md);
          background: var(--color-surface-2);
          color: var(--color-text);
          font: inherit;
          padding: 0 var(--space-3);
        }
        .qv-profile-filter-grid input:disabled,
        .qv-profile-filter-grid select:disabled {
          color: var(--color-text-subtle);
          cursor: not-allowed;
          opacity: 0.75;
        }
        .qv-profile-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: var(--radius-full);
          background: var(--color-text-subtle);
        }
        .qv-profile-dot--success { background: var(--color-success); }
        .qv-profile-dot--warning { background: var(--color-warning); }
        .qv-profile-comparison {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-5);
        }
        .qv-profile-base {
          position: relative;
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          padding: var(--space-6);
        }
        .qv-profile-base::before {
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: var(--color-primary);
          content: "";
        }
        .qv-profile-base--lead {
          background: var(--color-surface-2);
          border-color: var(--color-border-strong);
        }
        .qv-profile-base--lead::before {
          background: var(--chart-3);
        }
        .qv-profile-base > header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
          padding-bottom: var(--space-5);
          border-bottom: 1px solid var(--color-border);
        }
        .qv-profile-base h2 {
          margin: var(--space-1) 0 0;
          font-size: var(--fs-xl);
        }
        .qv-profile-base__count {
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
          font-weight: var(--fw-semibold);
        }
        .qv-profile-base__hero {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-6) 0;
        }
        .qv-profile-base__hero span,
        .qv-profile-base__grid span {
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
          font-weight: var(--fw-medium);
        }
        .qv-profile-base__hero strong {
          color: var(--color-primary);
          font-size: var(--fs-kpi);
          line-height: var(--lh-tight);
        }
        .qv-profile-base--lead .qv-profile-base__hero strong {
          color: var(--chart-3);
        }
        .qv-profile-base__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-5);
        }
        .qv-profile-base__grid > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: var(--space-2);
        }
        .qv-profile-base__grid strong {
          overflow-wrap: anywhere;
          font-size: var(--fs-lg);
        }
        .qv-profile-base__grid small {
          color: var(--color-text-subtle);
          font-size: var(--fs-xs);
        }
        .qv-profile-base__grid--bottom {
          padding-top: var(--space-5);
          border-top: 1px solid var(--color-border);
        }
        .qv-profile-base__grid--single {
          grid-template-columns: 1fr;
        }
        .qv-profile-age-bars {
          margin: var(--space-5) 0;
          padding: var(--space-4);
          border-radius: var(--radius-md);
          background: var(--color-bg);
        }
        .qv-profile-base--lead .qv-profile-age-bars {
          background: var(--color-surface);
        }
        .qv-profile-age-bars__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
          font-size: var(--fs-xs);
        }
        .qv-profile-age-bars__header span {
          color: var(--color-text-muted);
        }
        .qv-profile-age-ranking__labels,
        .qv-profile-age-ranking__row {
          display: grid;
          grid-template-columns: minmax(120px, 1.1fr) minmax(100px, 0.8fr) minmax(120px, 1.5fr);
          align-items: center;
          gap: var(--space-3);
        }
        .qv-profile-age-ranking__labels {
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
          font-weight: var(--fw-medium);
        }
        .qv-profile-age-ranking {
          display: flex;
          flex-direction: column;
        }
        .qv-profile-age-ranking__row {
          min-height: 40px;
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--color-border);
          font-size: var(--fs-xs);
        }
        .qv-profile-age-ranking__row:last-child {
          border-bottom: 0;
        }
        .qv-profile-age-ranking__row strong {
          font-size: var(--fs-sm);
        }
        .qv-profile-age-ranking__row > span {
          color: var(--color-text-muted);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .qv-profile-age-ranking__track {
          height: 8px;
          overflow: hidden;
          border-radius: var(--radius-full);
          background: var(--color-surface-2);
        }
        .qv-profile-base--lead .qv-profile-age-ranking__track {
          background: var(--color-bg);
        }
        .qv-profile-age-ranking__bar {
          display: block;
          height: 100%;
          min-width: 4px;
          border-radius: inherit;
          background: var(--color-primary);
        }
        .qv-profile-executive {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(180px, 0.7fr) minmax(220px, 0.9fr);
          gap: var(--space-5);
        }
        .qv-profile-executive h2 {
          margin: 0 0 var(--space-4);
          font-size: var(--fs-lg);
        }
        .qv-profile-metric-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          margin-bottom: var(--space-4);
        }
        .qv-profile-metric-list > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          min-height: 40px;
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--color-border);
        }
        .qv-profile-metric-list span {
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
        }
        .qv-profile-highlight-metric {
          display: flex;
          min-height: 100%;
          flex-direction: column;
          justify-content: center;
          gap: var(--space-2);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-lg);
          background: var(--color-primary-tint);
          padding: var(--space-5);
        }
        .qv-profile-highlight-metric span {
          color: var(--color-text-muted);
          font-size: var(--fs-sm);
        }
        .qv-profile-highlight-metric strong {
          color: var(--color-primary);
          font-size: var(--fs-kpi);
          line-height: var(--lh-tight);
        }
        .qv-profile-highlight-metric small {
          color: var(--color-text-subtle);
          font-size: var(--fs-xs);
        }
        .qv-profile-highlight-metric--muted {
          border-color: var(--color-border-strong);
          background: var(--color-surface-2);
        }
        .qv-profile-highlight-metric--muted strong {
          color: var(--color-text);
          font-size: var(--fs-xl);
        }
        .qv-profile-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .qv-profile-kpi {
          min-width: 0;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          padding: var(--space-4);
        }
        .qv-profile-kpi__header {
          align-items: flex-start;
          min-height: 38px;
        }
        .qv-profile-kpi__header p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
        }
        .qv-profile-kpi__value {
          display: block;
          margin-top: var(--space-3);
          overflow: hidden;
          color: var(--color-text);
          font-size: var(--fs-xl);
          line-height: var(--lh-tight);
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .qv-profile-kpi__value--highlight { color: var(--color-primary); }
        .qv-profile-kpi__detail {
          display: block;
          min-height: 34px;
          margin-top: var(--space-2);
          color: var(--color-text-subtle);
          font-size: var(--fs-xs);
        }
        .qv-profile-chart-grid,
        .qv-profile-two-column {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-5);
        }
        .qv-profile-panel {
          min-width: 0;
        }
        .qv-profile-panel__header {
          margin-bottom: var(--space-4);
        }
        .qv-profile-empty {
          min-height: 300px;
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
        .qv-profile-empty strong { color: var(--color-text); }
        .qv-profile-empty span { max-width: 360px; font-size: var(--fs-sm); }
        .qv-profile-summary-table {
          display: flex;
          flex-direction: column;
        }
        .qv-profile-summary-table > div {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr));
          gap: var(--space-3);
          padding: var(--space-3) 0;
          border-bottom: 1px solid var(--color-border);
          font-size: var(--fs-sm);
        }
        .qv-profile-summary-table > div span:not(:first-child),
        .qv-profile-summary-table > div strong {
          text-align: right;
        }
        .qv-profile-summary-table__header {
          color: var(--color-text-muted);
          font-size: var(--fs-xs) !important;
          font-weight: var(--fw-semibold);
        }
        .qv-profile-note {
          border-left: 3px solid var(--color-warning);
          background: var(--color-warning-soft);
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
          padding: var(--space-3);
        }
        .qv-profile-chart-note {
          margin: var(--space-3) 0 0;
          color: var(--color-text-subtle);
          font-size: var(--fs-xs);
          line-height: var(--lh-relaxed);
        }
        .qv-profile-financial-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-3);
          margin-top: var(--space-3);
        }
        .qv-profile-financial-list > div {
          align-items: flex-start;
          flex-direction: column;
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-3);
        }
        .qv-profile-financial-list span {
          color: var(--color-text-muted);
          font-size: var(--fs-xs);
        }
        button:disabled { cursor: wait; opacity: 0.65; }
        @media (max-width: 1100px) {
          .qv-profile-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .qv-profile-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .qv-profile-executive {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 760px) {
          .qv-profile-hero,
          .qv-profile-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }
          .qv-profile-hero__actions { width: 100%; justify-content: space-between; }
          .qv-profile-chart-grid,
          .qv-profile-two-column,
          .qv-profile-comparison,
          .qv-profile-executive,
          .qv-profile-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .qv-profile-filter-grid,
          .qv-profile-kpi-grid,
          .qv-profile-financial-list {
            grid-template-columns: 1fr;
          }
          .qv-profile-hero h1 { font-size: var(--fs-xl); }
          .qv-profile-base {
            padding: var(--space-5);
          }
          .qv-profile-base__grid {
            grid-template-columns: 1fr;
          }
          .qv-profile-age-ranking__labels {
            display: none;
          }
          .qv-profile-age-ranking__row {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: var(--space-2);
            padding: var(--space-3) 0;
          }
          .qv-profile-age-ranking__track {
            grid-column: 1 / -1;
          }
          .qv-profile-base__hero strong {
            font-size: var(--fs-2xl);
          }
        }
      `}</style>
    </div>
  );
}
