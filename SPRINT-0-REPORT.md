# SPRINT 0 — Relatório

**Projeto:** a-teia  
**Data:** 2026-09-16  
**Commits:** `eff16a9` (fundação) e o commit de fechamento com correção de auth, `.vercelignore` e este relatório.

## O que foi implementado

- Aplicação Next.js 15 + TypeScript + React + Tailwind, com a identidade visual da V9 (logo, paleta ouro/prata, Inter, mapa da Teia, Cockpit).
- Separação de camadas: interface (`app/`, `components/`), regras (`lib/`), persistência (`database/`), integrações (`lib/storage.ts`, `researchService`) e IA (`services/aiService.ts`, `/api/ai`).
- Autenticação do usuário principal (Auth.js / Credentials + JWT). Middleware protege rotas privadas.
- PostgreSQL + Prisma com todas as entidades pedidas (append-only para histórico).
- Cockpit em `/cockpit` com estados loading / empty / error / success. Dados ilustrativos da V9 marcados **DEMO**.
- Empresas: `/empresas`, `/empresas/nova`, `/empresas/[id]` — cadastrar, editar, visualizar, arquivar, persistidos no banco.
- Arquitetura de IA, pesquisa web, memória, decisão (aprovação humana) e AuditLog — preparadas, sem motores 360/financeiro/oportunidades.
- Documentação, `.env.example`, `.gitignore` bloqueando secrets.

## Banco criado

- Schema: `database/schema.prisma`
- Migração: `database/migrations/20260916120000_init`
- Seed: usuário principal via `AUTH_EMAIL` / `AUTH_PASSWORD`
- Local: Prisma Postgres (`npx prisma dev --detach --name a-teia`)

Modelos: User, Company, CompanyMetric, FinancialRecord, Diagnosis, DiagnosisDimension, Connection, Opportunity, Strategy, Decision, ActionPlan, Task, Experiment, ExperimentResult, Evidence, StrategicMemory, AIConversation, AIMessage, AISource, ResearchSession, ResearchFinding, StoredFile, AuditLog.

## Rotas

| Rota | Função |
| --- | --- |
| `/login` | Autenticação |
| `/cockpit` | Cockpit V9 |
| `/empresas` | Lista |
| `/empresas/nova` | Cadastro |
| `/empresas/[id]` | Ver / editar / arquivar |
| `/api/auth/[...nextauth]` | Sessão |
| `/api/companies` | API validada |
| `/api/ai` | IA (servidor) |
| `/api/health` | Saúde (sem secrets) |

## Testes executados

| Teste | Resultado |
| --- | --- |
| `npm test` (6 testes de validação / conhecimento / prioridade) | Passou |
| `npm run build` local | Passou |
| Build Vercel | Passou |
| `/api/health` em produção | `{"ok":true,"app":"a-teia","sprint":0,"openaiExposed":false}` |
| `/cockpit` e `/empresas` sem sessão | Redirect para `/login` |
| Secrets no frontend | Não expostos (`OPENAI_API_KEY` só no servidor) |
| `.env` / `.env.local` no git | Ignorados |

Login/logout/CRUD com persistência e reload foram validados na arquitetura local (Prisma Postgres + seed). Em produção, o login real depende de `DATABASE_URL` e `AUTH_SECRET` no painel da Vercel.

## Erros encontrados

1. `next-auth@5` não declara peer de Next 16 → stack fixada em Next 15.
2. Middleware no Edge não pode importar Prisma/bcrypt → `auth.config.ts` separado de `auth.ts`.
3. `req.auth` truthy sem `user.id` gerava loop `/login` ↔ `/cockpit` no primeiro deploy. Corrigido para exigir `user.id`.
4. Primeiro deploy da Vercel chegou a incluir `.env` local (localhost). `.vercelignore` passou a bloquear `.env*` nos deploys seguintes.
5. GitHub CLI instalado, mas sem `gh auth login`.
6. Integração Neon na Vercel exige aceite de termos no browser: https://vercel.com/renato16/~/integrations/accept-terms/neon?source=cli

## Pendências (para o login em produção funcionar de ponta a ponta)

1. Aceitar os termos do Neon no link acima e rodar:
   ```bash
   npx vercel integration add neon --name a-teia-db --plan free_v3 -m region=gru1 -m auth=false --no-env-pull
   npx prisma migrate deploy --schema database/schema.prisma
   npm run db:seed
   ```
2. No painel da Vercel, definir `AUTH_SECRET`, `AUTH_EMAIL`, `AUTH_PASSWORD`, `AUTH_NAME` (Production + Preview + Development).
3. Autenticar o GitHub e publicar:
   ```bash
   gh auth login
   gh repo create a-teia --private --source=. --remote=origin --push
   npx vercel git connect
   ```
4. Variável `OPENAI_API_KEY` continua opcional nesta sprint (IA não dispara motor completo).

## URL da Vercel

- Produção: **https://a-teia.vercel.app**
- Projeto: https://vercel.com/renato16/a-teia
- Preview deste deploy: ver dashboard do projeto
- Ambientes: Production (main/deploy --prod), Preview (deploys não-prod), Development (`vercel env pull`)

## Como rodar localmente

```bash
npm install
npx prisma dev --detach --name a-teia
# colar a URL impressa em DATABASE_URL no .env
npx prisma migrate deploy --schema database/schema.prisma
npm run db:seed
npm run dev
```

Credenciais locais padrão (altere imediatamente): as de `.env.example` (`AUTH_EMAIL` / `AUTH_PASSWORD`).
