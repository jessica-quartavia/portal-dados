import { readOnlyQuery } from "./db";

export type DashboardFilters = {
  start: string;
  end: string;
};

export type DashboardData = {
  metrics: {
    reunioesAgendadas: number;
    novosAgendamentos: number;
    reunioesRealizadas: number;
    reunioesFuturas: number;
    noShow: number;
  };
  noShowTypes: Array<{ tipo: string; quantidade: number }>;
  income: Array<{ faixa: string; quantidade: number }>;
  incomeByDay: Array<{ dia: string; faixa: string; quantidade: number }>;
  meetings: Array<{
    nomeCliente: string;
    nomeCloser: string;
    nomeSdr: string;
    dataAgendamento: string | null;
    statusAgendamento: string;
  }>;
  validationRows: Array<{
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
  }>;
  generatedAt: string;
};

const incomeNumericValue = `
  CASE
    WHEN TRIM(dw_bitrix.sat_deal_consultoria.renda) ~ '^[0-9]{1,3}([.][0-9]{3})+(,[0-9]+)?$'
      THEN REPLACE(REPLACE(TRIM(dw_bitrix.sat_deal_consultoria.renda), '.', ''), ',', '.')::numeric
    WHEN TRIM(dw_bitrix.sat_deal_consultoria.renda) ~ '^[0-9]+,[0-9]+$'
      THEN REPLACE(TRIM(dw_bitrix.sat_deal_consultoria.renda), ',', '.')::numeric
    ELSE TRIM(dw_bitrix.sat_deal_consultoria.renda)::numeric
  END
`;

const incomeCase = `
  CASE
    WHEN dw_bitrix.sat_deal_consultoria.renda IS NULL
      OR TRIM(dw_bitrix.sat_deal_consultoria.renda) = ''
      THEN 'Nao informado'
    WHEN LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) IN (
      'ate 10 mil',
      'atÃ© 10 mil',
      'entre 10 e 15 mil',
      'entre 15 e 20 mil'
    )
      THEN 'De 15k Ã  20k'
    WHEN LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) IN (
      'entre 20 mil e 30 mil',
      'entre 30 mil e 50 mil',
      'entre 50 mil e 100 mil',
      'acima de 100 mil'
    )
      THEN 'Acima de 20k'
    WHEN LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%50 mil%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%100 mil%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%30 mil%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%20 mil%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%acima%'
      THEN 'Acima de 20k'
    WHEN LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%15 e 20%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%10 e 15%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%ate 20%'
      OR LOWER(TRIM(dw_bitrix.sat_deal_consultoria.renda)) LIKE '%atÃ© 20%'
      THEN 'De 15k Ã  20k'
    WHEN TRIM(dw_bitrix.sat_deal_consultoria.renda) ~ '^[0-9]+([\\.,][0-9]+)?$'
      AND (${incomeNumericValue}) >= 20000
      THEN 'Acima de 20k'
    WHEN TRIM(dw_bitrix.sat_deal_consultoria.renda) ~ '^[0-9]+([\\.,][0-9]+)?$'
      AND (${incomeNumericValue}) >= 15000
      THEN 'De 15k Ã  20k'
    ELSE 'Nao informado'
  END
`;

const baseJoins = `
  FROM dw_bitrix.fact_deal_agendamentos
  LEFT JOIN dw_bitrix.fact_deals_current
    ON dw_bitrix.fact_deal_agendamentos.bitrix_deal_id = dw_bitrix.fact_deals_current.bitrix_deal_id
`;

const scheduledDateWhere = `
  WHERE dw_bitrix.fact_deal_agendamentos.data_agendamento IS NOT NULL
    AND (
      dw_bitrix.fact_deals_current.title ILIKE '%[Desafio]%'
      OR dw_bitrix.fact_deals_current.pipeline_sk = 3
      OR dw_bitrix.fact_deals_current.funil_sk = 2
    )
    AND dw_bitrix.fact_deal_agendamentos.data_agendamento >= $1::timestamptz
    AND dw_bitrix.fact_deal_agendamentos.data_agendamento < $2::timestamptz
`;

