# Pulso Desafio — Discovery

## Tabelas analisadas

### `dw_bitrix.fact_deal_agendamentos` (base principal)

| Coluna | Tipo | Notas |
|--------|------|-------|
| `agendamento_id` | PK | Identificador único do agendamento |
| `bitrix_deal_id` | FK | Join com `sat_deal_desafio`, `fact_deals_current` |
| `data_agendamento` | timestamp | Data/hora da agenda |
| `ordem_agendamento` | int | 1 = novo agendamento do lead |
| `status_agendamento` | text | Texto livre (normalizado em `status_grupo`) |

### `dw_bitrix.sat_deal_desafio`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `bitrix_deal_id` | PK/FK | Join com `fact_deal_agendamentos` |
| `tag_desafio` | text | Código da campanha (ex: `IAPMAI26`) |
| `tag_venda` | text | Tag complementar de venda |
| `tag_origem` | text | Canal de origem |
| `vip` | bool | Flag VIP |
| `cash_comprometido` | numeric | Valor comprometido |

### `dw_bitrix.fact_deals_current`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `bitrix_deal_id` | PK/FK | Join principal |
| `contact_id` | FK | ID do contato |
| `stage_sk` | FK | Join com `dim_stage` |
| `responsavel_user_id` | text | Responsável atual |
| `sdr_user_id` | text | SDR |
| `closer_user_id` | text | Closer |
| `title` | text | Nome do deal (usado como `cliente_nome`) |
| `email_original` | text | E-mail |
| `opportunity_value` | numeric | Valor da oportunidade |

### `dw_bitrix.dim_stage`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `stage_sk` | PK | Join com `fact_deals_current.stage_sk` |
| `stage_name` | text | Nome da etapa |
| `stage_group` | text | Grupo da etapa (ganho/perdido/em aberto) |
| `stage_order` | int | Ordem na pipeline |
| `is_current` | bool | Filtrar com `is_current = true` |

### `dw_bitrix.sat_deal_consultoria`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `bitrix_deal_id` | FK | Join com `fact_deal_agendamentos` |
| `renda` | text | Renda declarada em formato texto (ex: `R$ 15.000,00`) |

### `dw_bitrix.wpp_agendamentos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `agendamento_id` | FK | Join com `fact_deal_agendamentos.agendamento_id` |
| `condicao_cancelamento` | text | Motivo do cancelamento via WhatsApp |

### `dw_bitrix.fact_deal_eventos` (não utilizado nesta versão)

| Coluna | Tipo | Notas |
|--------|------|-------|
| `status_agenda` | text | Status alternativo (não priorizado) |
| `tipo_agenda` | text | Tipo do evento |

### `dw_bitrix.fact_meetings` (não utilizado nesta versão)

| Coluna | Tipo | Notas |
|--------|------|-------|
| `meeting_date` | timestamp | Data da reunião |

## Joins utilizados

```sql
fact_deal_agendamentos ag
LEFT JOIN sat_deal_desafio   des ON des.bitrix_deal_id = ag.bitrix_deal_id
LEFT JOIN fact_deals_current dc  ON dc.bitrix_deal_id  = ag.bitrix_deal_id
LEFT JOIN dim_stage          st  ON st.stage_sk        = dc.stage_sk AND st.is_current = true
LEFT JOIN sat_deal_consultoria con ON con.bitrix_deal_id = ag.bitrix_deal_id
LEFT JOIN wpp_agendamentos   wpp ON wpp.agendamento_id  = ag.agendamento_id
```

Todos LEFT JOIN para não perder agendamentos sem satélites preenchidos.

## Dúvidas pendentes

- [ ] **`wpp_agendamentos.agendamento_id`** — confirmar se este campo faz join 1-1 com `fact_deal_agendamentos.agendamento_id` ou se é um ID diferente. Se não houver join, remover da view e `condicao_cancelamento` ficará sempre NULL.
- [ ] **`fact_deal_eventos`** — verificar se `status_agenda` complementa ou duplica `status_agendamento`. Avaliar merge futuro.
- [ ] **`fact_meetings`** — verificar chave de join (bitrix_deal_id? agendamento_id?). Pode enriquecer a data da reunião realizada.
- [ ] **Cardinalidade `sat_deal_consultoria`** — confirmar se é 1-1 por `bitrix_deal_id` ou pode ter múltiplas linhas (histórico). Se múltiplas, precisará de `DISTINCT ON` ou `LIMIT 1`.

## Decisões de modelagem

| Decisão | Motivo |
|---------|--------|
| View em `portal_dash`, não expor `dw_bitrix` | Segurança: anon key não acessa tabelas brutas |
| `fact_deals_current` (não histórica) | Queremos estado atual do deal |
| `dim_stage` filtrado por `is_current = true` | Evita duplicatas por SCD tipo 2 |
| `title` como `cliente_nome` | Campo mais consistente; `contact_name` não mapeado |
| Normalização de `renda` com REGEXP | Campo texto livre, necessário saneamento |
| `status_grupo` por prioridade CASE WHEN | Garante categoria única por agenda |
| LEFT JOIN em todos os satélites | Preserva todos os agendamentos mesmo sem dados complementares |

## Query de discovery para confirmar estrutura

Execute no SQL Editor do Supabase (projeto Business Data):

```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'dw_bitrix'
  AND table_name IN (
    'fact_deal_agendamentos',
    'fact_deal_eventos',
    'fact_meetings',
    'sat_deal_consultoria',
    'wpp_agendamentos'
  )
ORDER BY table_name, ordinal_position;
```
