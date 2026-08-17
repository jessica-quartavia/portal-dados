export type PendingMetricKey =
  | "cost"
  | "payments"
  | "vslVisits"
  | "grossRevenue"
  | "refunds"
  | "conversionWindow";

export type PendingMetric = {
  key: PendingMetricKey;
  label: string;
  value: number | null;
  status: string;
  reason: string;
  source: "Hotmart" | "Analytics" | "Educa";
};

export const pendingMetrics: Record<PendingMetricKey, PendingMetric> = {
  cost: {
    key: "cost",
    label: "Custo total",
    value: 0,
    status: "Aguardando dados de custo",
    reason: "Dependente da base do curso Educa ou de uma fonte de mídia/campanhas.",
    source: "Educa",
  },
  payments: {
    key: "payments",
    label: "Pagamentos",
    value: 0,
    status: "Aguardando integração Hotmart",
    reason: "A quantidade de clientes pagos ainda não está disponível.",
    source: "Hotmart",
  },
  vslVisits: {
    key: "vslVisits",
    label: "Visitas na VSL",
    value: 0,
    status: "Aguardando analytics da VSL",
    reason: "Dependente de uma fonte de tracking ou analytics da página.",
    source: "Analytics",
  },
  grossRevenue: {
    key: "grossRevenue",
    label: "Receita bruta",
    value: 0,
    status: "Aguardando integração Hotmart",
    reason: "A receita de pagamentos ainda não está disponível.",
    source: "Hotmart",
  },
  refunds: {
    key: "refunds",
    label: "Cancelamentos e reembolsos",
    value: 0,
    status: "Aguardando integração Hotmart",
    reason: "Os eventos de cancelamento e reembolso ainda não estão disponíveis.",
    source: "Hotmart",
  },
  conversionWindow: {
    key: "conversionWindow",
    label: "Janela média de conversão",
    value: null,
    status: "Aguardando integração Hotmart",
    reason: "Requer a data do pagamento para comparar com a inscrição do lead.",
    source: "Hotmart",
  },
};
