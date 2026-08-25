# CLAUDE.md — Analytics QuartaVia

Este repositório guarda o **portal Analytics QuartaVia**, os **dashboards** internos e o **design system** que os padroniza.

## Regra principal (leia antes de criar/editar qualquer UI)

Ao construir ou alterar **qualquer** dashboard/interface, siga **obrigatoriamente** o design system:

- 📐 Padrão completo: [`docs/design-system.md`](docs/design-system.md)
- 🤖 Regras imperativas (resumo): [`docs/AI-GUIDELINES.md`](docs/AI-GUIDELINES.md)
- 🎨 Tokens (fonte da verdade): [`packages/design-system/tokens.json`](packages/design-system/tokens.json) · [`theme.css`](packages/design-system/theme.css) · [`tailwind.preset.js`](packages/design-system/tailwind.preset.js) · [`charts-theme.ts`](packages/design-system/charts-theme.ts)

**Em resumo:** dark padrão + light (`data-theme`), superfícies via `--color-bg` / `--color-surface`, **coral `#E85D3A` só em destaque/ação**, títulos **Ubuntu** e corpo **Carme**. **Nunca** hardcodar cores fora dos tokens.

## Estrutura

```
docs/                       Design system + guia para IA
packages/design-system/     Tokens (CSS, Tailwind, JSON, tema de gráficos)
src/pages/                  Portal (index) + 1 página por dashboard
src/data/portal.ts          Registro da Home e dos dashboards
src/components/             Componentes compartilhados (KPI, tabela, gráfico…)
templates/dashboard-starter/  Ponto de partida de um novo dashboard
```

## Criar um novo dashboard

1. Copie `templates/dashboard-starter/` para `src/pages/dashboards/<slug>.astro`.
2. Construa consumindo os tokens (veja `AI-GUIDELINES.md`).
3. Adicione o dashboard à lista em `src/data/portal.ts`.

## Comandos

```bash
npm install      # instala dependências
npm run dev      # ambiente local (http://localhost:4321)
npm run build    # build de produção (pasta dist/)
```

## Hospedagem

Repo no GitHub → **Vercel** (adaptador `@astrojs/vercel`). Acesso via Google OAuth corporativo (`@quartavia.com.br`) no Supabase. Ver [`docs/HOSTING.md`](docs/HOSTING.md).
