# Deploy

## Ambientes

| Ambiente | Uso |
| --- | --- |
| Development | `npm run dev` + `.env.local` |
| Production | Vercel Production + `DATABASE_URL` gerenciada |

## Variáveis na Vercel

Obrigatórias:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` (URL pública, ex.: `https://a-teia.vercel.app`)
- `AUTH_EMAIL`
- `AUTH_PASSWORD`
- `AUTH_NAME`

Opcionais nesta sprint:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `WEB_SEARCH_PROVIDER` (`tavily` ou `none`)
- `TAVILY_API_KEY` (preferencial) ou `WEB_SEARCH_API_KEY` (legado)
- `STORAGE_DRIVER`
- `BLOB_READ_WRITE_TOKEN`

## PostgreSQL

Use Neon, Vercel Postgres ou Prisma Postgres. Aplique:

```bash
npx prisma migrate deploy --schema database/schema.prisma
npm run db:seed
```

No build da Vercel, `postinstall` já executa `prisma generate`. Configure também um comando de migrate no deploy (`db:migrate:deploy`) ou rode uma vez após o primeiro deploy.

## GitHub

Repositório privado ou público, branch `main`. Vercel conectada ao GitHub com:

- Production: branch `main`
- Development / Preview: demais branches e PRs

## Slug

Preferência: `https://a-teia.vercel.app`. Se ocupado, usar variação (`a-teia-app`, `ateia-cockpit`).
