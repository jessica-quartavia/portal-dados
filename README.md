# Quarta Via — Dashboards

Monorepo com **todos os dashboards** do Grupo Quarta Via e o **design system** que os padroniza (tema dark, acento laranja `#F47920`, fonte Inter). Construído em **Astro + React (ilhas)** e hospedado no **Cloudflare Pages** com acesso privado — **custo R$0**.

## Documentação

| Documento | Para quê |
|---|---|
| [`docs/design-system.md`](docs/design-system.md) | Padrão completo de UX/UI (cores, tipografia, componentes, gráficos) |
| [`docs/AI-GUIDELINES.md`](docs/AI-GUIDELINES.md) | Regras imperativas para a IA — **anexe a todo pedido de dashboard** |
| [`docs/HOSTING.md`](docs/HOSTING.md) | GitHub + Cloudflare Pages + Access, passo a passo, custo |
| [`CLAUDE.md`](CLAUDE.md) | Carregado automaticamente pela IA ao trabalhar no repo |

Tokens (fonte da verdade): [`packages/design-system/`](packages/design-system/) — `tokens.json`, `theme.css`, `tailwind.preset.js`, `charts-theme.ts`.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:4321
```

`npm run build` gera a pasta `dist/` (saída estática usada pelo Cloudflare Pages).

## Estrutura

```
docs/                          Design system + guias
packages/design-system/        Tokens (CSS / Tailwind / JSON / tema de gráficos)
src/
  layouts/BaseLayout.astro     Layout base (aplica o tema)
  components/                   KpiCard, SalesChart, ...
  pages/index.astro            Portal (lista de dashboards)
  pages/dashboards/<slug>.astro  Um arquivo por dashboard
templates/dashboard-starter/   Ponto de partida de um novo dashboard
.github/workflows/ci.yml       Build de verificação
```

## Criar um novo dashboard

1. Copie `templates/dashboard-starter/dashboard.astro` → `src/pages/dashboards/<slug>.astro`.
2. Monte seguindo [`docs/AI-GUIDELINES.md`](docs/AI-GUIDELINES.md) (só tokens).
3. Adicione o dashboard à lista em `src/pages/index.astro`.
4. `git push` → publica automaticamente.

## Publicar (resumo)

Repo **privado** no GitHub → **Cloudflare Pages** (build `npm run build`, saída `dist`) → **Cloudflare Access** restringe o login aos e-mails da empresa. Detalhes em [`docs/HOSTING.md`](docs/HOSTING.md).
