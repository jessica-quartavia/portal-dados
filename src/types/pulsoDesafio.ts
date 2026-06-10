export type StatusGrupo =
  | 'realizada'
  | 'futura'
  | 'no_show'
  | 'cancelamento'
  | 'no_show_absoluto'
  | 'no_show_comercial'
  | 'reagendamento'
  | 'outro';

export type RendaBucket = 'acima_20k' | 'ate_20k' | 'nao_informado';

export type PeriodoRapido = 'hoje' | 'ontem' | '7d' | '30d' | '';

export interface AgendamentoRow {
  agendamento_id: string;
  bitrix_deal_id: string;
  contact_id: string | null;
  cliente_nome: string | null;
  email: string | null;
  desafio_tag: string | null;
  data_agendamento: string | null;
  data_referencia: string | null;
  status_agendamento: string | null;
  status_grupo: StatusGrupo;
  condicao_cancelamento: string | null;
  ordem_agendamento: number | null;
  stage_name: string | null;
  stage_group: string | null;
  stage_order: number | null;
  funil_nome: string | null;
  pipeline_nome: string | null;
  responsavel_nome: string | null;
  responsavel_user_id: string | null;
  sdr_user_id: string | null;
  sdr_nome: string | null;
  closer_user_id: string | null;
  closer_nome: string | null;
  renda_raw: string | null;
  renda_valor: number | null;
  renda_bucket: RendaBucket;
  creation_date: string | null;
  modify_date: string | null;
  last_captured_at: string | null;
}

export interface PulsoKpis {
  totalAgendas: number;
  realizadas: number;
  futuras: number;
  noShow: number;
  novosAgendamentos: number;
  cancelamentos: number;
  noShowAbsoluto: number;
  noShowComercial: number;
  reagendamentos: number;
  acima20k: number;
  ate20k: number;
  naoInformado: number;
}

export interface AgendaPorDia {
  data: string;
  total: number;
  realizadas: number;
  futuras: number;
  cancelamentos: number;
  no_show: number;
}

export interface AgendaPorStatus {
  status: string;
  label: string;
  count: number;
  cor: string;
}

export interface AgendaPorStage {
  stage_name: string;
  count: number;
}

export interface DistribuicaoRenda {
  bucket: RendaBucket;
  label: string;
  count: number;
}

// Filtros globais — aplicados via query Supabase
export interface FiltrosPulso {
  desafio: string;
  dataInicio: string;
  dataFim: string;
}

// Filtros locais — aplicados apenas na tabela operacional (client-side)
export interface FiltrosTabela {
  sdrCloser: string;
  clienteNome: string;
  email: string;
  bitrixDealId: string;
}
