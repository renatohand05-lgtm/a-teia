# Hotfix — OpenAI e Tavily em produção

**Data:** 2026-09-18  
**Commit:** `fix: diagnose and restore OpenAI and Tavily production integrations`

## Causa OpenAI

`OPENAI_API_KEY` **não está definida** no projeto Vercel `renato16/a-teia` (Production, Preview ou Development).

A UI lia `process.env.OPENAI_API_KEY` em `services/aiService.ts` e `lib/env.ts`. Sem a variável, `configured` era `false` e o Assistente mostrava “IA indisponível — configure o provedor.”

Não havia fallback indevido para outra chave, nem desligamento por `APP_ENV`/`NODE_ENV`. O modelo padrão continua `gpt-4.1-mini` via `OPENAI_MODEL`.

**Correção de código:** leitura com trim/aspas, erros classificados (`OPENAI_MISSING`, `OPENAI_AUTH_ERROR`, `OPENAI_RATE_LIMIT`, `OPENAI_PROVIDER_ERROR`), timeout, mensagens amigáveis. Fallback determinístico permanece.

**Ação humana necessária:** adicionar `OPENAI_API_KEY` em **Production** (e Preview, se quiser) na Vercel e redeploy. Sem essa variável a OpenAI continua `configured: false`.

## Causa Tavily

Duas falhas:

1. A Vercel tem `TAVILY_API_KEY` (Production) e `WEB_SEARCH_PROVIDER`. O app **só lia** `WEB_SEARCH_API_KEY`, que **não existe** no projeto. `isWebSearchConfigured()` exigia `WEB_SEARCH_PROVIDER === "tavily"` **e** `WEB_SEARCH_API_KEY`.
2. A chamada usava `api_key` no JSON. A API oficial é `POST https://api.tavily.com/search` com `Authorization: Bearer <key>`.

**Correção:** ler `TAVILY_API_KEY` (com fallback legado `WEB_SEARCH_API_KEY`); se o provider for `none` e a chave Tavily existir, inferir `tavily`; autenticar com Bearer; timeout; classificar 401/403/429/500.

## Arquivos alterados

- `lib/integrations.ts` (novo)
- `lib/env.ts`
- `lib/research-providers.ts`
- `lib/research-engine.ts`
- `services/aiService.ts`
- `services/researchService.ts`
- `app/api/integrations/status/route.ts` (novo)
- `middleware.ts`
- `components/ai/AssistantView.tsx`
- `docs/deployment.md`
- `scripts/probe-integrations.ts`
- `tests/integrations.test.ts`
- `tests/ai-persistence.test.ts`

## Variáveis esperadas (somente servidor)

| Variável | Papel |
|---|---|
| `OPENAI_API_KEY` | obrigatória para narrativa OpenAI |
| `OPENAI_MODEL` | opcional; fallback `gpt-4.1-mini` |
| `WEB_SEARCH_PROVIDER` | `tavily` (ou `none`) |
| `TAVILY_API_KEY` | chave Tavily (preferencial) |
| `WEB_SEARCH_API_KEY` | legado, se `TAVILY_API_KEY` ausente |

Nenhuma `NEXT_PUBLIC_*` de secret. Nenhuma chave no frontend.

Onde cada uma é lida:

- `OPENAI_API_KEY` / `OPENAI_MODEL`: `lib/integrations.ts`, `lib/env.ts`, `services/aiService.ts`
- `WEB_SEARCH_PROVIDER` / `TAVILY_API_KEY` / `WEB_SEARCH_API_KEY`: `lib/integrations.ts`, `lib/env.ts`, `lib/research-providers.ts`

## Endpoint de diagnóstico

`GET /api/integrations/status` (público, só booleanos)

```json
{
  "openai": { "configured": true, "provider": "openai", "model": "gpt-4.1-mini" },
  "webSearch": { "configured": true, "provider": "tavily" },
  "environment": "production"
}
```

Nunca retorna chaves, `Authorization` ou trechos de secret.

## Testes / qualidade

- `npx tsc --noEmit` — 0 erros
- `npm run lint` — 0 erros
- `npm test` — 146/146
- `npm run build` — passou (`/api/integrations/status` incluído)

## Produção

- Commit SHA: `76b4015c65ba53a50e09b06db369c8f2d84a3038`
- Vercel Production: **Ready** (`https://a-teia.vercel.app`)
- `GET /api/integrations/status`:

```json
{
  "openai": { "configured": false, "provider": "openai", "model": "gpt-4.1-mini" },
  "webSearch": { "configured": true, "provider": "tavily" },
  "environment": "production"
}
```

- Probe OpenAI: `configured: false`, código `OPENAI_MISSING`, status `null`. Ponto: variável ausente na Vercel. Arquivo: `lib/integrations.ts` / `services/aiService.ts`.
- Probe Tavily (configuração no runtime): `configured: true`, `provider: tavily`. A chave `TAVILY_API_KEY` passou a ser lida. Chamada ao vivo com secrets de produção não foi executada desta máquina (`vercel env run` não puxa os 18 secrets). Assistente autenticado é o teste de busca real.
- Health: `openaiExposed: false`

## Pendências reais

- Cadastrar `OPENAI_API_KEY` na Vercel **Production** e fazer redeploy. Sem isso a narrativa OpenAI permanece desligada; o briefing determinístico segue.
- Teste autenticado no Assistente: CMV interno sem web; benchmark com Tavily e fontes.
- Sprint 9 não iniciada.