const createdAtWhere = `
  WHERE dw_bitrix.fact_deal_agendamentos.created_at IS NOT NULL
    AND (
      dw_bitrix.fact_deals_current.title ILIKE '%[Desafio]%'
      OR dw_bitrix.fact_deals_current.pipeline_sk = 3
      OR dw_bitrix.fact_deals_current.funil_sk = 2
    )
    AND dw_bitrix.fact_deal_agendamentos.created_at >= $1::timestamptz
    AND dw_bitrix.fact_deal_agendamentos.created_at < $2::timestamptz
`;

const excludedStatusClause = `
  AND LOWER(TRIM(COALESCE(dw_bitrix.fact_deal_agendamentos.status_agendamento, ''))) NOT IN (
    '371',
    '373',
    'comprou no pitch',
    'comprou no pit',
    'comprou c/ comercial'
  )
`;

const validMeetingClause = `
  ${excludedStatusClause}
  AND COALESCE(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento), '') <> ''
  AND TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento) NOT IN ('189', '205')
`;

const scheduledNotRealizedClause = `
  ${excludedStatusClause}
  AND COALESCE(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento), '') <> ''
  AND LOWER(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento)) NOT IN (
    '189',
    '205',
    'aguardando agendamento'
  )
  AND LOWER(TRIM(COALESCE(dw_bitrix.fact_deal_agendamentos.status_agendamento, ''))) NOT IN (
    '171',
    '211',
    'realizado'
  )
`;

const noShowStatusClause = `
  ${excludedStatusClause}
  AND (
    (
      COALESCE(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento), '') <> ''
      AND LOWER(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento)) NOT IN (
        '189',
        '205',
        'aguardando agendamento'
      )
      AND LOWER(TRIM(COALESCE(dw_bitrix.fact_deal_agendamentos.status_agendamento, ''))) NOT IN (
        '171',
        '211',
        'realizado'
      )
    )
    OR (
      LOWER(TRIM(COALESCE(dw_bitrix.dim_stage.stage_name, ''))) = 'aguardando reagendamento'
      AND (
        COALESCE(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento), '') = ''
        OR LOWER(TRIM(dw_bitrix.fact_deal_agendamentos.status_agendamento)) IN (
          '189',
          '205',
          'aguardando agendamento'
        )
      )
    )
  )
`;

const newAppointmentClause = `
  ${excludedStatusClause}
  AND LOWER(TRIM(COALESCE(dw_bitrix.fact_deal_agendamentos.status_agendamento, ''))) IN (
    '167',
    '207',
    'agendado'
  )
`;

const detailExcludedStatusClause = `
  AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN (
    '371',
    '373',
    'comprou no pitch',
    'comprou no pit',
    'comprou c/ comercial'
  )
`;

const detailValidMeetingClause = `
  ${detailExcludedStatusClause}
  AND COALESCE(TRIM(status_agendamento), '') <> ''
  AND TRIM(status_agendamento) NOT IN ('189', '205')
`;

const detailScheduledNotRealizedClause = `
  ${detailExcludedStatusClause}
  AND COALESCE(TRIM(status_agendamento), '') <> ''
  AND LOWER(TRIM(status_agendamento)) NOT IN ('189', '205', 'aguardando agendamento')
  AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado')
`;

const detailNoShowStatusClause = `
  ${detailExcludedStatusClause}
  AND (
    (
      COALESCE(TRIM(status_agendamento), '') <> ''
      AND LOWER(TRIM(status_agendamento)) NOT IN ('189', '205', 'aguardando agendamento')
      AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado')
    )
    OR (
      LOWER(TRIM(COALESCE(stage_status, ''))) = 'aguardando reagendamento'
      AND (
        COALESCE(TRIM(status_agendamento), '') = ''
        OR LOWER(TRIM(status_agendamento)) IN ('189', '205', 'aguardando agendamento')
      )
    )
  )
`;

const detailFutureMeetingClause = `
  ${detailExcludedStatusClause}
  AND COALESCE(TRIM(status_agendamento), '') <> ''
  AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado')
`;

const detailNewAppointmentClause = `
  ${detailExcludedStatusClause}
  AND LOWER(TRIM(COALESCE(status_agendamento, ''))) IN ('167', '207', 'agendado')
`;

function values(filters: DashboardFilters) {
  return [
    filters.start,
    filters.end
  ];
}

