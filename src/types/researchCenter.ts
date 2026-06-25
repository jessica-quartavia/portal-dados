export type DashboardSection = "overview" | "nps" | "csat" | "churn" | "feedback" | "engineers" | "renewal";

export type Sentiment = "Positivo" | "Neutro" | "Negativo";
export type TrendTone = "positive" | "negative" | "neutral";

export interface KpiMetric {
  label: string;
  value: string;
  detail: string;
  trend?: string | null;
  tone?: TrendTone;
  progress?: number;
}

export interface NamedValue {
  name: string;
  value: number;
  label?: string;
  tone?: "excellent" | "good" | "critical" | "low" | "moderate" | "high";
}

export interface SentimentByStage {
  stage: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface TrendPoint extends NamedValue {
  csat?: number;
  churn?: number;
  feedbacks?: number;
  activeClients?: number;
}

export interface ResearchLogRow {
  date: string;
  source: string;
  client?: string;
  engineer?: string;
  stage?: string;
  theme?: string;
  sentiment?: Sentiment;
  learning: string;
  action: string;
}

export interface FeedbackRow {
  date: string;
  engineer: string;
  client: string;
  theme: string;
  sentiment: Sentiment;
  stage?: string;
  text: string;
  action: string;
}

export interface EngineerMetrics {
  name: string;
  initials: string;
  badge: string;
  clients: number;
  renewedClients: number;
  atRiskClients: number;
  responses: number;
  nps: number;
  npsGoal: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  csat: number;
  csatGoal: number;
  feedbacks: number;
  churn: number;
  retention: number;
  cancellations: number;
}

export interface RenewalRow {
  client: string;
  clientId: string;
  engineer: string;
  origin: string;
  product: string;
  entryDate: string;
  currentCycleStart: string;
  currentCycleEnd: string;
  currentCycle: string;
  renewed: boolean;
  renewalDate: string;
  currentStatus: string;
  active: boolean;
  cancelled: boolean;
  cancellationDate: string;
  cancelledBeforeCycleEnd: boolean;
  cancelledBeforeFirstCycle: boolean;
  reachedCycleEndAndDidNotRenew: boolean;
  cancellationReason: string;
  notes: string;
}

export interface RenewalMetrics {
  kpis: KpiMetric[];
  renewedByCycle: NamedValue[];
  originOfRenewed: NamedValue[];
  statusOfRenewed: NamedValue[];
  cancellationsByCycle: NamedValue[];
  cancellationReasons: NamedValue[];
  funnel: Array<{ name: string; value: number; previousRate: number; baseRate: number }>;
  cohort: Array<Record<string, string | number>>;
  rows: RenewalRow[];
  warnings: string[];
}

export interface ResearchCenterSnapshot {
  generatedAt: string;
  source: string;
  connectionStatus: "connected" | "fallback" | "missing-env" | "error";
  warnings: string[];
  mappingNotes: string[];
  overviewKpis: KpiMetric[];
  activeClients: number;
  totalClients: number;
  cancelledClients: number;
  renewedClients: number;
  atRiskClients: number;
  nps: {
    score: number;
    totalResponses: number;
    distribution: NamedValue[];
    byEngineer: Array<EngineerMetrics>;
    evolution: NamedValue[];
  };
  csat: {
    average: number | null;
    totalResponses: number;
    byEngineer: NamedValue[];
    byStage: NamedValue[];
    evolution: NamedValue[];
    ratingDistribution: NamedValue[];
  };
  churn: {
    cancellations30d: number;
    cancellationsTotal: number;
    rate: number;
    retention: number;
    byEngineer: NamedValue[];
    reasons: NamedValue[];
    statuses: NamedValue[];
    evolution: NamedValue[];
    detailRows: RenewalRow[];
  };
  feedback: {
    total: number;
    sentiment: NamedValue[];
    byEngineer: NamedValue[];
    byTheme: NamedValue[];
    byStage: SentimentByStage[];
    rows: FeedbackRow[];
  };
  researchRows: ResearchLogRow[];
  renewal: RenewalMetrics;
  filterOptions: {
    periods: string[];
    products: string[];
    stages: string[];
    themes: string[];
    engineers: string[];
    origins: string[];
    statuses: string[];
    cycles: string[];
  };
}

export type AnyRecord = Record<string, unknown>;

export interface ResearchCenterFilters {
  period: string;
  startDate: string;
  endDate: string;
  product: string;
  stage: string;
  theme: string;
  engineer: string;
  origin: string;
  status: string;
  cycle: string;
}
