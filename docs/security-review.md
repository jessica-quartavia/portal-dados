# Security Review — QuartaViaDashboards

**Data:** 2026-06-05  
**Revisor:** Auditoria pré-publicação  
**Escopo:** Todo o código-fonte e bundle de produção (`dist/`)

---

## Status geral

**APROVADO para publicação**, com 3 correções aplicadas e 3 riscos residuais baixos documentados.

---

## Achados e correções aplicadas

### [CORRIGIDO] F-1 — `console.log` com URL do Supabase em produção
**Arquivo:** `src/components/LoginWithGoogle.tsx`  
**Severidade original:** Média  
**Situação:** Corrigido

Um `console.log` de debug com `import.meta.env.PUBLIC_AUTH_SUPABASE_URL` rodava incondicionalmente no browser de todos os usuários em produção, expondo a URL do projeto (não uma chave privada, mas indicativo de debug code em produção). Removido.

---

### [CORRIGIDO] F-2 — Comparação de domínio por `endsWith` em vez de igualdade exata
**Arquivo:** `src/lib/auth.ts`  
**Severidade original:** Baixa  
**Situação:** Corrigido

A função `isAllowedEmail` usava `email.endsWith('@quartavia.com.br')`, que seria satisfeita por endereços como `user@evil-quartavia.com.br`. Corrigido para comparação exata do domínio após o `@`:

```ts
const parts = email.toLowerCase().split('@');
return parts.length === 2 && parts[1] === 'quartavia.com.br';
```

---

### [CORRIGIDO] F-3 — `console.log` de debug do dashboard Pulso Desafio em produção
**Arquivo:** `src/components/pulso-desafio/PulsoDesafioDashboard.tsx`  
**Severidade original:** Baixa  
**Situação:** Corrigido

Três logs de debug (`render`, `loading data`, `rows count`) sem guard de ambiente rodavam no browser em produção, expondo detalhes internos de estrutura e query. Removidos. O `console.error` de falhas permanece (não expõe segredos).

---

## Riscos residuais (sem ação imediata necessária)

### R-1 — Rotas `/api/*` isentas de middleware
**Arquivo:** `src/middleware.ts` linha 9  
**Severidade:** Baixa (dado o estado atual)

Todas as rotas `/api/*` passam pelo middleware sem verificação de sessão. Atualmente existem apenas dois endpoints: `/api/login.ts` (stub vazio) e `/api/logout.ts` (faz logout, não retorna dados). Nenhum dado sensível é exposto.

**Risco:** Qualquer nova rota `/api/` criada no futuro estará desprotegida por padrão sem ação consciente do desenvolvedor.

**Recomendação:** Antes de criar rotas `/api/` que sirvam dados protegidos, remover a isenção genérica de `/api/*` do middleware e proteger individualmente.

---

### R-2 — `/api/logout` aceita GET (logout via CSRF passivo)
**Arquivo:** `src/pages/api/logout.ts` linha 11  
**Severidade:** Informativo

O endpoint de logout aceita tanto `GET` quanto `POST`. Um atacante poderia embeddar `<img src="https://app.quartavia.com.br/api/logout">` em qualquer página externa para deslogar usuários silenciosamente. Não expõe dados, apenas causa inconveniência.

**Recomendação:** Remover o handler `GET` e manter apenas `POST` (o formulário de logout já usa `method="post"`).

---

### R-3 — Middleware usa `getSession()` em vez de `getUser()`
**Arquivo:** `src/middleware.ts` linha 22  
**Severidade:** Informativo

O Supabase recomenda `auth.getUser()` para verificações server-side em contextos de segurança críticos, pois `getUser()` valida o JWT com o servidor Supabase em tempo real, enquanto `getSession()` confia apenas no cookie local. Na prática, a sessão é assinada e expirada via JWT — um cookie forjado não passaria na validação de assinatura. O risco real é baixo mas a migração para `getUser()` adicionaria uma camada extra de validação.

**Recomendação:** Avaliar migração para `supabase.auth.getUser()` em versão futura, pós-publicação.

---

## Checklist pré-publicação

| Item | Status |
|------|--------|
| `.env` e `.env.local` não versionados | ✅ `.gitignore` cobre `.env` e `.env.*` |
| `.env.example` sem credenciais reais | ✅ Apenas placeholders (`your-anon-key-here`) |
| Nenhum `service_role` no código | ✅ Não encontrado |
| Nenhuma connection string Postgres | ✅ Não encontrada |
| Nenhum Google Client Secret no código | ✅ Não encontrado |
| Nenhum JWT/anon key hardcoded | ✅ Não encontrado |
| `dist/` sem credenciais privadas | ✅ Auditado, limpo |
| Frontend usa `PUBLIC_*` (não `VITE_*` ou `process.env`) | ✅ Correto |
| Login bloqueia e-mails externos | ✅ Comparação exata de domínio |
| `/login` e `/auth/callback` são públicas | ✅ Confirmado |
| `/` e `/dashboards/*` são protegidas | ✅ Confirmado |
| Não existe fallback que libera acesso sem sessão | ✅ Confirmado |
| Pharus usa apenas Supabase Pharus | ✅ `getPharusSupabase()` separado |
| Pulso Desafio e Auth usam apenas Business Data | ✅ `getAuthSupabase()` separado |
| Clientes Supabase não misturados | ✅ Confirmado |
| Logs de debug removidos do bundle de produção | ✅ Corrigido |
| `npm run build` passa sem erros | ✅ Verificado |

---

## Sobre as anon keys públicas

As variáveis `PUBLIC_AUTH_SUPABASE_ANON_KEY` e `PUBLIC_PHARUS_SUPABASE_KEY` são **intencionalmente públicas** por design do Supabase. Elas são expostas no frontend e aparecem no bundle de produção — isso é esperado e correto. A segurança dos dados é garantida por:

1. Row Level Security (RLS) nas tabelas do Supabase
2. Restrições de domínio no login Google
3. Políticas de GRANT no banco (apenas `authenticated` pode ler as views)

Não remover ou ofuscar essas chaves.
