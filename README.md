# A TEIA

Sistema executivo de decisão. **GESTÃO NO FOCO** no núcleo.

Sprint 0: fundação da aplicação real a partir do protótipo visual V9.

## Stack

Next.js · TypeScript · React · Tailwind CSS · PostgreSQL · Prisma · Auth.js · Vercel

## Setup local

```bash
npm install
cp .env.example .env.local
npx prisma dev --detach --name a-teia
```

Copie a URL `postgres://...` impressa para `DATABASE_URL` em `.env` e `.env.local`. Preencha também `AUTH_SECRET`, `AUTH_EMAIL` e `AUTH_PASSWORD`.

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
| `npm test` | Testes da fundação |
| `npm run db:migrate` | Migração Prisma (dev) |
| `npm run db:seed` | Cria/atualiza o usuário principal |
| `npm run verify` | Checagens extras da Sprint 0 |

## Rotas

- `/login` — autenticação do usuário principal
- `/cockpit` — cockpit executivo (V9)
- `/empresas` — carteira
- `/empresas/nova` — cadastro
- `/empresas/[id]` — visualizar / editar / arquivar
- `/api/ai` — arquitetura de IA (servidor)
- `/api/companies` — API validada de empresas

## Segurança

A chave `OPENAI_API_KEY`, a `DATABASE_URL` e o `AUTH_SECRET` existem apenas em variáveis de ambiente de servidor. Não são enviadas ao frontend.

Veja `/docs` para arquitetura, banco, IA e deploy.
