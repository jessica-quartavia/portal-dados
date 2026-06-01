# AGENTS.md — Grupo Quarta Via · Dashboards

Este repositório guarda **todos os dashboards** do Grupo Quarta Via e o **design system** que os padroniza.

## Regra principal (leia antes de criar/editar qualquer UI)

Ao construir ou alterar **qualquer** dashboard/interface, siga **obrigatoriamente** o design system:

- 📐 Padrão completo: [`docs/design-system.md`](docs/design-system.md)
- 🤖 Regras imperativas (resumo): [`docs/AI-GUIDELINES.md`](docs/AI-GUIDELINES.md)
- 🎨 Tokens (fonte da verdade): [`packages/design-system/tokens.json`](packages/design-system/tokens.json) · [`theme.css`](packages/design-system/theme.css) · [`tailwind.preset.js`](packages/design-system/tailwind.preset.js) · [`charts-theme.ts`](packages/design-system/charts-theme.ts)

**Em resumo:** dark-first (`#0D0D0D` fundo, `#1A1A1A` cards), texto branco/cinza, **laranja `#F47920` só em destaque/ação**, fonte **Inter**, escala de espaçamento 8px, gráficos com a paleta categórica (laranja primeiro) e tema escuro. **Nunca** use fundo claro ou cores fora dos tokens.

## Estrutura

```
docs/                       Design system + guia para IA
packages/design-system/     Tokens (CSS, Tailwind, JSON, tema de gráficos)
src/pages/                  Portal (index) + 1 página por dashboard
src/components/             Componentes compartilhados (KPI, tabela, gráfico…)
templates/dashboard-starter/  Ponto de partida de um novo dashboard
```

## Criar um novo dashboard

1. Copie `templates/dashboard-starter/` para `src/pages/dashboards/<slug>.astro`.
2. Construa consumindo os tokens (veja `AI-GUIDELINES.md`).
3. Adicione o dashboard à lista do portal em `src/pages/index.astro`.
4. `git push` → o Cloudflare Pages publica automaticamente.

## Comandos

```bash
npm install      # instala dependências
npm run dev      # ambiente local (http://localhost:4321)
npm run build    # build de produção (pasta dist/)
```

## Hospedagem

Repo **privado** no GitHub → **Cloudflare Pages** (build automático) → acesso protegido por **Cloudflare Access**. Custo: **R$0**. Ver [`docs/HOSTING.md`](docs/HOSTING.md).
