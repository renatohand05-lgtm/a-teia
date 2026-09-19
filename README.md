# A TEIA

Sistema executivo de decisão. **Release 1.0.**

GESTÃO NO FOCO no núcleo. Hipótese não é evidência. A IA analisa e propõe; o humano decide.

## Stack

Next.js · TypeScript · React · Tailwind CSS · PostgreSQL · Prisma · Auth.js · Vercel

## Setup local

```bash
npm install
cp .env.example .env.local
```

Preencha `DATABASE_URL`, `AUTH_SECRET`, `AUTH_EMAIL` e `AUTH_PASSWORD`.

```bash
npx prisma migrate deploy --schema database/schema.prisma
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e entre com o usuário principal.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm test` | Testes |
| `npm run db:migrate` | Migração Prisma (dev) |
| `npm run db:seed` | Cria/atualiza o usuário principal |

## Rotas principais

- `/login` — autenticação
- `/cockpit` — cockpit multiempresa
- `/empresas` — carteira
- `/alocacao` — simulação e proposta de recursos
- `/automacoes` — regras, alertas e rotinas
- `/auditoria` — rastro de ações
- `/assistente` — IA executiva
- `/memoria` — memória estratégica
- `/api/health` — saúde operacional

## Segurança

`OPENAI_API_KEY`, `TAVILY_API_KEY`, `CRON_SECRET`, `DATABASE_URL` e `AUTH_SECRET` existem só no servidor. Não vão para o browser.

Documentação do produto: `A-TEIA-1.0-PRODUCT-MAP.md`. Checklist: `RELEASE-1.0-CHECKLIST.md`.
