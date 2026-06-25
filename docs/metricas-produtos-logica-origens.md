# Dashboard Produtos - Logica das metricas e tabelas de origem

Este documento descreve como o dashboard **Produto, operacao e clientes** calcula cada metrica e quais tabelas do Supabase alimentam os indicadores.

Fonte da logica: `src/lib/produtos.ts`.

## Tabelas consultadas

O dashboard carrega as seguintes tabelas do schema `public`:

| Tabela | Uso principal |
|---|---|
| `public.clients` | Base de clientes, status, programa, coorte, datas de entrada, churn e ascensao |
| `public.cancellations` | Pedidos/processos de cancelamento |
| `public.cancellation_statuses` | Status dos cancelamentos, como Retido e Churn efetivado |
| `public.reembolsos` | Reembolsos cadastrados por cliente |
| `public.reembolso_statuses` | Status auxiliares de reembolso, carregado mas nao usado diretamente nos cards atuais |
| `public.reembolso_pagamentos` | Parcelas/pagamentos de reembolso realizados |
| `public.client_meetings` | Reunioes vindas de eventos/calendario |
| `public.manual_meetings` | Reunioes cadastradas manualmente |
| `public.meeting_attendance` | Presenca/comparecimento nas reunioes |
| `public.csat_responses` | Respostas de CSAT |
| `public.pipeline_items` | Itens de pipeline, usados para renovacoes |

## Filtros globais

Todas as metricas respeitam, quando aplicavel:

| Filtro | Como e aplicado |
|---|---|
| Periodo | Usa as datas selecionadas no dashboard: Inicio e Fim |
| Programa | Compara com `clients.programa`, normalizado para maiusculo |
| Coorte | Usa o mes de entrada do cliente, baseado em `clients.data_inicio_ciclo` ou `clients.created_at` |

## Datas padrao usadas

| Entidade | Campo principal | Campo alternativo |
|---|---|---|
| Cliente | `clients.data_inicio_ciclo` | `clients.created_at` |
| Cancelamento | `cancellations.data_pedido` | `cancellations.created_at` |
| Reembolso | `reembolsos.data_churn` | `reembolsos.created_at` |
| Pagamento de reembolso | `reembolso_pagamentos.paid_at` | `reembolso_pagamentos.mes_referencia` ou `created_at` |
| Renovacao | `pipeline_items.updated_at` | `pipeline_items.created_at` |
| Ascensao | `clients.data_ascensao` | - |
| CSAT | `csat_responses.meeting_date` | `csat_responses.created_at` |

## Regra importante de cancelamentos

Antes de calcular os indicadores de cancelamento, o dashboard deduplica os registros por cliente.

Chave usada:

- `cancellations.client_id`; se nao existir, usa `cancellations.client_name` normalizado.

Quando existe mais de um cancelamento para o mesmo cliente, o dashboard escolhe um unico registro por prioridade de status:

1. `Churn efetivado`
2. `Retido`
3. `Nao retido`
4. Status que contenha `Distrato`
5. `cancellation_statuses.display_order`

Se houver empate de prioridade, fica o registro mais recente por `data_pedido` ou `created_at`.

Essa regra faz com que os principais indicadores de cancelamento sejam contados de forma distinta por cliente.

## Aba Clientes

### Clientes ativos

| Item | Descricao |
|---|---|
| Tabela origem | `public.clients` |
| Colunas usadas | `status`, `data_inicio_ciclo`, `created_at`, `data_churn`, `programa` |
| Calculo | Conta clientes cujo `status` normalizado e `ativo`, cuja data de entrada e menor ou igual ao fim do periodo e que nao possuem `data_churn` ou possuem `data_churn` posterior ao fim do periodo |
| Observacao | Respeita filtros de programa e coorte |

### Novos clientes

| Item | Descricao |
|---|---|
| Tabela origem | `public.clients` |
| Colunas usadas | `data_inicio_ciclo`, `created_at`, `programa` |
| Calculo | Conta clientes cuja data de entrada esta dentro do periodo selecionado |
| Observacao | Usa `data_inicio_ciclo`; se vazio, usa `created_at` |

### Cancelamentos voluntarios

| Item | Descricao |
|---|---|
| Tabelas origem | `public.cancellations`, `public.cancellation_statuses`, `public.clients` |
| Colunas usadas | `cancellations.client_id`, `cancellations.client_name`, `cancellations.status_id`, `cancellations.data_pedido`, `cancellations.created_at`, `cancellation_statuses.name` |
| Calculo | Conta clientes distintos com cancelamento no periodo cujo status final e `Churn efetivado` |
| Observacao | Parte da base deduplicada de cancelamentos por cliente |

### Reembolsos ate 7 dias