function normalizeAppointmentStatus(status: string | null) {
  const normalizedStatuses: Record<string, string> = {
    "167": "Agendado",
    "169": "Confirmado",
    "171": "Realizado",
    "173": "No-Show",
    "175": "No-Show TÃ©cnico",
    "177": "Reagendado",
    "179": "Cancelado pelo Cliente",
    "187": "Cancelado pelo Time",
    "189": "Aguardando Agendamento",
    "205": "Aguardando Agendamento",
    "207": "Agendado",
    "209": "Confirmado",
    "211": "Realizado",
    "213": "No-Show",
    "215": "No-Show TÃ©cnico",
    "217": "Reagendado",
    "219": "Cancelado pelo Cliente",
    "221": "Cancelado pelo Time",
    "367": "Desqualificado",
    "369": "Sem perfil",
    "371": "Comprou no pitch",
    "373": "Comprou c/ comercial"
  };
  const trimmedStatus = status?.trim();

  if (!trimmedStatus) return "Nao informado";
  return normalizedStatuses[trimmedStatus] ?? trimmedStatus;
}

function normalizeValidationStatus(status: string | null, stageStatus: string | null) {
  const normalizedStatus = normalizeAppointmentStatus(status);

  if (
    stageStatus?.trim().toLowerCase() === "aguardando reagendamento"
    && (normalizedStatus === "Nao informado" || normalizedStatus === "Aguardando Agendamento")
  ) {
    return "Aguardando Reagendamento";
  }

  return normalizedStatus;
}

