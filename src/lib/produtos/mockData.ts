import type { ProdutosMetricResponse } from '../../types/produtos';

const emptyChurnSummary = { filled: 0, empty: 0, fillRate: 0 };

/** Estado vazio enquanto as tabelas/views do projeto Produtos não estão conectadas. */
export function emptyProdutosMetrics(): ProdutosMetricResponse {
  const now = new Date().toISOString();
  const next = new Date(Date.now() + 2 * 60_000).toISOString();

  return {
    refreshedAt: now,
    nextRefreshAt: next,
    pendingConnection: true,
    warnings: [
      'Conexão de dados pendente. Configure PUBLIC_PRODUTOS_SUPABASE_URL e PUBLIC_PRODUTOS_SUPABASE_ANON_KEY, e aplique as políticas RLS descritas em docs/produtos-dashboard.md.',
    ],
    tabs: {
      clientes: {
        cards: [
          { label: 'Clientes ativos', value: 0 },
          { label: 'Novos clientes', value: 0 },
          { label: 'Cancelamentos voluntários', value: 0 },
          { label: 'Reembolsos até 7 dias', value: 0 },
          { label: 'Taxa reembolso / novos', value: 0, format: 'percent' },
          { label: 'Renovações', value: 0 },
        ],
        charts: {
          newClientsByMonth: [],
          cancellationsByMonth: [],
          refundsByMonth: [],
        },
      },
      cancelamentos: {
        cards: [
          { label: 'Cancelamentos', value: 0 },
          { label: 'Retidos', value: 0 },
          { label: 'Cancelamentos autorizados', value: 0 },
          { label: 'Reembolsos realizados', value: 0 },
          { label: 'Valor reembolsado', value: 0, format: 'currency' },
          { label: 'Reembolso cadastrado', value: 0, format: 'currency' },
          { label: 'Cancelamento 7 dias', value: 0 },
        ],
        charts: {
          byMonth: [],
          byStatus: [],
          churnReasons: [],
          churnReasonSummary: emptyChurnSummary,
        },
      },
      operacao: {
        cards: [
          { label: 'Reuniões agendadas', value: 0 },
          { label: 'Reuniões com presença', value: 0 },
          { label: 'Taxa de comparecimento', value: 0, format: 'percent' },
          { label: 'CSAT médio', value: null, format: 'decimal', emptyLabel: 'Sem respostas' },
        ],
        charts: { meetingSummary: [] },
      },
      produto: {
        cards: [
          { label: 'Ascensões para Davos', value: 0 },
          { label: 'Taxa de ascensão / base ativa', value: 0, format: 'percent' },
        ],
        charts: { ascensionsByMonth: [] },
      },
    },
  };
}
