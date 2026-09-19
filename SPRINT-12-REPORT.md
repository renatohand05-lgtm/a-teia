# Sprint 12 — Segurança, hardening, governança e preparação de release

**Data:** 2026-09-19  
**Commit:** `feat: Sprint 12 security hardening and operational governance`  
**SHA:** _registrado após o commit_  
**Branch:** `main`  
**Sprint 13:** não iniciada.

## 1. Estado inicial

`main` limpa em `293c573`, alinhada a `origin/main`. Health em 0.11.0 / Sprint 11. Isolamento por owner já existia nos serviços. Auditoria append-only já gravava eventos. `/auditoria` estava em “Em breve”. Cron exigia `CRON_SECRET`, mas o middleware redirecionava `/api/cron` para login — Vercel Cron sem cookie nunca autenticava.

## 2. Problemas encontrados e correções

- Middleware bloqueava o cron sem sessão. `/api/cron` passou a ser público no matcher e continua 401 sem secret.
- APIs devolviam `error.message` cru. Respostas agora usam códigos estáveis e texto humano.
- Mass assignment dependia só do strip do Zod. Campos protegidos agora são rejeitados.
- Login, IA, pesquisa e execução manual de automação não tinham rate limit server-side.
- Cron não tinha trava de concorrência no processo.
- Auditoria não tinha categoria/sucesso/empresa para a tela.
- Health não distinguia “configurado” de “exposto”.

Microdetalhes visuais foram para `BACKLOG-POS-SPRINT-13.md`.

## 3. Arquitetura de segurança

Cadeia `USER → OWNER → COMPANY → RESOURCE → ACTION`.

Helpers: `requireAuthenticatedUser`, `requireOwnedCompany`, `requireOwnedResource`, `assertCompanyAccess`, `assertResourceOwnership`, `can`, `requirePermission`.

Nenhum recurso é liberado só porque o cliente conhece o ID.

## 4. Autorização e matriz de permissões

`lib/security/permissions.ts` define a matriz (`company.read/write`, `finance.*`, `diagnosis.*`, `opportunity.*`, `execution.*`, `experiment.*`, `evidence.read/validate`, `memory.read/promote`, `decision.read/approve`, `allocation.read/approve`, `automation.*`, `ai.use`, `research.use`, `audit.read`).

Hoje: papel `owner` tem todas as permissões **somente** nos próprios recursos. Sem compartilhamento.

## 5. Ações críticas e human-in-the-loop

`CRITICAL_ACTIONS` cobre aprovar/rejeitar decisão e alocação, movimentar capital, validar evidência, promover memória, concluir experimento, excluir crítico, ativar/alterar automação e ação externa.

`requiresHumanConfirmation(action) === true`  
`aiMayExecute(action) === false`

IA continua podendo analisar, resumir, comparar, explicar, sugerir e propor. Não executa ação crítica mesmo com prompt injuntivo.

## 6. Auditoria

`auditService.writeAudit` reutilizado. Campos incrementais: `companyId`, `category`, `success`. Metadata sanitizada: senha, token, API key, `CRON_SECRET`, Authorization e cookies são omitidos.

Eventos cobertos incluem auth, company, diagnosis, opportunity, decision, allocation, experiment, evidence, memory, automation, alert, AI, research e `security.access_denied` / `security.validation_failed`.

## 7. Tela `/auditoria`

Rota real, no menu Central. Lista data/hora, usuário, empresa, categoria, evento, recurso e resultado. Filtros de período, empresa, categoria, evento e sucesso/falha. Detalhe sem payload bruto sensível. Empty state quando não há eventos.

## 8. IA e pesquisa externa

SYSTEM RULES, contexto interno e fontes externas permanecem separados. `wrapExternalAsData` trata página web como dado. Injection (`ignore previous instructions`) não altera regras e não libera ação crítica.

SSRF: localhost, `127.0.0.1`, `0.0.0.0`, `169.254.169.254`, `::1`, RFC1918 e hosts `.internal`/`.local` bloqueados. Só HTTP/HTTPS.

## 9. Cron, rate limit, idempotência e concorrência

Cron: secret obrigatório, 401 sem secret ou com secret errado, lock em processo, auditoria de execução/negação, idempotência já existente nas automações.

Rate limit server-side: login, Assistente IA, pesquisa web, execução manual e cron.

Concorrência: `assertFreshTimestamp` + `expectedUpdatedAt` da alocação. Mensagem: “Este registro foi alterado em outra sessão. Atualize antes de continuar.”

## 10. Integridade financeira, evidência e memória

Valores calculados continuam no servidor. Cliente não define EBITDA/score definitivo. Cenário ≠ realizado. Hipótese ≠ evidência. Pesquisa/IA não viram evidência operacional. Memória validada permanece rastreável e exige promoção humana.

## 11. Headers, erros e health

Headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` e CSP compatível com Next.js/NextAuth (sem keys no browser).

Erros públicos: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`. Sem stack, SQL ou secret.

`/api/health` 0.12.0 / Sprint 12: `openaiConfigured`, `webSearchConfigured`, `openaiExposed: false`, `automationEngine`, `scheduler`, `database`. Sem keys, connection string ou hostname privado.

## 12. Secrets audit

| Item | Estado |
| --- | --- |
| OPENAI_API_KEY | configured no ambiente / not exposed no frontend ou relatório |
| TAVILY_API_KEY | configured no ambiente quando presente / not exposed |
| CRON_SECRET | missing na Vercel até ser definido / not exposed |
| DATABASE_URL / AUTH_SECRET | configured / not exposed |
| Valores `sk-` / `tvly-` no git | not exposed (apenas placeholders de teste) |

Política mínima: `docs/PRIVACY-AND-RETENTION.md`.

## 13. Testes

246 testes (32 arquivos). Novos: isolamento, mass assignment, IA crítica, injection, SSRF, cron, lock, conflito, rate limit, health, erro seguro, auditoria sanitizada.

## 14. Migration

`database/migrations/20260919120000_sprint12_security_hardening` — incremental. Sem reset, sem drop, sem reescrita de migration antiga.

## 15. Validação

- `npx tsc --noEmit`: 0
- `npm run lint`: 0
- `npm test`: 246 passed
- `npm run build`: aprovado, rota `/auditoria` presente

## 16. Deploy

Produção: https://a-teia.vercel.app — status após o push.

## 17. Pendências reais

- `CRON_SECRET` ainda precisa existir no ambiente da Vercel para `scheduler: configured`.
- RBAC além de owner continua propositalmente fora de escopo.
- Sem exclusão destrutiva automática (documentado).

## 18. Backlog pós-Sprint 13

Itens cosméticos da Auditoria (densidade, contraste dos filtros, empty state ilustrado, drawer mobile, hover) registrados em `BACKLOG-POS-SPRINT-13.md`.
