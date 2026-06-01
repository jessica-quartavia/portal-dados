# Design System — Grupo Quarta Via

> Documento mestre de UX/UI para todos os dashboards e produtos de dados do Grupo Quarta Via.
> **Tema dark-first** · acento **laranja `#F47920`** · tipografia **Inter**.
>
> Fonte única da verdade dos valores: [`packages/design-system/tokens.json`](../packages/design-system/tokens.json).
> Para gerar com IA, envie junto: [`docs/AI-GUIDELINES.md`](./AI-GUIDELINES.md).

---

## 1. Introdução & como usar com IA

Este design system existe para que **qualquer dashboard** — feito por um dev ou gerado por IA — saia já no padrão visual da marca, sem retrabalho de UX/UI.

**Como funciona na prática:**

1. O dev descreve o dashboard que precisa.
2. Anexa ao pedido o arquivo [`AI-GUIDELINES.md`](./AI-GUIDELINES.md) (regras imperativas) e importa [`theme.css`](../packages/design-system/theme.css) no projeto.
3. A IA constrói consumindo os **tokens** — nunca cores ou tamanhos "soltos".
4. O resultado é consistente com todos os outros dashboards do grupo.

> Regra de ouro: **nenhum valor de cor, espaçamento ou fonte é digitado à mão** num dashboard. Tudo vem dos tokens (`var(--color-...)`, classes do preset Tailwind ou `tokens.json`).

---

## 2. Princípios

1. **Dark-first.** O fundo é sempre escuro (`--color-bg`). Não existe versão clara.
2. **O dado é o herói.** A interface é neutra (preto/cinza) para o dado e os gráficos se destacarem.
3. **Laranja é acento, não preenchimento.** `#F47920` aparece em ações, destaques e a 1ª série de gráfico — nunca em grandes áreas nem em blocos de texto.
4. **Alto contraste e legível.** Texto branco sobre dark, mínimo WCAG AA.
5. **Consistência por tokens.** Mesma escala de espaço, raio e tipografia em tudo.

---

## 3. Marca

- **Logo:** símbolo laranja sobre fundo escuro (ou branco em peças claras externas — no produto, sempre escuro).
- **Área de proteção:** mantenha um respiro mínimo equivalente à altura do símbolo ao redor do logo.
- **Usos proibidos:** não distorça, não troque a cor do símbolo, não aplique sobre fundos de baixo contraste, não use o laranja como fundo de tela inteira.

---

## 4. Cores / Tokens

Acento da marca usado **somente** para ação e destaque.

| Token (CSS) | Hex | Uso |
|---|---|---|
| `--color-primary` | `#F47920` | Ação/destaque, 1ª série de gráfico |
| `--color-primary-hover` | `#D8661A` | Hover do laranja |
| `--color-primary-active` | `#BF5613` | Estado pressionado |
| `--color-primary-soft` | `#FFB066` | Variante clara (2ª série, realces sutis) |
| `--color-primary-tint` | `rgba(244,121,32,.12)` | Fundo de seleção/realce |
| `--color-bg` | `#0D0D0D` | Fundo base da tela |
| `--color-surface` | `#1A1A1A` | Cards / painéis |
| `--color-surface-2` | `#222222` | Camada elevada, hover de linha |
| `--color-border` | `#2A2A2A` | Divisores e bordas |
| `--color-border-strong` | `#3A3A3A` | Borda de destaque |
| `--color-text` | `#FFFFFF` | Texto primário |
| `--color-text-muted` | `#B3B3B3` | Texto secundário / labels |
| `--color-text-subtle` | `#7A7A7A` | Texto auxiliar / eixos |
| `--color-text-on-primary` | `#0D0D0D` | Texto sobre o laranja |

**Cores semânticas** (status e variações):

| Token | Hex | Significado |
|---|---|---|
| `--color-success` | `#3FB950` | Positivo / alta |
| `--color-warning` | `#F5A623` | Atenção |
| `--color-danger` | `#E5484D` | Erro / queda |
| `--color-info` | `#3B82F6` | Informação |

**Cores de gráfico (categórica)** — o laranja é sempre a 1ª série:

`#F47920` · `#FFB066` · `#8AB4F8` · `#3FB950` · `#C792EA` · `#56D4DD` · `#E5484D` · `#F5A623`

> ⚠️ Não use as cores semânticas (verde/vermelho) como cor de série categórica — reserve-as para indicar status, para não confundir o leitor.

---

## 5. Tipografia

- **Família:** `Inter` (fallback `system-ui`). Mono: `JetBrains Mono` para números/código quando necessário.
- **Escala:**

| Token | Tamanho | Uso |
|---|---|---|
| `--fs-xs` | 12px | Labels, legendas, eixos |
| `--fs-sm` | 14px | Texto de tabela, secundário |
| `--fs-base` | 16px | Corpo padrão |
| `--fs-lg` | 18px | Subtítulos |
| `--fs-xl` | 24px | Título de seção |
| `--fs-2xl` | 32px | Título de página |
| `--fs-kpi` | 40px | Número grande de KPI |

- **Pesos:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold).
- **Line-height:** 1.2 (títulos), 1.5 (corpo), 1.7 (texto longo).

---

## 6. Espaçamento & Grid

- **Escala base 4/8px:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (tokens `--space-1` … `--space-8`).
- **Grid de dashboard:** 12 colunas, `gap` de 24px (`--space-5`). KPIs em colunas de 3; gráficos em 6; tabelas largas em 12.
- **Breakpoints:** `sm 640` · `md 768` · `lg 1024` · `xl 1280`. Abaixo de 1024px, cards de 3/4 colunas viram 6; abaixo de 640, tudo vira 12.
- **Layout padrão:** sidebar de navegação à esquerda + header (título + filtros) no topo + área de conteúdo em grid.

