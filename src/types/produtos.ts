export type ProdutosTabKey = 'clientes' | 'cancelamentos' | 'operacao' | 'produto';

export interface ProdutosCard {
  label: string;
  value: number | null;
  format?: 'percent' | 'decimal' | 'currency';
  emptyLabel?: string;
}

export interface ProdutosPeriodPoint {
  period: string;
  value: number;
}

export interface ProdutosStatusPoint {
  status: string;
  value: number;
}

export interface ProdutosReasonPoint {
  reason: string;
  value: number;
}

export interface ProdutosMeetingSummary {
  type: string;
  scheduled: number;
  attended: number;
  attendanceRate: number;
}

export interface ProdutosChurnReasonSummary {
  filled: number;
  empty: number;
  fillRate: number;
}

export interface ProdutosTabClientes {
  cards: ProdutosCard[];
  charts: {
    newClientsByMonth: ProdutosPeriodPoint[];
    cancellationsByMonth: ProdutosPeriodPoint[];
    refundsByMonth: ProdutosPeriodPoint[];
  };
}

export interface ProdutosTabCancelamentos {
  cards: ProdutosCard[];
  charts: {
    byMonth: ProdutosPeriodPoint[];
    byStatus: ProdutosStatusPoint[];
    churnReasons: ProdutosReasonPoint[];
    churnReasonSummary: ProdutosChurnReasonSummary;
  };
}

export interface ProdutosTabOperacao {
  cards: ProdutosCard[];
  charts: {
    meetingSummary: ProdutosMeetingSummary[];
  };
}

export interface ProdutosTabProduto {
  cards: ProdutosCard[];
  charts: {
    ascensionsByMonth: ProdutosPeriodPoint[];
  };
}

export interface ProdutosMetricResponse {
  refreshedAt: string;
  nextRefreshAt: string;
  error?: string;
  warnings?: string[];
  pendingConnection?: boolean;
  tabs?: {
    clientes: ProdutosTabClientes;
    cancelamentos: ProdutosTabCancelamentos;
    operacao: ProdutosTabOperacao;
    produto: ProdutosTabProduto;
  };
}
