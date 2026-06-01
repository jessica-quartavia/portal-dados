# AI-GUIDELINES — Grupo Quarta Via

> **Anexe este arquivo a TODO pedido de dashboard/UI feito à IA.**
> Ele resume, de forma imperativa, como construir qualquer interface no padrão do Grupo Quarta Via.
> Detalhes completos: [`design-system.md`](./design-system.md). Valores: [`tokens.json`](../packages/design-system/tokens.json).

---

## Papel

Você constrói dashboards e interfaces de dados do **Grupo Quarta Via**. O resultado deve ser **dark-first**, com **laranja `#F47920` apenas como acento**, e **100% baseado nos design tokens** — nunca em valores soltos.

## SEMPRE

- **Importe os tokens:** `@import` em [`packages/design-system/theme.css`](../packages/design-system/theme.css) e use `var(--color-...)`, ou use as classes do [preset Tailwind](../packages/design-system/tailwind.preset.js) (`bg-bg`, `bg-surface`, `text-text`, `bg-primary`…).
- **Fundo dark:** página em `--color-bg` (`#0D0D0D`); cards em `--color-surface` (`#1A1A1A`).
- **Laranja só em destaque:** botão primário, link, item de menu ativo, 1ª série do gráfico, KPI principal.
- **Tipografia:** fonte **Inter**; siga a escala (`--fs-xs`…`--fs-kpi`). KPI = `--fs-kpi` bold.
- **Espaçamento:** escala 8px (`--space-1`…`--space-8`). Grid de dashboard com 12 colunas e gap 24px.
- **Texto:** branco `--color-text` no principal; `--color-text-muted` em labels/secundário.
- **Gráficos:** paleta categórica (laranja primeiro); use o tema de [`charts-theme.ts`](../packages/design-system/charts-theme.ts); sempre com legenda e tooltip escuro.
- **Status por cor semântica:** `--color-success` (alta), `--color-danger` (queda), `--color-warning`, `--color-info`.
- **Acessibilidade:** contraste mínimo WCAG AA; foco visível (outline laranja); alvos de toque ≥ 40px.
- **Reaproveite componentes:** classes `qv-*` de `theme.css` e componentes em `src/components/`.

## NUNCA

- ❌ Fundo branco ou tema claro.
- ❌ Cor/tamanho "inventado" fora dos tokens.
- ❌ Laranja em blocos de texto, fundos grandes ou texto corrido.
- ❌ Verde/vermelho como categorias de gráfico (são reservados a status).
- ❌ Gráfico com múltiplas séries sem legenda.
- ❌ Tamanhos de fonte fora da escala definida.

## Checklist antes de entregar

- [ ] Página em `--color-bg`, cards em `--color-surface`.
- [ ] Nenhum hex literal no código do dashboard — só tokens/classes.
- [ ] Laranja aparece apenas em ações/destaques.
- [ ] Fonte Inter aplicada; escala de tamanhos respeitada.
- [ ] Gráficos usam `charts-theme.ts` (paleta + eixos + tooltip dark) e têm legenda.
- [ ] Contraste AA e foco visível ok.

---

### Trecho pronto para colar no prompt

```
Construa seguindo o design system do Grupo Quarta Via:
tema dark (#0D0D0D fundo, #1A1A1A cards), texto branco/cinza,
laranja #F47920 SOMENTE em ação/destaque, fonte Inter, escala 8px,
gráficos com a paleta categórica (laranja primeiro) e tema escuro,
sempre com legenda. Use os tokens de packages/design-system/theme.css.
Não use fundo claro nem cores fora da paleta.
```