export async function fetchDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const params = values(filters);

  const [metricsRows, noShowRows, incomeRows, incomeByDayRows, meetingsRows, validationRows] = await Promise.all([
    readOnlyQuery<{
      reunioes_agendadas: string;
      novos_agendamentos: string;
      reunioes_realizadas: string;
      reunioes_futuras: string;
      no_show: string;
    }>(
      `
      WITH novos AS (
        SELECT COUNT(*) AS novos_agendamentos
        ${baseJoins}
        ${createdAtWhere}
          ${newAppointmentClause}
      ),
      base_agendamento AS (
        SELECT
          dw_bitrix.fact_deal_agendamentos.data_agendamento,
          dw_bitrix.fact_deal_agendamentos.status_agendamento,
          dw_bitrix.dim_stage.stage_name
        ${baseJoins}
        LEFT JOIN dw_bitrix.dim_stage
          ON dw_bitrix.fact_deals_current.stage_sk = dw_bitrix.dim_stage.stage_sk
        ${scheduledDateWhere}
          ${excludedStatusClause}
      ),
      reunioes_validas AS (
        SELECT
          dw_bitrix.fact_deal_agendamentos.data_agendamento,
          dw_bitrix.fact_deal_agendamentos.status_agendamento
        ${baseJoins}
        ${scheduledDateWhere}
          ${validMeetingClause}
      ),
      metricas AS (
        SELECT
          (SELECT COUNT(*) FROM reunioes_validas) AS reunioes_agendadas,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(status_agendamento)) IN ('171', '211', 'realizado')
          ) AS reunioes_realizadas,
          COUNT(*) FILTER (
            WHERE data_agendamento > NOW()
              AND COALESCE(TRIM(status_agendamento), '') <> ''
              AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado')
              AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN (
                '371',
                '373',
                'comprou no pitch',
                'comprou c/ comercial'
              )
          ) AS reunioes_futuras,
          COUNT(*) FILTER (
            WHERE data_agendamento < NOW()
              AND (
                (
                  COALESCE(TRIM(status_agendamento), '') <> ''
                  AND LOWER(TRIM(status_agendamento)) NOT IN ('189', '205', 'aguardando agendamento')
                  AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado')
                )
                OR (
                  LOWER(TRIM(COALESCE(stage_name, ''))) = 'aguardando reagendamento'
                  AND (
                    COALESCE(TRIM(status_agendamento), '') = ''
                    OR LOWER(TRIM(status_agendamento)) IN ('189', '205', 'aguardando agendamento')
                  )
                )
              )
          ) AS no_show
        FROM base_agendamento
      )
      SELECT
        metricas.reunioes_agendadas,
        novos.novos_agendamentos,
        metricas.reunioes_realizadas,
        metricas.reunioes_futuras,
        metricas.no_show
      FROM novos
      CROSS JOIN metricas;
      `,
      params
    ),
    readOnlyQuery<{ tipo_no_show: string; quantidade: string }>(
      `
      WITH base AS (
        SELECT
          dw_bitrix.fact_deal_agendamentos.status_agendamento,
          dw_bitrix.dim_stage.stage_name
        ${baseJoins}
        LEFT JOIN dw_bitrix.dim_stage
          ON dw_bitrix.fact_deals_current.stage_sk = dw_bitrix.dim_stage.stage_sk
        ${scheduledDateWhere}
          AND dw_bitrix.fact_deal_agendamentos.data_agendamento < NOW()
          ${noShowStatusClause}
      ),
      classificacao AS (
        SELECT
          CASE
            WHEN LOWER(TRIM(COALESCE(stage_name, ''))) = 'aguardando reagendamento'
              AND (
                COALESCE(TRIM(status_agendamento), '') = ''
                OR LOWER(TRIM(status_agendamento)) IN ('189', '205', 'aguardando agendamento')
              )
              THEN 'Aguardando Reagendamento'
            WHEN LOWER(TRIM(status_agendamento)) IN ('167', '207', 'agendado') THEN 'Nao informado'
            WHEN TRIM(status_agendamento) = '169' THEN 'Confirmado'
            WHEN TRIM(status_agendamento) = '171' THEN 'Realizado'
            WHEN TRIM(status_agendamento) = '173' THEN 'No-Show'
            WHEN TRIM(status_agendamento) = '175' THEN 'No-Show TÃ©cnico'
            WHEN TRIM(status_agendamento) = '177' THEN 'Reagendado'
            WHEN TRIM(status_agendamento) = '179' THEN 'Cancelado pelo Cliente'
            WHEN TRIM(status_agendamento) = '187' THEN 'Cancelado pelo Time'
            WHEN TRIM(status_agendamento) = '189' THEN 'Aguardando Agendamento'
            WHEN TRIM(status_agendamento) = '205' THEN 'Aguardando Agendamento'
            WHEN TRIM(status_agendamento) = '209' THEN 'Confirmado'
            WHEN TRIM(status_agendamento) = '211' THEN 'Realizado'
            WHEN TRIM(status_agendamento) = '213' THEN 'No-Show'
            WHEN TRIM(status_agendamento) = '215' THEN 'No-Show TÃ©cnico'
            WHEN TRIM(status_agendamento) = '217' THEN 'Reagendado'
            WHEN TRIM(status_agendamento) = '219' THEN 'Cancelado pelo Cliente'
            WHEN TRIM(status_agendamento) = '221' THEN 'Cancelado pelo Time'
            WHEN TRIM(status_agendamento) = '367' THEN 'Desqualificado'
            WHEN TRIM(status_agendamento) = '369' THEN 'Sem perfil'
            WHEN TRIM(status_agendamento) = '371' THEN 'Comprou no pitch'
            WHEN TRIM(status_agendamento) = '373' THEN 'Comprou c/ comercial'
            ELSE COALESCE(NULLIF(TRIM(status_agendamento), ''), 'Nao informado')
          END AS tipo_no_show
        FROM base
      )
      SELECT tipo_no_show, COUNT(*) AS quantidade
      FROM classificacao
      GROUP BY tipo_no_show
      ORDER BY quantidade DESC;
      `,
      params
    ),
    readOnlyQuery<{ faixa_renda: string; qtd_agendamentos: string }>(
      `
      WITH base AS (
        SELECT ${incomeCase} AS faixa_renda
        ${baseJoins}
        LEFT JOIN dw_bitrix.sat_deal_consultoria
          ON dw_bitrix.fact_deal_agendamentos.bitrix_deal_id = dw_bitrix.sat_deal_consultoria.bitrix_deal_id
        ${createdAtWhere}
          ${newAppointmentClause}
      )
      SELECT faixa_renda, COUNT(*) AS qtd_agendamentos
      FROM base
      GROUP BY faixa_renda
      ORDER BY faixa_renda;
      `,
      params
    ),
    readOnlyQuery<{ dia: string; faixa_renda: string; qtd_agendamentos: string }>(
      `
      WITH base AS (
        SELECT
          dw_bitrix.fact_deal_agendamentos.data_agendamento::date AS dia,
          ${incomeCase} AS faixa_renda
        ${baseJoins}
        LEFT JOIN dw_bitrix.sat_deal_consultoria
          ON dw_bitrix.fact_deal_agendamentos.bitrix_deal_id = dw_bitrix.sat_deal_consultoria.bitrix_deal_id
        ${scheduledDateWhere}
          ${validMeetingClause}
      )
      SELECT dia::text, faixa_renda, COUNT(*) AS qtd_agendamentos
      FROM base
      GROUP BY dia, faixa_renda
      ORDER BY dia ASC, faixa_renda ASC;
      `,
      params
    ),
    readOnlyQuery<{
      nome_cliente: string | null;
      nome_closer: string | null;
      nome_sdr: string | null;
      data_agendamento: string | null;
      status_agendamento: string | null;
    }>(
      `
      SELECT
        dw_bitrix.fact_deals_current.title AS nome_cliente,
        closer.nome_usuario AS nome_closer,
        sdr.nome_usuario AS nome_sdr,
        dw_bitrix.fact_deal_agendamentos.data_agendamento::text AS data_agendamento,
        dw_bitrix.fact_deal_agendamentos.status_agendamento
      ${baseJoins}
      LEFT JOIN dw_bitrix.dim_usuario_bitrix AS closer
        ON dw_bitrix.fact_deals_current.closer_user_id = closer.user_id
      LEFT JOIN dw_bitrix.dim_usuario_bitrix AS sdr
        ON dw_bitrix.fact_deals_current.sdr_user_id = sdr.user_id
      ${scheduledDateWhere}
        ${validMeetingClause}
      ORDER BY
        closer.nome_usuario ASC NULLS LAST,
        dw_bitrix.fact_deal_agendamentos.status_agendamento ASC NULLS LAST,
        dw_bitrix.fact_deal_agendamentos.data_agendamento DESC
      LIMIT 200;
      `,
      params
    ),
    readOnlyQuery<{
      indicador: string;
      agendamento_id: string | null;
      bitrix_deal_id: string | null;
      nome_cliente: string | null;
      data_agendamento: string | null;
      data_criacao: string | null;
      status_agendamento: string | null;
      faixa_renda: string | null;
      nome_closer: string | null;
      nome_sdr: string | null;
      origem_tag: string | null;
      valor_renda: string | null;
      stage_status: string | null;
    }>(
      `
      WITH detalhe AS (
        SELECT
          dw_bitrix.fact_deal_agendamentos.agendamento_id::text AS agendamento_id,
          dw_bitrix.fact_deal_agendamentos.bitrix_deal_id::text AS bitrix_deal_id,
          dw_bitrix.fact_deals_current.title AS nome_cliente,
          dw_bitrix.fact_deal_agendamentos.data_agendamento,
          dw_bitrix.fact_deal_agendamentos.created_at AS data_criacao,
          dw_bitrix.fact_deal_agendamentos.status_agendamento,
          ${incomeCase} AS faixa_renda,
          dw_bitrix.sat_deal_consultoria.renda::text AS valor_renda,
          closer.nome_usuario AS nome_closer,
          sdr.nome_usuario AS nome_sdr,
          COALESCE(
            NULLIF(TRIM(dw_bitrix.sat_deal_consultoria.tag_origem), ''),
            NULLIF(TRIM(dw_bitrix.fact_deals_current.utm_source), ''),
            'Nao informado'
          ) AS origem_tag,
          dw_bitrix.dim_stage.stage_name AS stage_status
        ${baseJoins}
        LEFT JOIN dw_bitrix.sat_deal_consultoria
          ON dw_bitrix.fact_deal_agendamentos.bitrix_deal_id = dw_bitrix.sat_deal_consultoria.bitrix_deal_id
        LEFT JOIN dw_bitrix.dim_usuario_bitrix AS closer
          ON dw_bitrix.fact_deals_current.closer_user_id = closer.user_id
        LEFT JOIN dw_bitrix.dim_usuario_bitrix AS sdr
          ON dw_bitrix.fact_deals_current.sdr_user_id = sdr.user_id
        LEFT JOIN dw_bitrix.dim_stage
          ON dw_bitrix.fact_deals_current.stage_sk = dw_bitrix.dim_stage.stage_sk
        WHERE (
          dw_bitrix.fact_deals_current.title ILIKE '%[Desafio]%'
          OR dw_bitrix.fact_deals_current.pipeline_sk = 3
          OR dw_bitrix.fact_deals_current.funil_sk = 2
        )
          AND ((
          dw_bitrix.fact_deal_agendamentos.data_agendamento IS NOT NULL
          AND dw_bitrix.fact_deal_agendamentos.data_agendamento >= $1::timestamptz
          AND dw_bitrix.fact_deal_agendamentos.data_agendamento < $2::timestamptz
        ) OR (
          dw_bitrix.fact_deal_agendamentos.created_at IS NOT NULL
          AND dw_bitrix.fact_deal_agendamentos.created_at >= $1::timestamptz
          AND dw_bitrix.fact_deal_agendamentos.created_at < $2::timestamptz
        ))
      ),
      indicadores AS (
        SELECT 'Reunioes Agendadas' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          ${detailValidMeetingClause}

        UNION ALL

        SELECT 'Reunioes Realizadas' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          ${detailExcludedStatusClause}
          AND LOWER(TRIM(COALESCE(status_agendamento, ''))) IN ('171', '211', 'realizado')

        UNION ALL

        SELECT 'No-show' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          AND data_agendamento < NOW()
          ${detailNoShowStatusClause}

        UNION ALL

        SELECT 'Tipos de no-show' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          AND data_agendamento < NOW()
          ${detailNoShowStatusClause}

        UNION ALL

        SELECT 'Renda por dia' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          ${detailValidMeetingClause}

        UNION ALL

        SELECT 'Reunioes' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          ${detailValidMeetingClause}

        UNION ALL

        SELECT 'Reunioes Futuras' AS indicador, *
        FROM detalhe
        WHERE data_agendamento IS NOT NULL
          AND data_agendamento >= $1::timestamptz
          AND data_agendamento < $2::timestamptz
          AND data_agendamento > NOW()
          ${detailFutureMeetingClause}

        UNION ALL

        SELECT 'Novos Agendamentos' AS indicador, *
        FROM detalhe
        WHERE data_criacao IS NOT NULL
          AND data_criacao >= $1::timestamptz
          AND data_criacao < $2::timestamptz
          ${detailNewAppointmentClause}

        UNION ALL

        SELECT 'Novos agendamentos por renda' AS indicador, *
        FROM detalhe
        WHERE data_criacao IS NOT NULL
          AND data_criacao >= $1::timestamptz
          AND data_criacao < $2::timestamptz
          ${detailNewAppointmentClause}
      )
      SELECT
        indicador,
        agendamento_id,
        bitrix_deal_id,
        nome_cliente,
        data_agendamento::text AS data_agendamento,
        data_criacao::text AS data_criacao,
        status_agendamento,
        faixa_renda,
        nome_closer,
        nome_sdr,
        origem_tag,
        valor_renda,
        stage_status
      FROM indicadores
      ORDER BY indicador, nome_closer ASC NULLS LAST, status_agendamento ASC NULLS LAST, data_agendamento DESC NULLS LAST;
      `,
      params
    )
  ]);

  const metrics = metricsRows[0] ?? {
    reunioes_agendadas: "0",
    novos_agendamentos: "0",
    reunioes_realizadas: "0",
    reunioes_futuras: "0",
    no_show: "0"
  };

  const noShowByType = new Map(
    noShowRows.map((row) => [row.tipo_no_show, Number(row.quantidade)])
  );
  const incomeByRange = new Map(
    incomeRows.map((row) => [row.faixa_renda, Number(row.qtd_agendamentos)])
  );

  const incomeOrder = ["Acima de 20k", "De 15k Ã  20k", "Nao informado"];

  return {
    metrics: {
      reunioesAgendadas: Number(metrics.reunioes_agendadas),
      novosAgendamentos: Number(metrics.novos_agendamentos),
      reunioesRealizadas: Number(metrics.reunioes_realizadas),
      reunioesFuturas: Number(metrics.reunioes_futuras),
      noShow: Number(metrics.no_show)
    },
    noShowTypes: Array.from(noShowByType, ([tipo, quantidade]) => ({ tipo, quantidade })),
    income: incomeOrder.map((faixa) => ({
      faixa,
      quantidade: incomeByRange.get(faixa) ?? 0
    })),
    incomeByDay: incomeByDayRows.map((row) => ({
      dia: row.dia,
      faixa: row.faixa_renda,
      quantidade: Number(row.qtd_agendamentos)
    })),
    meetings: meetingsRows.map((row) => ({
      nomeCliente: row.nome_cliente ?? "Nao informado",
      nomeCloser: row.nome_closer ?? "Nao informado",
      nomeSdr: row.nome_sdr ?? "Nao informado",
      dataAgendamento: row.data_agendamento,
      statusAgendamento: normalizeAppointmentStatus(row.status_agendamento)
    })),
    validationRows: validationRows.map((row) => ({
      indicador: row.indicador,
      agendamentoId: row.agendamento_id ?? "Nao informado",
      bitrixDealId: row.bitrix_deal_id ?? "Nao informado",
      nomeCliente: row.nome_cliente ?? "Nao informado",
      dataAgendamento: row.data_agendamento,
      dataCriacao: row.data_criacao,
      statusAgendamento: normalizeValidationStatus(row.status_agendamento, row.stage_status),
      faixaRenda: row.faixa_renda ?? "Nao informado",
      nomeCloser: row.nome_closer ?? "Nao informado",
      nomeSdr: row.nome_sdr ?? "Nao informado",
      origemTag: row.origem_tag ?? "Nao informado",
      valorRenda: row.valor_renda ?? "Nao informado",
      stageStatus: row.stage_status ?? "Nao informado"
    })),
    generatedAt: new Date().toISOString()
  };
}