---

## 7. Bordas, raios e elevação

- **Raios:** `--radius-sm 4px` (badges/inputs), `--radius-md 8px` (botões), `--radius-lg 12px` (cards), `--radius-full` (pílulas/avatar).
- **Bordas:** 1px `--color-border` é o padrão de separação no dark (preferir a sombra fraca).
- **Sombras (sutis no dark):** `--shadow-sm/md/lg`. Use com parcimônia — no dark, a hierarquia vem mais da cor de superfície do que da sombra.

---

## 8. Componentes

Cada componente abaixo já existe como classe utilitária em [`theme.css`](../packages/design-system/theme.css) (`qv-*`) e/ou como componente em `src/components/`.

### Botões (`.qv-btn`)
- **Primário** (`--primary`): fundo laranja, texto escuro. Ação principal da tela (1 por contexto).
- **Secundário** (`--secondary`): contorno, fundo transparente. Ações de apoio.
- **Ghost** (`--ghost`): sem contorno. Ações terciárias / ícones.
- Estados: hover escurece o laranja; foco usa outline laranja; disabled reduz opacidade.

### Card / painel (`.qv-card`)
Superfície `--color-surface`, borda `--color-border`, raio `lg`, padding `--space-5`. Container de todo bloco de conteúdo.

### KPI card (`.qv-kpi`)
Número grande (`--fs-kpi`, bold) + label `--fs-sm` muted + tendência colorida (verde alta / vermelho queda). Use o laranja só se o KPI for o destaque principal da tela.

### Tabela de dados (`.qv-table`)
Cabeçalho muted/semibold, linhas separadas por `--color-border`, hover em `--color-surface-2`. Números alinhados à direita. Zebra é opcional (evite no dark — prefira só a linha).

### Inputs / filtros / dropdowns
Fundo `--color-surface-2`, borda `--color-border`, foco com borda laranja. Altura mínima 40px (toque). Placeholder em `--color-text-subtle`.

### Navegação (sidebar / header)
Sidebar em `--color-surface`; item ativo marcado com barra/realce laranja e texto branco; inativos `--color-text-muted`. Header com título da página + filtros à direita.

### Badges / tags (`.qv-badge`)
Pílula com fundo "soft" semântico + texto da cor correspondente (`--success/--warning/--danger`).

### Tooltips e modais
Tooltip: fundo `--color-surface-2`, borda `--color-border`, texto branco. Modal: card centralizado sobre `--color-overlay`.

### Estados
- **Loading:** skeleton em `--color-surface-2` ou spinner laranja.
- **Vazio:** ícone muted + mensagem curta + ação (botão secundário).
- **Erro:** texto/ícone `--color-danger` + opção de tentar novamente.

---

## 9. Data viz / Gráficos

- **Paleta:** use a categórica da seção 4 (laranja primeiro). Tema pronto em [`charts-theme.ts`](../packages/design-system/charts-theme.ts) para Recharts e ECharts.
- **Eixos:** linha/labels em `--chart-axis` / `--color-text-muted`, tamanho 12px.
- **Grid:** linhas sutis `--chart-grid`, tracejadas; remova grid vertical quando o eixo X for categórico.
- **Legenda:** sempre presente quando houver mais de 1 série; texto muted.
- **Tooltip:** fundo `--color-surface-2`, borda `--color-border`.
- **Quando usar laranja:** série principal, valor em foco, barra/linha de destaque. Demais séries usam o restante da paleta.
- **Não faça:** verde+vermelho como categorias; fundo de gráfico branco; mais de ~7 séries numa categórica (agrupe em "Outros").

---

## 10. Iconografia

- **Biblioteca:** [Lucide](https://lucide.dev) (linha, traço consistente).
- **Tamanho padrão:** 20px em UI, 16px inline; **stroke** 1.5–2px.
- **Cor:** `--color-text-muted` em repouso; `--color-primary` quando ativo/seleção.

---

## 11. Acessibilidade

- **Contraste:** mínimo WCAG **AA** (4.5:1 texto normal, 3:1 texto grande). Branco sobre `--color-bg` passa; texto laranja sobre dark só em tamanho grande/peso alto.
- **Foco visível:** outline laranja de 2px em todo elemento interativo (já no `theme.css`).
- **Não dependa só de cor:** acompanhe status com ícone/rótulo, não apenas verde/vermelho.
- **Alvos de toque:** mínimo 40×40px.

---

## 12. Do's & Don'ts

**Faça ✅**
- Fundo dark em tudo; laranja só em ação/destaque.
- Consumir tokens (`var(--color-...)`, classes do preset).
- Tipografia Inter e escala de espaçamento 8px.
- Legenda e tooltip em todo gráfico com múltiplas séries.

**Não faça ❌**
- Fundo branco ou tema claro.
- Laranja em blocos de texto, fundos grandes ou texto corrido.
- Cores fora da paleta (hex "inventado").
- Verde/vermelho como categorias de gráfico.
- Misturar tamanhos de fonte fora da escala.

---

## Referências
- Tokens (fonte da verdade): [`packages/design-system/tokens.json`](../packages/design-system/tokens.json)
- Variáveis CSS: [`packages/design-system/theme.css`](../packages/design-system/theme.css)
- Preset Tailwind: [`packages/design-system/tailwind.preset.js`](../packages/design-system/tailwind.preset.js)
- Tema de gráficos: [`packages/design-system/charts-theme.ts`](../packages/design-system/charts-theme.ts)
- Guia para IA (enviar junto): [`docs/AI-GUIDELINES.md`](./AI-GUIDELINES.md)
