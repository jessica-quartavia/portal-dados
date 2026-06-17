-- =============================================================================
-- dw_bitrix.vw_comercial_agendamentos_portal
--
-- View de apresentação para o dashboard /dashboards/comercial.
-- Substitui consultas SQL diretas (pg) do projeto Next dashboard-iapmai26.
--
-- PRÉ-REQUISITOS:
--   1. Schema dw_bitrix exposto na Supabase Data API
--   2. GRANT SELECT para authenticated (ver final do arquivo)
--
-- NOTA: Esta é uma PROPOSTA inicial. A lógica de classificação de status e
-- faixa de renda deve ser validada contra o SQL original em
-- dados-dashboard-produto-main/Comercial/dashboard-iapmai26/lib/dashboard-service.ts
-- =============================================================================

CREATE OR REPLACE VIEW dw_bitrix.vw_comercial_agendamentos_portal AS
WITH base AS (
  SELECT
    ag.agendamento_id,
    ag.bitrix_deal_id,
    ag.data_agendamento,
    ag.created_at,
    ag.status_agendamento,
    dc.title                                           AS nome_cliente,
    dc.pipeline_sk,
    dc.funil_sk,
    dc.closer_user_id,
    dc.sdr_user_id,
    st.stage_name,
    con.renda                                          AS valor_renda_raw,
    COALESCE(
      NULLIF(TRIM(con.tag_origem), ''),
      NULLIF(TRIM(dc.utm_source), ''),
      'Nao informado'
    )                                                  AS origem_tag,
    closer.nome_usuario                                AS nome_closer,
    sdr.nome_usuario                                   AS nome_sdr
  FROM dw_bitrix.fact_deal_agendamentos ag
  LEFT JOIN dw_bitrix.fact_deals_current dc
    ON ag.bitrix_deal_id = dc.bitrix_deal_id
  LEFT JOIN dw_bitrix.dim_stage st
    ON dc.stage_sk = st.stage_sk
  LEFT JOIN dw_bitrix.sat_deal_consultoria con
    ON ag.bitrix_deal_id = con.bitrix_deal_id
  LEFT JOIN dw_bitrix.dim_usuario_bitrix closer
    ON dc.closer_user_id = closer.user_id
  LEFT JOIN dw_bitrix.dim_usuario_bitrix sdr
    ON dc.sdr_user_id = sdr.user_id
  WHERE (
    dc.title ILIKE '%[Desafio]%'
    OR dc.pipeline_sk = 3
    OR dc.funil_sk = 2
  )
  AND LOWER(TRIM(COALESCE(ag.status_agendamento, ''))) NOT IN (
    '371', '373', 'comprou no pitch', 'comprou no pit', 'comprou c/ comercial'
  )
),
renda_classificada AS (
  SELECT
    b.*,
    CASE
      WHEN b.valor_renda_raw IS NULL OR TRIM(b.valor_renda_raw::text) = ''
        THEN 'Nao informado'
      WHEN LOWER(TRIM(b.valor_renda_raw::text)) IN (
        'ate 10 mil', 'até 10 mil', 'entre 10 e 15 mil', 'entre 15 e 20 mil'
      ) THEN 'De 15k à 20k'
      WHEN LOWER(TRIM(b.valor_renda_raw::text)) IN (
        'entre 20 mil e 30 mil', 'entre 30 mil e 50 mil',
        'entre 50 mil e 100 mil', 'acima de 100 mil'
      ) THEN 'Acima de 20k'
      ELSE 'Nao informado'
    END AS faixa_renda
  FROM base b
)
SELECT
  agendamento_id::text,
  bitrix_deal_id::text,
  nome_cliente,
  COALESCE(nome_closer, 'Nao informado')  AS nome_closer,
  COALESCE(nome_sdr, 'Nao informado')     AS nome_sdr,
  data_agendamento,
  created_at,
  status_agendamento,
  stage_name,
  faixa_renda,
  valor_renda_raw::text                   AS valor_renda,
  origem_tag,
  -- Flags derivados para agregação no frontend (simplificados; validar contra dashboard-service.ts)
  (COALESCE(TRIM(status_agendamento), '') <> ''
   AND TRIM(status_agendamento) NOT IN ('189', '205'))                          AS is_reuniao_agendada,
  (LOWER(TRIM(COALESCE(status_agendamento, ''))) IN ('167', '207', 'agendado')) AS is_novo_agendamento,
  (LOWER(TRIM(COALESCE(status_agendamento, ''))) IN ('171', '211', 'realizado')) AS is_realizada,
  (data_agendamento > NOW()
   AND COALESCE(TRIM(status_agendamento), '') <> ''
   AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado')) AS is_futura,
  (data_agendamento < NOW()
   AND (
     (COALESCE(TRIM(status_agendamento), '') <> ''
      AND LOWER(TRIM(status_agendamento)) NOT IN ('189', '205', 'aguardando agendamento')
      AND LOWER(TRIM(COALESCE(status_agendamento, ''))) NOT IN ('171', '211', 'realizado'))
     OR (LOWER(TRIM(COALESCE(stage_name, ''))) = 'aguardando reagendamento'
         AND (COALESCE(TRIM(status_agendamento), '') = ''
              OR LOWER(TRIM(status_agendamento)) IN ('189', '205', 'aguardando agendamento')))
   )) AS is_no_show
FROM renda_classificada;

-- Permissão para usuários autenticados do portal
GRANT SELECT ON dw_bitrix.vw_comercial_agendamentos_portal TO authenticated;

-- Verificação rápida após publicar:
-- SELECT COUNT(*) FROM dw_bitrix.vw_comercial_agendamentos_portal;
