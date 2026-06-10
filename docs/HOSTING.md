# Hospedagem & GitHub — menor custo possível

Dashboards do Grupo Quarta Via contêm **dados internos/privados** → a hospedagem precisa de **controle de acesso**. A combinação abaixo entrega isso a **custo R$0**.

## Recomendação: GitHub (privado) + Cloudflare Pages + Cloudflare Access

| Item | Serviço | Custo |
|---|---|---|
| Código-fonte (repo privado) | GitHub | **R$0** |
| Build + hospedagem (sites ilimitados) | Cloudflare Pages | **R$0** |
| Login / controle de acesso (até 50 usuários) | Cloudflare Access (Zero Trust) | **R$0** |
| URL pública segura | `*.pages.dev` | **R$0** |
| Domínio próprio (opcional) | Registro de domínio | ~R$40–60/ano |
| **Total** | | **R$0** |

### Por que não as alternativas
- **GitHub Pages:** em repo **privado** exige GitHub Pro (~US$4/mês) e não tem login nativo. ❌
- **Vercel:** plano free é **não-comercial**; uso de empresa exige Pro (US$20/mês). ❌
- **Netlify:** proteção por senha/acesso é recurso **pago**. ❌
- **Cloudflare Pages + Access:** repo privado, uso comercial e login **grátis** (≤50 usuários). ✅

> Se passar de 50 usuários: avaliar Cloudflare Zero Trust pago (~US$3/usuário/mês) ou SSO corporativo (Google Workspace/Azure AD via Access — o Access integra com esses provedores sem custo extra de licença Cloudflare dentro do limite).

---

## Passo a passo de publicação

### 1. Criar o repositório (privado)
```bash
git init
git add .
git commit -m "chore: estrutura inicial dos dashboards + design system"
gh repo create grupo-quartavia/quartavia-dashboards --private --source=. --push
```

### 2. Conectar ao Cloudflare Pages
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorize o GitHub e selecione o repo `quartavia-dashboards`.
3. Configuração de build:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Save and Deploy.** A cada `git push` na branch `main`, o Cloudflare rebuilda e publica.

### 3. Proteger o acesso (Cloudflare Access)

> **Este portal não implementa autenticação própria.**
> Todo o controle de acesso é delegado ao Cloudflare Access, que intercepta
> as requisições antes de chegarem ao app.

#### Configuração obrigatória

1. Cloudflare Dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. Configure o domínio: `quartavia-dashboards.pages.dev` (ou o domínio próprio).
3. Crie uma **policy** com a seguinte regra:

   | Campo | Valor |
   |---|---|
   | Rule name | `Acesso corporativo` |
   | Action | Allow |
   | Include — Selector | Emails ending in |
   | Include — Value | `@quartavia.com.br` |

4. Provedor de identidade: **Google** (recomendado para autenticação corporativa G Suite/Workspace) ou e-mail OTP.
   - Para Google: Zero Trust → Settings → Authentication → Add Identity Provider → Google Workspace.
   - Informe o domínio `quartavia.com.br` para restringir ao Workspace da empresa.

5. Após salvar, qualquer acesso ao portal exigirá login com conta `@quartavia.com.br`.
   - Usuários externos recebem uma tela de bloqueio do Cloudflare (não chegam ao app).
   - O app Astro não precisa saber nada sobre autenticação.

#### Resumo da arquitetura

```
Usuário → Cloudflare Access (verifica @quartavia.com.br) → Portal Astro → Supabase (dados)
                   │
          bloqueado se não autorizado
                   │
             (nunca chega ao app)
```

#### Variáveis de ambiente no Cloudflare Pages

Configurar em **Pages → Settings → Environment variables**:

| Variável | Valor |
|---|---|
| `PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Anon key pública do Supabase |

Nunca commitar credenciais no repositório.

### 4. (Opcional) Domínio próprio
- Em **Pages → Custom domains**, adicione `dashboards.quartavia.com` e siga o DNS (grátis se o domínio já estiver na Cloudflare).

---

## Fluxo do dia a dia

```
dev cria/edita dashboard  ─▶  git push (main)  ─▶  Cloudflare builda  ─▶  publica
                                                          │
                                              Cloudflare Access exige login
                                                          │
                                              só e-mails autorizados acessam
```

## Observações
- **Um repositório, um deploy, uma política de acesso** para todos os dashboards (monorepo) — mais simples e barato de manter.
- Para preview de cada Pull Request, o Cloudflare gera uma URL temporária automaticamente (também protegida pelo Access se configurado para subdomínios).
- Nunca commite segredos/credenciais de banco no repositório — use variáveis de ambiente do Cloudflare Pages (**Settings → Environment variables**).
