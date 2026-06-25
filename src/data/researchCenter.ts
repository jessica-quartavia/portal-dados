export type DashboardSection = "overview" | "nps" | "csat" | "churn" | "feedback" | "engineers";

export type TrendTone = "positive" | "negative" | "neutral";

export interface KpiMetric {
  label: string;
  value: string;
  detail: string;
  trend?: string;
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

export interface ResearchLogRow {
  date: string;
  source: string;
  learning: string;
  action: string;
}

export interface EngineerMetrics {
  name: string;
  initials: string;
  badge: string;
  clients: number;
  responses: number;
  nps: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  csat: number;
  feedbacks: number;
  churn: number;
  retention: number;
}

export interface FeedbackRow {
  date: string;
  engineer: string;
  client: string;
  theme: string;
  sentiment: "Positivo" | "Neutro" | "Negativo";
  text: string;
  action: string;
}

export const engineers: EngineerMetrics[] = [
  { name: "Ricardo Mendes", initials: "RM", badge: "Maior NPS da equipe", clients: 47, responses: 156, nps: 72, promoters: 85, neutrals: 45, detractors: 26, csat: 4.6, feedbacks: 156, churn: 2.1, retention: 97.9 },
  { name: "Fernanda Costa", initials: "FC", badge: "Melhor CSAT", clients: 52, responses: 189, nps: 68, promoters: 92, neutrals: 52, detractors: 45, csat: 4.7, feedbacks: 189, churn: 1.9, retention: 98.1 },
  { name: "Bruno Oliveira", initials: "BO", badge: "Foco em novos clientes", clients: 38, responses: 98, nps: 58, promoters: 48, neutrals: 32, detractors: 18, csat: 4.2, feedbacks: 98, churn: 5.3, retention: 94.7 },
  { name: "Camila Santos", initials: "CS", badge: "Consistencia", clients: 44, responses: 134, nps: 65, promoters: 72, neutrals: 38, detractors: 24, csat: 4.5, feedbacks: 134, churn: 2.3, retention: 97.7 },
  { name: "Pedro Almeida", initials: "PA", badge: "Maior crescimento", clients: 41, responses: 112, nps: 61, promoters: 58, neutrals: 34, detractors: 20, csat: 4.4, feedbacks: 112, churn: 2.4, retention: 97.6 },
];

export const overviewKpis: KpiMetric[] = [
  { label: "NPS Score", value: "42", detail: "vs mes anterior", trend: "+2%", tone: "positive" },
  { label: "CSAT Medio", value: "4.2 / 5", detail: "vs mes anterior", trend: "+0.3%", tone: "positive" },
  { label: "Volume de Feedback", value: "1.847", detail: "vs mes anterior", trend: "+12%", tone: "positive" },
  { label: "Taxa de Churn", value: "3.2%", detail: "vs mes anterior", trend: "+0.5%", tone: "negative" },
];

export const cancellationReasons: NamedValue[] = [
  { name: "Preco alto", value: 38 },
  { name: "Funcionalidades insuficientes", value: 29 },
  { name: "Mudou para concorrente", value: 23 },
  { name: "Suporte insatisfatorio", value: 17 },
  { name: "Problemas de performance", value: 12 },
  { name: "Nao usa mais o produto", value: 9 },
];

export const sentimentByStage: SentimentByStage[] = [
  { stage: "Onboarding", positive: 58, neutral: 26, negative: 16 },
  { stage: "Ativacao", positive: 63, neutral: 24, negative: 13 },
  { stage: "Engajamento", positive: 66, neutral: 23, negative: 11 },
  { stage: "Retencao", positive: 52, neutral: 30, negative: 18 },
  { stage: "Expansao", positive: 71, neutral: 20, negative: 9 },
];

export const researchRows: ResearchLogRow[] = [
  { date: "07/05/2026", source: "Analise de Churn", learning: "Clientes que nao completam o onboarding em 7 dias tem 3x mais chance de cancelar.", action: "Criado fluxo de email automatizado para reengajar usuario." },
  { date: "05/05/2026", source: "Pesquisa NPS", learning: "Principal promotor: facilidade de uso. Principal detrator: preco percebido como alto.", action: "Iniciada revisao de pricing com tiers mais acessiveis." },
  { date: "01/05/2026", source: "Entrevistas de Usuario", learning: "Usuarios power users desejam mais customizacao nos dashboards.", action: "Adicionado ao roadmap Q3 - Dashboard Builder." },
  { date: "28/04/2026", source: "Tickets de Suporte", learning: "40% dos tickets sao sobre a mesma funcionalidade de exportacao.", action: "Redesenhado fluxo de exportacao + tooltip explicativo." },
  { date: "25/04/2026", source: "Analise de Competidores", learning: "Concorrente Y lancou integracao com Slack que esta sendo bem recebida.", action: "Priorizada integracao Slack no backlog." },
];

export const npsDistribution: NamedValue[] = [
  { name: "Promotores", value: 355 },
  { name: "Neutros", value: 201 },
  { name: "Detratores", value: 133 },
];

export const npsEvolution: NamedValue[] = [
  { name: "Jan", value: 54 },
  { name: "Fev", value: 57 },
  { name: "Mar", value: 61 },
  { name: "Abr", value: 60 },
  { name: "Mai", value: 65 },
];

export const csatByStage: NamedValue[] = [
  { name: "Onboarding", value: 4.4 },
  { name: "Ativacao", value: 4.6 },
  { name: "Engajamento", value: 4.5 },
  { name: "Expansao", value: 4.7 },
  { name: "Retencao", value: 4.2 },
];

export const csatEvolution: NamedValue[] = [
  { name: "Jan", value: 4.1 },
  { name: "Fev", value: 4.3 },
  { name: "Mar", value: 4.4 },
  { name: "Abr", value: 4.4 },
  { name: "Mai", value: 4.5 },
];

export const churnByEngineer: NamedValue[] = [
  { name: "Bruno", value: 5.3, tone: "high" },
  { name: "Pedro", value: 2.4, tone: "low" },
  { name: "Camila", value: 2.3, tone: "low" },
  { name: "Ricardo", value: 2.1, tone: "low" },
  { name: "Fernanda", value: 1.9, tone: "low" },
];

export const churnSegments: NamedValue[] = [
  { name: "Pequenas", value: 42 },
  { name: "Medias", value: 34 },
  { name: "Grandes", value: 24 },
];

export const churnReasons: NamedValue[] = [
  { name: "Preco", value: 41 },
  { name: "Suporte", value: 26 },
  { name: "Concorrencia", value: 21 },
  { name: "Outros", value: 12 },
];

export const churnEvolution: NamedValue[] = [
  { name: "Jan", value: 3.9 },
  { name: "Fev", value: 3.5 },
  { name: "Mar", value: 3.1 },
  { name: "Abr", value: 3.4 },
  { name: "Mai", value: 2.8 },
];

export const feedbackSentiment: NamedValue[] = [
  { name: "Positivo", value: 420 },
  { name: "Neutro", value: 180 },
  { name: "Negativo", value: 89 },
];

export const feedbackThemes: NamedValue[] = [
  { name: "UX/Usabilidade", value: 168 },
  { name: "Suporte", value: 142 },
  { name: "Funcionalidades", value: 119 },
  { name: "Preco", value: 96 },
  { name: "Performance", value: 82 },
  { name: "Outros", value: 82 },
];

export const feedbackRows: FeedbackRow[] = [
  { date: "14/05/2026", engineer: "Fernanda Costa", client: "Segmento Medio", theme: "UX/Usabilidade", sentiment: "Positivo", text: "A cliente destacou que a nova visao de acompanhamento deixou a jornada mais clara.", action: "Usar o padrao como referencia para novos fluxos." },
  { date: "13/05/2026", engineer: "Ricardo Mendes", client: "Cliente Enterprise", theme: "Preco", sentiment: "Negativo", text: "Percepcao de preco alto quando comparado ao volume de reunioes realizadas no mes.", action: "Reforcar valor entregue no fechamento mensal." },
  { date: "12/05/2026", engineer: "Camila Santos", client: "Pequenas empresas", theme: "Suporte", sentiment: "Neutro", text: "Cliente pediu respostas mais previsiveis para duvidas operacionais recorrentes.", action: "Criar macro de atendimento e checklist." },
  { date: "11/05/2026", engineer: "Pedro Almeida", client: "Segmento Medio", theme: "Funcionalidades", sentiment: "Positivo", text: "Elogio para os dashboards de metas e desejo de receber alertas semanais.", action: "Mapear alerta recorrente no backlog." },
  { date: "10/05/2026", engineer: "Bruno Oliveira", client: "Novos clientes", theme: "Onboarding", sentiment: "Negativo", text: "Dificuldade para entender os proximos passos depois da primeira reuniao.", action: "Revisar comunicacao de onboarding." },
];

export const filters = {
  periods: ["Ultimos 90 dias", "Ultimos 30 dias", "Ano atual"],
  products: ["Todos os Produtos", "QV360", "Consultoria", "Infoproduto"],
  stages: ["Todas as Etapas", "Onboarding", "Ativacao", "Engajamento", "Retencao", "Expansao"],
  themes: ["Todos os Temas", "UX/Usabilidade", "Suporte", "Funcionalidades", "Preco", "Performance"],
  engineers: ["Todos os Engenheiros", ...engineers.map((engineer) => engineer.name)],
};
