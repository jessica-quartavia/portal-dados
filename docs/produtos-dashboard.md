# Produtos — Operação e clientes

## Objetivo

Migrar o dashboard Astro `dashboard-produtos` para o portal em `/dashboards/produtos`.  
Consolida métricas de clientes, cancelamentos, operação (reuniões/CSAT) e ascensões Davos.

## Rota

`/dashboards/produtos`

## Estado atual da migração

| Item | Status |
|------|--------|
| Página Astro + componentes visuais | ✅ Implementado |
| `fetchProdutosMetrics()` via Supabase JS | ✅ Implementado (`src/lib/produtos.ts`) |
| Cliente dedicado | ✅ `src/lib/supabaseProdutosClient.ts` |
| RLS / grants nas tabelas `public.*` | ⏳ Aplicar no projeto Produtos |

O dashboard tenta carregar as 11 tabelas via Supabase JS. Se env vars, tabelas ou permissões faltarem, exibe banner informativo sem quebrar a tela.

## Fonte de dados (origem)

O dashboard original usava:

1. **PostgreSQL direto** (`DATABASE_URL`) — schema `public`
2. **Fallback REST** (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`)

Projeto Supabase distinto do Business Data (ex.: `lacinxsvjdwalkchxyeo` no `.env.example` do projeto origem).

### Tabelas consultadas

| Tabela | Uso principal |
|--------|---------------|
| `public.clients` | Base de clientes, programa, datas de ciclo/churn/ascensão |
| `public.cancellations` | Pedidos de cancelamento |
| `public.cancellation_statuses` | Status (churn efetivado, retido, etc.) |
| `public.reembolsos` | Registros de reembolso |
| `public.reembolso_statuses` | Status de reembolso |
| `public.reembolso_pagamentos` | Pagamentos efetivados |
| `public.client_meetings` | Reuniões Calendly |
| `public.manual_meetings` | Reuniões manuais |
| `public.meeting_attendance` | Presença (compareceu) |
| `public.csat_responses` | Notas CSAT |
| `public.pipeline_items` | Renovações efetivadas |

## Credenciais no portal

Projeto **separado** do auth:

```env
PUBLIC_PRODUTOS_SUPABASE_URL=https://your-produtos-project.supabase.co
PUBLIC_PRODUTOS_SUPABASE_ANON_KEY=your-produtos-anon-key
```

Criar cliente dedicado em `src/lib/supabaseProdutosClient.ts` (próxima etapa), sem reutilizar `PUBLIC_AUTH_*`.

**Não usar:** `DATABASE_URL`, `service_role`, connection strings.

## Verificação necessária no Supabase Produtos

Antes de conectar:

1. Confirmar que as 11 tabelas existem em `public`.
2. Expor `public` na Data API (Project Settings → API → Exposed schemas).
3. Aplicar políticas RLS de **leitura** para `authenticated` (usuários logados no portal).
4. Validar volume: o código original pagina 1000 linhas por tabela — pode exigir views agregadas se o dataset crescer.

### Política RLS sugerida (exemplo por tabela)

```sql
-- Repetir para cada tabela listada em PRODUTOS_TABLES
CREATE POLICY "portal_read_clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);
```

> Ajustar `USING` conforme governança do time de dados. O dashboard original assumia leitura ampla.

## Métricas por aba

### Aba Clientes

| KPI / gráfico | Tabelas | Regra resumida |
|---------------|---------|----------------|
| Clientes ativos | `clients` | `status = ativo`, entrada ≤ fim, sem churn ou churn > fim |
| Novos clientes | `clients` | `data_inicio_ciclo` ou `created_at` no período |
| Cancelamentos voluntários | `cancellations` + `cancellation_statuses` | Status = churn efetivado, dedupe por cliente |
| Reembolsos até 7 dias | `reembolsos` | Churn ≤ 7 dias após entrada |
| Taxa reembolso / novos | derivado | `reembolsos_7d / novos_clientes` |
| Renovações | `pipeline_items` | `pipeline_type = renovacao`, `stage = renovacao_efetivada` |
| Gráfico novos/mês | `clients` | Agrupa por mês de entrada |
| Gráfico cancelamentos/reembolsos | `cancellations`, `reembolsos` | Séries mensais |

### Aba Cancelamentos

| KPI / gráfico | Tabelas | Regra resumida |
|---------------|---------|----------------|
| Cancelamentos (total) | `cancellations` | Dedupe por cliente, prioridade de status |
| Retidos | `cancellation_statuses` | Status = retido |
| Reembolsos realizados | `reembolso_pagamentos` | `pago = true` no período |
| Valor reembolsado | `reembolso_pagamentos` | Soma `valor` pagos |
| Cancelamento 7 dias | `cancellations` | Evento ≤ 7 dias após entrada |
| Motivos de churn | `cancellations` + `clients` | Parser de texto em `motivo` |
| Por status / por mês | `cancellations`, `cancellation_statuses` | Agrupamentos |

### Aba Operação

| KPI / gráfico | Tabelas | Regra resumida |
|---------------|---------|----------------|
| Reuniões agendadas | `client_meetings`, `manual_meetings` | Classificação por tipo (Kickoff, Sessão Zero…) |
| Comparecimento | `meeting_attendance` | `status = compareceu` |
| Taxa comparecimento | derivado | `attended / scheduled` |
| CSAT médio | `csat_responses` | Média de `score` |
| Gráfico agendado vs compareceu | meetings + attendance | Por tipo de reunião |

### Aba Produto

| KPI / gráfico | Tabelas | Regra resumida |
|---------------|---------|----------------|
| Ascensões Davos | `clients` | `programa = DAVOS`, `data_ascensao` no período |
| Taxa ascensão / base ativa | derivado | `ascensões / clientes_ativos` |
| Gráfico ascensões/mês | `clients` | Agrupa `data_ascensao` |

## Estratégia de migração Supabase JS

O código original agregava tudo server-side (808 linhas). Opções:

| Opção | Prós | Contras |
|-------|------|---------|
| **A) Client-side** (como perfil-cliente) | Sem pg, funciona no Cloudflare | Volume alto, lógica no browser |
| **B) Views agregadas** no Supabase | Leitura simples, performático | Exige SQL no banco |
| **C) Edge Function** Supabase | Agregação server-side sem pg local | Deploy extra |

**Recomendação fase 2:** começar com **A** se volume < ~10k linhas/tabela; evoluir para **B** com views como `vw_produtos_clientes_resumo`.

### Views agregadas sugeridas (futuro)

| View | Conteúdo |
|------|----------|
| `vw_produtos_kpis_clientes` | KPIs pré-calculados por período/programa/coorte |
| `vw_produtos_churn_reasons` | Motivos normalizados |
| `vw_produtos_meeting_summary` | Agendado vs compareceu por tipo |

Arquivos SQL a criar em `sql/produtos/` quando o schema for confirmado.

## Filtros da UI

| Filtro | Parâmetro | Efeito |
|--------|-----------|--------|
| Data início/fim | `start`, `end` | Janela padrão: últimos 120 dias |
| Programa | `program` | PHARUS, DAVOS ou todos |
| Coorte | `cohort` | Mês de entrada (`YYYY-MM`) |

## Arquivos do portal

```
src/pages/dashboards/produtos.astro
src/components/produtos/ProductOpsDashboard.tsx
src/styles/produtos-dashboard.css
src/lib/produtos/
  produtosData.ts
  mockData.ts
src/types/produtos.ts
```

## Próximos passos (código)

1. Criar `src/lib/supabaseProdutosClient.ts`.
2. Implementar `src/lib/produtos/fetchProdutosMetrics.ts` (port da lógica de agregação).
3. Substituir `DATA_PENDING` em `ProductOpsDashboard.tsx`.
4. Publicar RLS/grants no projeto Produtos.
