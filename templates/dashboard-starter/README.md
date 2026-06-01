# Template — novo dashboard

Ponto de partida para um dashboard já no padrão do Grupo Quarta Via.

## Como usar

1. Copie `dashboard.astro` para `src/pages/dashboards/<slug>.astro` (ex.: `financeiro.astro`).
2. Ajuste título, KPIs, gráfico e tabela.
3. Registre o dashboard na lista do portal em `src/pages/index.astro`.
4. Construa seguindo [`docs/AI-GUIDELINES.md`](../../docs/AI-GUIDELINES.md) — só tokens, nunca cores soltas.
5. `git push` → o Cloudflare Pages publica automaticamente.

> Dica para gerar com IA: anexe `docs/AI-GUIDELINES.md` ao pedido e diga "use este template como base".
