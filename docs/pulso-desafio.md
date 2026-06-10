# Pulso Desafio — Agendamentos

## Objetivo

Automatizar o report manual de agendamentos dos desafios da Bitrix.  
O dashboard mostra em tempo real o volume de agendas, realizações, no-shows e renda dos leads de cada campanha/desafio.

## Rota

`/dashboards/pulso-desafio`

## Fonte de dados

Projeto Supabase: **Business Data** (`rckpuebaiswrxzmywllv`)  
Schema atual: `dw_bitrix` (ver nota abaixo)  
View: `dw_bitrix.vw_pulso_desafio_agendamentos_portal`

> **Nota sobre schema:** a camada ideal seria `portal_dash` (schema de apresentação isolado, sem acesso direto às tabelas brutas). Porém, `portal_dash` não está na lista de schemas expostos na Supabase Data API, e não há acesso administrativo para alterar isso em **Project Settings → API → Data API Settings → Exposed schemas**. Por isso, a view operacional fica temporariamente em `dw_bitrix`, que já está exposto. Se no futuro alguém com acesso expuser `portal_dash`, basta criar um alias lá:
> ```sql
> CREATE OR REPLACE VIEW portal_dash.vw_pulso_desafio_agendamentos AS
>   SELECT * FROM dw_bitrix.vw_pulso_desafio_agendamentos_portal;
> ```
> e alterar as duas constantes em `src/lib/pulsoDesafio.ts` de volta para `portal_dash`.

### Tabelas usadas

| Tabela | Schema | Uso |
|--------|--------|-----|
| `fact_deal_agendamentos` | `dw_bitrix` | Registros de agendamento (base principal) |
| `sat_deal_desafio` | `dw_bitrix` | Tag do desafio/campanha |
| `fact_deals_current` | `dw_bitrix` | Dados do deal: nome, email, responsável, etapa |
| `dim_stage` | `dw_bitrix` | Nome e grupo da etapa CRM |
| `sat_deal_consultoria` | `dw_bitrix` | Renda declarada do lead |
| `wpp_agendamentos` | `dw_bitrix` | Condição de cancelamento (WhatsApp) |

## Regra de desafio / tag

O campo `desafio_tag` vem de `sat_deal_desafio.tag_desafio`.  
Cada campanha tem uma tag única (ex: `IAPMAI26`).  
**Todos os KPIs, gráficos e a tabela são filtrados por esse campo.**

## KPIs

| KPI | Regra |
|-----|-------|
| Agendas | `COUNT(*)` dos registros filtrados |
| Realizadas | `status_grupo = 'realizada'` |
| Futuras | `status_grupo = 'futura'` |
| No-show | `status_grupo = 'no_show'` |
| Novos agendamentos | `ordem_agendamento = 1` (primeiro contato do lead) |
| Cancelamentos | `status_grupo = 'cancelamento'` |
| No-show absoluto | `status_grupo = 'no_show_absoluto'` |
| No-show comercial | `status_grupo = 'no_show_comercial'` |
| Re-agendamentos | `status_grupo = 'reagendamento'` |
| Acima de 20k | `renda_bucket = 'acima_20k'` |
| Até 20k | `renda_bucket = 'ate_20k'` |
| Não informado | `renda_bucket = 'nao_informado'` |

## Regra de status_grupo

Prioridade de cima para baixo:

1. `no_show_absoluto` — `status_agendamento ILIKE '%absoluto%'`
2. `no_show_comercial` — `status_agendamento ILIKE '%comercial%'`
3. `reagendamento` — `status_agendamento ILIKE '%reagend%'` OU `condicao_cancelamento ILIKE '%reagend%'`
4. `cancelamento` — `status_agendamento ILIKE '%cancel%'` OU `condicao_cancelamento ILIKE '%cancel%'`
5. `realizada` — `status_agendamento ILIKE '%realiz%'`
6. `futura` — `status_agendamento ILIKE '%futur%'` OU `data_agendamento > now()`
7. `no_show` — `status_agendamento ILIKE '%no%show%'`
8. `outro` — qualquer outro caso

## Regras de renda

Origem: `sat_deal_consultoria.renda` (campo texto, ex: `R$ 15.000,00`).

Conversão para numérico:
- Remove `R$` e espaços
- Remove pontos de milhar
- Troca vírgula por ponto decimal
- Converte com `::numeric`

Bucket:
- `acima_20k` — `renda_valor > 20000`
- `ate_20k` — `renda_valor <= 20000`
- `nao_informado` — `renda_valor IS NULL`

## Filtros disponíveis

| Filtro | Campo | Tipo |
|--------|-------|------|
| Desafio | `desafio_tag` | Select obrigatório para dados |
| Data início | `data_agendamento` | Date (≥) |
| Data fim | `data_agendamento` | Date (≤) |
| Funil / etapa | `stage_name` | Select (opções dinâmicas por desafio) |
| Renda | `renda_bucket` | Select (3 opções fixas) |
| Status | `status_grupo` | Select (8 opções fixas) |

## Atualização dos dados

- Botão "Atualizar agora" dispara refetch manual.
- Refetch automático ao recuperar foco na janela do browser.
- Sem polling ativo (não há subscrição realtime neste dashboard; a view `portal_dash` não suporta realtime diretamente).

## Permissões e configuração da Data API

### 1. Expor o schema na Data API do Supabase

O cliente JS (`@supabase/supabase-js`) só consegue chamar `.schema('portal_dash')` se o schema estiver na lista de schemas expostos. Sem isso, a consulta falha com:

> *"The schema must be one of the following: public, graphql_public, …"*

**Como configurar:**

1. Acesse o painel do projeto Business Data (`rckpuebaiswrxzmywllv`)
2. Vá em **Project Settings → API → Data API Settings**
3. Em **Exposed schemas**, adicione `portal_dash`
4. Salve — nenhum redeploy é necessário

### 2. Grants de banco de dados

Execute no SQL Editor (projeto Business Data):

```sql
-- Usuários autenticados (produção)
GRANT SELECT ON dw_bitrix.vw_pulso_desafio_agendamentos_portal TO authenticated;

-- Anon key (necessário apenas para testes locais com anon key)
-- GRANT SELECT ON dw_bitrix.vw_pulso_desafio_agendamentos_portal TO anon;
```

> Não é necessário conceder acesso ao schema `dw_bitrix` inteiro: o grant de `SELECT` na view específica é suficiente, pois `dw_bitrix` já está exposto na Data API. O frontend não tem acesso às tabelas brutas do schema.

## Limitações

- A tabela exibe no máximo 500 linhas; use os filtros para refinar.
- Realtime não está disponível em views Supabase — os dados são atualizados por refetch manual/foco.
- O campo `renda` é texto livre no Bitrix; formatos inesperados podem gerar `renda_valor NULL`.

## Próximos passos

- [ ] Confirmar chaves de join das tabelas de agenda após discovery completo no Supabase.
- [ ] Validar se `wpp_agendamentos.agendamento_id` faz join correto com `fact_deal_agendamentos.agendamento_id`.
- [ ] Avaliar paginação na tabela operacional se volume crescer.
- [ ] Adicionar exportação CSV.
- [ ] Avaliar realtime via subscrição nas tabelas base + refetch da view.
