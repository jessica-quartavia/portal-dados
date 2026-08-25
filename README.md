# Analytics QuartaVia

Portal central dos dashboards, análises e ferramentas do time de Inteligência da QuartaVia. Construído em **Astro + React (ilhas)** e hospedado na **Vercel**.

Identidade visual: tema **dark (padrão)** e **light**, acento coral `#E85D3A`, tipografia **Ubuntu** (títulos) e **Carme** (corpo). Referência de UI: `SKILL.md` na raiz do workspace.

## Documentação

| Documento | Para quê |
|---|---|
| [`docs/design-system.md`](docs/design-system.md) | Padrão de UX/UI (cores, tipografia, componentes, gráficos) |
| [`docs/AI-GUIDELINES.md`](docs/AI-GUIDELINES.md) | Regras para a IA — **anexe a todo pedido de dashboard** |
| [`docs/HOSTING.md`](docs/HOSTING.md) | Notas de hospedagem e alternativas |
| [`CLAUDE.md`](CLAUDE.md) | Carregado automaticamente pela IA ao trabalhar no repo |

Tokens (fonte da verdade): [`packages/design-system/`](packages/design-system/) — `tokens.json`, `theme.css`, `tailwind.preset.js`, `charts-theme.ts`.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:4321
```

Para iniciar também os dashboards auxiliares locais (Qualidade dos Dados, Info Cliente, Info Leads e Comercial QV), execute no Windows:

```powershell
.\iniciar-local.ps1
```

`npm run build` gera a saída de produção usada pelo adaptador Vercel.

## Estrutura

```
docs/                          Design system + guias
packages/design-system/        Tokens (CSS / Tailwind / JSON / tema de gráficos)
src/
  layouts/BaseLayout.astro     Layout base (tema + header)
  data/portal.ts               Registro da Home e da lista de dashboards
  pages/index.astro            Portal
  pages/dashboards/<slug>.astro  Um arquivo por dashboard
templates/dashboard-starter/   Ponto de partida de um novo dashboard
```

## Criar um novo dashboard

1. Copie `templates/dashboard-starter/dashboard.astro` → `src/pages/dashboards/<slug>.astro`.
2. Monte seguindo [`docs/AI-GUIDELINES.md`](docs/AI-GUIDELINES.md) (só tokens).
3. Adicione o dashboard à lista em `src/data/portal.ts`.

## Publicar (resumo)

GitHub → **Vercel** (preset Astro, build `npm run build`).

**Não preencha Output Directory.** O adapter escreve em `.vercel/output` via Build Output API.

O repositório Git deste projeto é a pasta do `package.json` — Root Directory na Vercel deve ficar **vazio**.

Configure as variáveis de ambiente no painel da Vercel; o `.env` local não é versionado.

No Supabase (Authentication → URL Configuration), inclua na allowlist:

- `http://localhost:4321/auth/callback`
- `https://<seu-projeto>.vercel.app/auth/callback`