export async function fetchAuxiliaryValues() {
  const [statuses, incomes] = await Promise.all([
    readOnlyQuery<{ status_agendamento: string }>(`
      SELECT DISTINCT
        CASE
          WHEN TRIM(status_agendamento) = '167' THEN 'agendado'
          WHEN TRIM(status_agendamento) = '169' THEN 'confirmado'
          WHEN TRIM(status_agendamento) = '171' THEN 'realizado'
          WHEN TRIM(status_agendamento) = '173' THEN 'no-show'
          WHEN TRIM(status_agendamento) = '175' THEN 'no-show tÃ©cnico'
          WHEN TRIM(status_agendamento) = '177' THEN 'reagendado'
          WHEN TRIM(status_agendamento) = '179' THEN 'cancelado pelo cliente'
          WHEN TRIM(status_agendamento) = '187' THEN 'cancelado pelo time'
          WHEN TRIM(status_agendamento) = '189' THEN 'aguardando agendamento'
          WHEN TRIM(status_agendamento) = '205' THEN 'aguardando agendamento'
          WHEN TRIM(status_agendamento) = '207' THEN 'agendado'
          WHEN TRIM(status_agendamento) = '209' THEN 'confirmado'
          WHEN TRIM(status_agendamento) = '211' THEN 'realizado'
          WHEN TRIM(status_agendamento) = '213' THEN 'no-show'
          WHEN TRIM(status_agendamento) = '215' THEN 'no-show tÃ©cnico'
          WHEN TRIM(status_agendamento) = '217' THEN 'reagendado'
          WHEN TRIM(status_agendamento) = '219' THEN 'cancelado pelo cliente'
          WHEN TRIM(status_agendamento) = '221' THEN 'cancelado pelo time'
          WHEN TRIM(status_agendamento) = '367' THEN 'desqualificado'
          WHEN TRIM(status_agendamento) = '369' THEN 'sem perfil'
          WHEN TRIM(status_agendamento) = '371' THEN 'comprou no pitch'
          WHEN TRIM(status_agendamento) = '373' THEN 'comprou c/ comercial'
          ELSE LOWER(TRIM(status_agendamento))
        END AS status_agendamento
      FROM dw_bitrix.fact_deal_agendamentos
      ORDER BY 1;
    `),
    readOnlyQuery<{ renda: string | null }>(`
      SELECT DISTINCT renda
      FROM dw_bitrix.sat_deal_consultoria
      ORDER BY renda;
    `)
  ]);

  return { statuses, incomes, generatedAt: new Date().toISOString() };
}
