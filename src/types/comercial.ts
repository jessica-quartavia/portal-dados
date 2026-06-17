export type ComercialPreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

export type ComercialTab = 'dashboard' | 'validation';

export interface ComercialFilters {
  start: string;
  end: string;
}

export interface ComercialMetrics {
  reunioesAgendadas: number;
  novosAgendamentos: number;
  reunioesRealizadas: number;
  reunioesFuturas: number;
  noShow: number;
}

export interface ComercialBarRow {
  tipo: string;
  quantidade: number;
}

export interface ComercialIncomeRow {
  faixa: string;
  quantidade: number;
}

export interface ComercialIncomeByDayRow {
  dia: string;
  faixa: string;
  quantidade: number;
}

export interface ComercialMeetingRow {
  nomeCliente: string;
  nomeCloser: string;
  nomeSdr: string;
  dataAgendamento: string | null;
  statusAgendamento: string;
  bitrixDealId?: string | null;
}

export interface ComercialValidationRow {
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
}

export interface ComercialDashboardData {
  metrics: ComercialMetrics;
  noShowTypes: ComercialBarRow[];
  income: ComercialIncomeRow[];
  incomeByDay: ComercialIncomeByDayRow[];
  meetings: ComercialMeetingRow[];
  validationRows: ComercialValidationRow[];
  generatedAt: string;
}
