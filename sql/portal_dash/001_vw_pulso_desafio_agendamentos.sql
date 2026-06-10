-- =============================================================================
-- portal_dash.vw_pulso_desafio_agendamentos
-- Camada de apresentação para o dashboard Pulso Desafio — Agendamentos.
-- Fonte: dw_bitrix (fact_deal_agendamentos, sat_deal_desafio, fact_deals_current,
--        dim_stage, sat_deal_consultoria, wpp_agendamentos)
-- =============================================================================

CREATE OR REPLACE VIEW portal_dash.vw_pulso_desafio_agendamentos AS
WITH base AS (
  SELECT
    ag.agendamento_id,
    ag.bitrix_deal_id,
    ag.data_agendamento,
    ag.ordem_agendamento,
    ag.status_agendamento,
    -- desafio / tag
    des.tag_desafio         AS desafio_tag,
    -- deal
    dc.contact_id,
    dc.title                AS cliente_nome,
    dc.email_original       AS email,
    dc.pipeline_sk,
    dc.funil_sk,
    dc.stage_sk,
    dc.sdr_user_id,
    dc.closer_user_id,
    dc.responsavel_user_id,
    dc.opportunity_value,
    dc.creation_date,
    dc.modify_date,
    dc.data_de_venda,
    dc.last_captured_at,
    -- stage
    st.stage_name,
    st.stage_group,
    st.stage_order,
    -- renda
    con.renda               AS renda_raw,
    -- cancelamento (wpp)
    wpp.condicao_cancelamento
  FROM dw_bitrix.fact_deal_agendamentos  ag
  LEFT JOIN dw_bitrix.sat_deal_desafio   des ON des.bitrix_deal_id = ag.bitrix_deal_id
  LEFT JOIN dw_bitrix.fact_deals_current dc  ON dc.bitrix_deal_id  = ag.bitrix_deal_id
  LEFT JOIN dw_bitrix.dim_stage          st  ON st.stage_sk        = dc.stage_sk
                                             AND st.is_current      = true
  LEFT JOIN dw_bitrix.sat_deal_consultoria con ON con.bitrix_deal_id = ag.bitrix_deal_id
  LEFT JOIN dw_bitrix.wpp_agendamentos   wpp ON wpp.agendamento_id  = ag.agendamento_id
),
com_grupo AS (
  SELECT
    *,
    -- Normalização do status em grupo canônico
    CASE
      WHEN status_agendamento ILIKE '%absoluto%'                                  THEN 'no_show_absoluto'
      WHEN status_agendamento ILIKE '%comercial%'                                 THEN 'no_show_comercial'
      WHEN status_agendamento ILIKE '%reagend%'
        OR condicao_cancelamento ILIKE '%reagend%'                                THEN 'reagendamento'
      WHEN status_agendamento ILIKE '%cancel%'
        OR condicao_cancelamento ILIKE '%cancel%'                                 THEN 'cancelamento'
      WHEN status_agendamento ILIKE '%realiz%'                                    THEN 'realizada'
      WHEN status_agendamento ILIKE '%futur%'
        OR (data_agendamento IS NOT NULL AND data_agendamento > now())            THEN 'futura'
      WHEN status_agendamento ILIKE '%no%show%'                                   THEN 'no_show'
      ELSE 'outro'
    END AS status_grupo,
    -- Conversão renda_raw → numérico
    NULLIF(
      REGEXP_REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(COALESCE(renda_raw, ''), 'R$', ''),
            '.', ''
          ),
          ',', '.'
        ),
        '[^0-9.]', '', 'g'
      ),
      ''
    )::numeric AS renda_valor
  FROM base
)
SELECT
  agendamento_id,
  bitrix_deal_id,
  contact_id,
  cliente_nome,
  email,
  desafio_tag,
  data_agendamento,
  data_agendamento::date            AS data_referencia,
  status_agendamento,
  status_grupo,
  condicao_cancelamento,
  ordem_agendamento,
  stage_name,
  stage_group,
  stage_order,
  renda_raw,
  renda_valor,
  CASE
    WHEN renda_valor IS NULL  THEN 'nao_informado'
    WHEN renda_valor > 20000  THEN 'acima_20k'
    ELSE                           'ate_20k'
  END                               AS renda_bucket,
  responsavel_user_id,
  sdr_user_id,
  closer_user_id,
  creation_date,
  modify_date,
  last_captured_at
FROM com_grupo;

-- ── Permissões ────────────────────────────────────────────────────────────────
GRANT USAGE  ON SCHEMA portal_dash                              TO authenticated;
GRANT SELECT ON portal_dash.vw_pulso_desafio_agendamentos       TO authenticated;