| Item | Descricao |
|---|---|
| Tabelas origem | `public.reembolsos`, `public.clients` |
| Colunas usadas | `reembolsos.client_id`, `reembolsos.data_churn`, `reembolsos.created_at`, `clients.data_inicio_ciclo`, `clients.created_at` |
| Calculo | Conta reembolsos cuja data de churn esta dentro do periodo e ocorreu entre 0 e 7 dias apos a entrada do cliente |
| Observacao | Respeita filtros de programa e coorte |

### Taxa reembolso / novos

| Item | Descricao |
|---|---|
| Tabelas origem | `public.reembolsos`, `public.clients` |
| Calculo | `Reembolsos ate 7 dias / Novos clientes` |
| Tratamento | Se nao houver novos clientes, retorna 0% |

### Renovacoes

| Item | Descricao |
|---|---|
| Tabelas origem | `public.pipeline_items`, `public.clients` |
| Colunas usadas | `pipeline_items.client_id`, `pipeline_items.pipeline_type`, `pipeline_items.stage`, `pipeline_items.updated_at`, `pipeline_items.created_at` |
| Calculo | Conta clientes distintos em que `pipeline_type` e `renovacao` e `stage` e `renovacao_efetivada`, com data dentro do periodo |
| Observacao | A contagem final usa `new Set(client_id).size`, portanto e distinta por cliente |

### Graficos da aba Clientes

| Grafico | Tabelas origem | Logica |
|---|---|---|
| Novos clientes por mes | `public.clients` | Agrupa novos clientes por mes de `data_inicio_ciclo` ou `created_at` |
| Cancelamentos por mes | `public.cancellations`, `public.cancellation_statuses` | Agrupa cancelamentos voluntarios, ou seja, `Churn efetivado`, por mes de `created_at` |
| Reembolsos por mes | `public.reembolsos` | Agrupa reembolsos ate 7 dias por mes de `data_churn` |

## Aba Cancelamentos

### Cancelamentos

| Item | Descricao |
|---|---|
| Tabelas origem | `public.cancellations`, `public.cancellation_statuses`, `public.clients` |
| Colunas usadas | `cancellations.client_id`, `cancellations.client_name`, `cancellations.status_id`, `cancellations.data_pedido`, `cancellations.created_at` |
| Calculo | Conta clientes distintos com algum registro de cancelamento no periodo, independentemente do status |
| Observacao | Usa a deduplicacao por cliente descrita acima |

### Retidos

| Item | Descricao |
|---|---|
| Tabelas origem | `public.cancellations`, `public.cancellation_statuses` |
| Colunas usadas | `cancellations.status_id`, `cancellation_statuses.name` |
| Calculo | Conta cancelamentos deduplicados cujo status e `Retido` |

### Cancelamentos autorizados

| Item | Descricao |
|---|---|
| Tabelas origem | `public.cancellations`, `public.cancellation_statuses`, `public.clients` |
| Colunas usadas | `cancellations.status_id`, `cancellation_statuses.name`, `cancellations.data_pedido`, `cancellations.created_at` |
| Calculo | Conta cancelamentos deduplicados cujo status e `Churn efetivado` |
| Observacao | No dashboard, este indicador representa o churn efetivado |

### Reembolsos realizados

| Item | Descricao |
|---|---|
| Tabelas origem | `public.reembolso_pagamentos`, `public.reembolsos`, `public.clients` |
| Colunas usadas | `reembolso_pagamentos.reembolso_id`, `reembolso_pagamentos.pago`, `reembolso_pagamentos.paid_at`, `reembolso_pagamentos.mes_referencia`, `reembolso_pagamentos.created_at`, `reembolsos.client_id` |
| Calculo | Conta clientes distintos com pagamento de reembolso marcado como pago dentro do periodo |
| Regra de pago | `pago = true`, ou texto `true`, ou texto `t` |

### Valor reembolsado

| Item | Descricao |
|---|---|
| Tabelas origem | `public.reembolso_pagamentos`, `public.reembolsos`, `public.clients` |
| Colunas usadas | `reembolso_pagamentos.valor`, `reembolso_pagamentos.pago`, `reembolso_pagamentos.paid_at`, `reembolso_pagamentos.mes_referencia`, `reembolso_pagamentos.created_at` |
| Calculo | Soma `reembolso_pagamentos.valor` dos pagamentos pagos dentro do periodo |
| Observacao | Valor arredondado para 2 casas decimais |

### Reembolso cadastrado

| Item | Descricao |
|---|---|
| Tabelas origem | `public.reembolsos`, `public.clients` |
| Colunas usadas | `reembolsos.valor_total`, `reembolsos.data_churn`, `reembolsos.created_at`, `reembolsos.client_id` |
| Calculo | Soma `reembolsos.valor_total` dos reembolsos cadastrados dentro do periodo |
| Observacao | Valor arredondado para 2 casas decimais |

