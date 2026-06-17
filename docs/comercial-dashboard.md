# Comercial — Agendamentos

## Objetivo

Migrar o dashboard Next.js `dashboard-iapmai26` para o portal Astro em `/dashboards/comercial`.  
Acompanha agendamentos do funil desafio (Bitrix): reuniões, no-shows, renda e validação nominal.

## Rota

`/dashboards/comercial`

## Estado atual da migração

| Item | Status |
|------|--------|
| Página Astro + componentes visuais | ✅ Implementado |
| `fetchComercialDashboard()` via Supabase JS | ✅ Implementado (`src/lib/comercial.ts`) |
| View `vw_comercial_agendamentos_portal` | ⏳ Publicar SQL + GRANT no Business Data |

O dashboard tenta carregar dados automaticamente. Se a view não existir ou faltar permissão, exibe banner informativo sem quebrar a tela.

### Cliente

```typescript
import { getAuthSupabase } from './supabaseAuthClient';
// schema: dw_bitrix
// view: vw_comercial_agendamentos_portal
```

## Fonte de dados (origem Next.js)

O dashboard original consultava PostgreSQL direto (`pg`) no projeto **Business Data** (`rckpuebaiswrxzmywllv`), schema `dw_bitrix`.

### Tabelas usadas nas queries SQL originais

| Tabela | Uso |
|--------|-----|
| `dw_bitrix.fact_deal_agendamentos` | Base de agendamentos: datas, status, IDs |
| `dw_bitrix.fact_deals_current` | Título do deal, pipeline, funil, closer/SDR |
| `dw_bitrix.sat_deal_consultoria` | Renda, tag de origem |
| `dw_bitrix.dim_stage` | Nome da etapa (ex.: Aguardando Reagendamento) |
| `dw_bitrix.dim_usuario_bitrix` | Nome do closer e do SDR |

### Filtro de escopo (fixo no SQL original)

Todo registro deve satisfazer **pelo menos uma** condição:

- `fact_deals_current.title ILIKE '%[Desafio]%'`
- `fact_deals_current.pipeline_sk = 3`
- `fact_deals_current.funil_sk = 2`

### Status excluídos globalmente

`371`, `373`, `comprou no pitch`, `comprou no pit`, `comprou c/ comercial`

## Credenciais no portal

Reaproveitar o cliente de auth (mesmo projeto Business Data):

```env
PUBLIC_AUTH_SUPABASE_URL=https://rckpuebaiswrxzmywllv.supabase.co
PUBLIC_AUTH_SUPABASE_ANON_KEY=your-business-data-anon-key
```

Padrão de acesso: `getAuthSupabase().schema('dw_bitrix').from('vw_comercial_agendamentos_portal')` — igual ao Pulso Desafio.

## View proposta

`dw_bitrix.vw_comercial_agendamentos_portal`

Arquivo SQL: [`sql/dw_bitrix/002_vw_comercial_agendamentos_portal.sql`](../sql/dw_bitrix/002_vw_comercial_agendamentos_portal.sql)

A view deve expor, por linha de agendamento, os campos necessários para o frontend agregar métricas no browser (ou via RPC futura).

### Colunas mínimas sugeridas

| Coluna | Origem | Uso |
|--------|--------|-----|
| `agendamento_id` | `fact_deal_agendamentos` | Validação, chave |
| `bitrix_deal_id` | `fact_deal_agendamentos` | Validação |
| `nome_cliente` | `fact_deals_current.title` | Tabela reuniões |
| `nome_closer` | `dim_usuario_bitrix` (closer) | Tabela reuniões |
| `nome_sdr` | `dim_usuario_bitrix` (sdr) | Tabela reuniões |
| `data_agendamento` | `fact_deal_agendamentos` | Filtro período, KPIs |
| `created_at` | `fact_deal_agendamentos` | Novos agendamentos |
| `status_agendamento` | `fact_deal_agendamentos` | Normalização de status |
| `status_agendamento_label` | derivado | Exibição |
| `stage_name` | `dim_stage` | Regra de reagendamento |
| `faixa_renda` | derivado de `sat_deal_consultoria.renda` | Gráficos de renda |
| `valor_renda` | `sat_deal_consultoria.renda` | Validação |
| `origem_tag` | `sat_deal_consultoria.tag_origem` ou `utm_source` | Validação |
| `escopo_desafio` | derivado (pipeline/funil/título) | Filtro fixo pré-aplicado na view |

## Métricas → dependência de dados

| Métrica / bloco | Campo de data | Regra resumida |
|-----------------|---------------|----------------|
| **Reuniões Agendadas** | `data_agendamento` | Status preenchido, não 189/205, exclui compra/comercial |
| **Novos Agendamentos** | `created_at` | Status ∈ {167, 207, agendado}, exclui compra/comercial |
| **Reuniões Realizadas** | `data_agendamento` | Status ∈ {171, 211, realizado} |
| **Reuniões Futuras** | `data_agendamento` | `> now()`, não realizado, status preenchido |
| **No-show** | `data_agendamento` | `< now()`, não realizado, não aguardando; ou stage = Aguardando Reagendamento |
| **Tipos de no-show** | `data_agendamento` | Agrupa status do conjunto no-show |
| **Novos agend. por renda** | `created_at` | Mesma base de Novos Agendamentos + `faixa_renda` |
| **Renda por dia** | `data_agendamento` | Mesma base de Reuniões Agendadas + dia + faixa |
| **Tabela Reuniões** | `data_agendamento` | Até 200 linhas, base Reuniões Agendadas |
| **Validação nominal** | `data_agendamento` / `created_at` | UNION por indicador (ver SQL original) |

### Faixas de renda (classificação)

| Faixa | Regra |
|-------|-------|
| Acima de 20k | Textos altos ou numérico ≥ 20.000 |
| De 15k à 20k | Textos médios ou numérico 15.000–19.999 |
| Nao informado | Vazio ou não classificável |

## Comparação com Pulso Desafio

| Aspecto | Pulso Desafio | Comercial |
|---------|---------------|-----------|
| View atual | `vw_pulso_desafio_agendamentos_portal` | `vw_comercial_agendamentos_portal` (proposta) |
| Filtro desafio | Dinâmico (`desafio_tag`) | Fixo (pipeline/funil/título) |
| KPIs | Mais granular (cancelamento, re-agendamento…) | Focado em reuniões + renda + validação |
| Validação nominal | Não | Sim (aba dedicada) |

**Não unificar** os dashboards nesta etapa — regras de negócio distintas.

## Próximos passos (código)

1. Publicar a view no Supabase Business Data + `GRANT SELECT TO authenticated`.
2. Implementar `src/lib/comercial/fetchComercial.ts` com Supabase JS.
3. Substituir `DATA_PENDING` em `ComercialDashboard.tsx` por chamada real.
4. Agregar KPIs no client (ou criar RPC `get_comercial_dashboard(start, end)` se o volume for alto).

## Arquivos do portal

```
src/pages/dashboards/comercial.astro
src/components/comercial/
  ComercialDashboard.tsx
  MetricCard.tsx
  BarList.tsx
  DailyIncomeChart.tsx
  comercial-dashboard.css
src/lib/comercial/
  comercialData.ts
  mockData.ts
src/types/comercial.ts
```
