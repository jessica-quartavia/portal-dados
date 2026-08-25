# AI-GUIDELINES — Grupo Quarta Via

> **Anexe este arquivo a TODO pedido de dashboard/UI feito à IA.**
> Ele resume, de forma imperativa, como construir qualquer interface no padrão do Grupo Quarta Via.
> Detalhes completos: [`design-system.md`](./design-system.md). Valores: [`tokens.json`](../packages/design-system/tokens.json).

---

## Papel

Você constrói dashboards e interfaces de dados do **Analytics QuartaVia**. O resultado deve funcionar em **dark (padrão)** e **light**, com **coral `#E85D3A` apenas como acento**, e **100% baseado nos design tokens** — nunca em valores soltos.

## SEMPRE

- **Importe os tokens:** `@import` em [`packages/design-system/theme.css`](../packages/design-system/theme.css) e use `var(--color-...)`, ou use as classes do [preset Tailwind](../packages/design-system/tailwind.preset.js) (`bg-bg`, `bg-surface`, `text-text`, `bg-primary`…).
- **Tema via tokens:** página em `--color-bg`; cards em `--color-surface`. Nunca hardcodar hex de fundo.
- **Coral só em destaque:** botão primário, link, item de menu ativo, 1ª série do gráfico, KPI principal.
- **Tipografia:** títulos **Ubuntu** (`--font-heading`); corpo **Carme** (`--font-body`). Escala `--fs-xs`…`--fs-kpi`.
- **Espaçamento:** escala 8px (`--space-1`…`--space-8`). Grid de dashboard com 12 colunas e gap 24px.
- **Texto:** `--color-text` no principal; `--color-text-muted` em labels/secundário.
- **Gráficos:** paleta categórica (coral primeiro); use o tema de [`charts-theme.ts`](../packages/design-system/charts-theme.ts); sempre com legenda.
- **Status por cor semântica:** `--color-success` (alta), `--color-danger` (queda), `--color-warning`, `--color-info`.
- **Acessibilidade:** contraste mínimo WCAG AA; foco visível (outline laranja); alvos de toque ≥ 40px.
- **Reaproveite componentes:** classes `qv-*` de `theme.css` e componentes em `src/components/`.

## NUNCA

- ❌ Hex de fundo/texto inventado; ignore o tema ativo.
- ❌ Cor/tamanho "inventado" fora dos tokens.
- ❌ Laranja em blocos de texto, fundos grandes ou texto corrido.
- ❌ Verde/vermelho como categorias de gráfico (são reservados a status).
- ❌ Gráfico com múltiplas séries sem legenda.
- ❌ Tamanhos de fonte fora da escala definida.

## Checklist antes de entregar

- [ ] Página em `--color-bg`, cards em `--color-surface`.
- [ ] Nenhum hex literal no código do dashboard — só tokens/classes.
- [ ] Laranja aparece apenas em ações/destaques.
- [ ] Fontes Ubuntu/Carme via tokens; escala de tamanhos respeitada.
- [ ] Gráficos usam `charts-theme.ts` (paleta + eixos + tooltip) e têm legenda.
- [ ] Contraste AA e foco visível ok.

---

### Trecho pronto para colar no prompt

```
Construa seguindo o design system do Analytics QuartaVia:
tokens CSS (dark padrão + light), texto via --color-text,
coral #E85D3A SOMENTE em ação/destaque, Ubuntu/Carme, escala 8px,
gráficos com a paleta categórica (coral primeiro),
sempre com legenda. Use os tokens de packages/design-system/theme.css.
Não use cores fora da paleta.
```