### Cancelamento 7 dias

| Item | Descricao |
|---|---|
| Tabelas origem | `public.cancellations`, `public.clients` |
| Colunas usadas | `cancellations.data_pedido`, `cancellations.created_at`, `clients.data_inicio_ciclo`, `clients.created_at` |
| Calculo | Conta cancelamentos deduplicados cuja data do pedido ocorreu entre 0 e 7 dias apos a entrada do cliente |

### Graficos da aba Cancelamentos

| Grafico | Tabelas origem | Logica |
|---|---|---|
| Cancelamentos por mes | `public.cancellations` | Agrupa todos os cancelamentos deduplicados por mes de `data_pedido` ou `created_at` |
| Cancelamentos por status | `public.cancellations`, `public.cancellation_statuses` | Agrupa cancelamentos deduplicados por `cancellation_statuses.name`; se nao houver status, usa `Sem status` |
| Motivos de churn | `public.cancellations`, `public.clients` | Usa `cancellations.motivo`; se vazio, usa `clients.motivo_churn`; remove textos operacionais e padroniza capitalizacao |
| Resumo de motivos preenchidos | `public.cancellations`, `public.clients` | Conta motivos diferentes de `Sem motivo declarado`, motivos vazios e taxa de preenchimento |

## Aba Operacao

### Reunioes agendadas

| Item | Descricao |
|---|---|
| Tabelas origem | `public.client_meetings`, `public.manual_meetings`, `public.clients` |
| Colunas usadas | `client_meetings.client_id`, `client_meetings.start_time`, `client_meetings.event_name`, `manual_meetings.client_id`, `manual_meetings.start_time`, `manual_meetings.title` |
| Calculo | Conta reunioes dos tipos monitorados dentro do periodo |
| Tipos monitorados | Kickoff, Tracao Patrimonial, Sessao Zero, Rota Patrimonial, Ativacao das Engrenagens, Central de Inteligencia |

### Reunioes com presenca

| Item | Descricao |
|---|---|
| Tabelas origem | `public.client_meetings`, `public.manual_meetings`, `public.meeting_attendance` |
| Colunas usadas | `client_meetings.calendly_event_uri`, `manual_meetings.id`, `meeting_attendance.calendly_event_uri`, `meeting_attendance.status` |
| Calculo | Conta reunioes agendadas em que existe registro de presenca com `status = compareceu` |

### Taxa de comparecimento

| Item | Descricao |
|---|---|
| Tabelas origem | `public.client_meetings`, `public.manual_meetings`, `public.meeting_attendance` |
| Calculo | `Reunioes com presenca / Reunioes agendadas` |
| Tratamento | Se nao houver reunioes agendadas, retorna 0% |

### CSAT medio

| Item | Descricao |
|---|---|
| Tabela origem | `public.csat_responses` |
| Colunas usadas | `score`, `meeting_date`, `created_at` |
| Calculo | Media aritmetica dos valores numericos de `score` dentro do periodo |
| Tratamento | Se nao houver respostas validas, exibe `Sem respostas` |

### Grafico da aba Operacao

| Grafico | Tabelas origem | Logica |
|---|---|---|
| Resumo de reunioes por tipo | `public.client_meetings`, `public.manual_meetings`, `public.meeting_attendance` | Para cada tipo monitorado, mostra agendadas, com presenca e taxa de comparecimento |

## Aba Produto

### Ascensoes para Davos

| Item | Descricao |
|---|---|
| Tabela origem | `public.clients` |
| Colunas usadas | `programa`, `data_ascensao` |
| Calculo | Conta clientes cujo `programa` e `DAVOS` e cuja `data_ascensao` esta dentro do periodo |

### Taxa de ascensao / base ativa

| Item | Descricao |
|---|---|
| Tabela origem | `public.clients` |
| Calculo | `Ascensoes para Davos / Clientes ativos` |
| Tratamento | Se nao houver clientes ativos, retorna 0% |

### Grafico da aba Produto

| Grafico | Tabela origem | Logica |
|---|---|---|
| Ascensoes por mes | `public.clients` | Agrupa ascensoes por mes de `data_ascensao` |

## Observacoes de validacao

- O dashboard atual nao cria indicadores vindos de Bitrix ou Jira QV360.
- A base de cancelamentos e deduplicada por cliente antes de calcular os principais indicadores.
- `Cancelamentos`, na aba Cancelamentos, inclui todos os status.
- `Cancelamentos voluntarios`, na aba Clientes, e igual a `Churn efetivado`.
- `Cancelamentos autorizados`, na aba Cancelamentos, tambem usa `Churn efetivado`.
- `CSAT medio` depende de `public.csat_responses`; se a tabela estiver vazia, o indicador aparece sem respostas.
- A conexao e atualizada automaticamente a cada 2 minutos no frontend.
