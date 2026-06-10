-- =============================================================================
-- dw_bitrix.vw_pulso_desafio_agendamentos_portal
-- View operacional para o dashboard Pulso Desafio — Agendamentos.
--
-- Nota: a camada ideal seria portal_dash (schema de apresentação isolado),
-- mas portal_dash não está exposto na Supabase Data API e não há acesso
-- administrativo para alterar isso. A view fica temporariamente em dw_bitrix,
-- que já está exposto. Se portal_dash for exposto no futuro, migrar com:
--   CREATE OR REPLACE VIEW portal_dash.vw_pulso_desafio_agendamentos AS
--     SELECT * FROM dw_bitrix.vw_pulso_desafio_agendamentos_portal;
--
-- ATENÇÃO: verifique os nomes de coluna das novas dimensões abaixo antes de
-- executar. Colunas marcadas com "-- confirmar" podem precisar de ajuste.
-- Use a query no final do arquivo para inspecionar a estrutura real.
-- =============================================================================

CREATE OR REPLACE VIEW dw_bitrix.vw_pulso_desafio_agendamentos_portal AS
WITH base AS (
  SELECT
    ag.agendamento_id,
    ag.bitrix_deal_id,
    ag.data_agendamento,
    ag.ordem_agendamento,
    ag.status_agendamento,

    -- desafio
    des.tag_desafio                  AS desafio_tag,

    -- deal
    dc.contact_id,
    dc.title                         AS cliente_nome,
    dc.email_original                AS email,
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

    -- funil / pipeline (confirmar nomes de coluna)
    fu.funil_nome,                   -- confirmar: pode ser funil_name, nome, etc.
    pp.pipeline_nome,                -- confirmar: pode ser pipeline_name, nome, etc.

    -- contato (confirmar nomes de coluna)
    ct.full_name                     AS contact_nome,  -- confirmar: pode ser nome_completo, nome, etc.

    -- responsável (confirmar nomes de coluna)
    us.nome                          AS responsavel_nome, -- confirmar: pode ser user_name, full_name, etc.

    -- renda
    con.renda                        AS renda_raw,

    -- cancelamento wpp
    wpp.condicao_cancelamento

  FROM dw_bitrix.fact_deal_agendamentos     ag

  LEFT JOIN dw_bitrix.sat_deal_desafio      des ON des.bitrix_deal_id = ag.bitrix_deal_id
  LEFT JOIN dw_bitrix.fact_deals_current    dc  ON dc.bitrix_deal_id  = ag.bitrix_deal_id
  LEFT JOIN dw_bitrix.dim_stage             st  ON st.stage_sk        = dc.stage_sk
                                               AND st.is_current      = true
  LEFT JOIN dw_bitrix.dim_funil             fu  ON fu.funil_sk        = dc.funil_sk    -- confirmar FK
  LEFT JOIN dw_bitrix.dim_pipeline          pp  ON pp.pipeline_sk     = dc.pipeline_sk -- confirmar FK
  LEFT JOIN dw_bitrix.vw_contacts_base      ct  ON ct.contact_id      = dc.contact_id  -- confirmar FK
  LEFT JOIN dw_bitrix.dim_usuario_bitrix    us  ON us.user_id         = dc.responsavel_user_id -- confirmar FK e coluna nome
  LEFT JOIN dw_bitrix.sat_deal_consultoria  con ON con.bitrix_deal_id = ag.bitrix_deal_id
  LEFT JOIN dw_bitrix.wpp_agendamentos      wpp ON wpp.agendamento_id = ag.agendamento_id
),

com_grupo AS (
  SELECT
    *,
    -- Normalização do status em grupo canônico (prioridade de cima para baixo)
    CASE
      WHEN status_agendamento ILIKE '%absoluto%'                               THEN 'no_show_absoluto'
      WHEN status_agendamento ILIKE '%comercial%'                              THEN 'no_show_comercial'
      WHEN status_agendamento ILIKE '%reagend%'
        OR  condicao_cancelamento ILIKE '%reagend%'                            THEN 'reagendamento'
      WHEN status_agendamento ILIKE '%cancel%'
        OR  condicao_cancelamento ILIKE '%cancel%'                             THEN 'cancelamento'
      WHEN status_agendamento ILIKE '%realiz%'                                 THEN 'realizada'
      WHEN status_agendamento ILIKE '%futur%'
        OR  (data_agendamento IS NOT NULL AND data_agendamento > now())        THEN 'futura'
      WHEN status_agendamento ILIKE '%no%show%'                                THEN 'no_show'
      ELSE 'outro'
    END AS status_grupo,

    -- Conversão renda_raw → numérico (formato: R$ 15.000,00)
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
  COALESCE(contact_nome, cliente_nome)  AS cliente_nome,  -- contato tem precedência sobre title
  email,
  desafio_tag,
  data_agendamento,
  data_agendamento::date                AS data_referencia,
  status_agendamento,
  status_grupo,
  condicao_cancelamento,
  ordem_agendamento,
  stage_name,
  stage_group,
  stage_order,
  funil_nome,
  pipeline_nome,
  renda_raw,
  renda_valor,
  CASE
    WHEN renda_valor IS NULL THEN 'nao_informado'
    WHEN renda_valor > 20000 THEN 'acima_20k'
    ELSE                          'ate_20k'
  END                                   AS renda_bucket,
  COALESCE(responsavel_nome, responsavel_user_id) AS responsavel_nome,
  responsavel_user_id,
  sdr_user_id,
  closer_user_id,
  creation_date,
  modify_date,
  last_captured_at

FROM com_grupo;

-- ── Permissões ────────────────────────────────────────────────────────────────
GRANT SELECT ON dw_bitrix.vw_pulso_desafio_agendamentos_portal TO authenticated;

-- Para testes locais com anon key (dev):
-- GRANT SELECT ON dw_bitrix.vw_pulso_desafio_agendamentos_portal TO anon;


-- ── Discovery: confirme as colunas das novas dimensões antes de executar ──────
-- Execute isso separadamente para verificar a estrutura real:
--
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'dw_bitrix'
--   AND table_name IN (
--     'dim_funil', 'dim_pipeline', 'vw_contacts_base',
--     'dim_usuario_bitrix', 'sat_deal_webinario'
--   )
-- ORDER BY table_name, ordinal_position;
