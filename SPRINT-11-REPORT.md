# Sprint 11 — Automações inteligentes, alertas e rotinas

**Data:** 2026-09-18  
**Commit:** `feat: Sprint 11 automation alerts and operational routines`  
**SHA:** `6448e4b3fd431a4f058dc181347b8b4b731407e1`  
**Branch:** `main`  
**Sprint 12:** não iniciada.

## 1. Arquitetura

Motor determinístico em `lib/automation-rules-engine.ts`. Persistência: `Automation`, `AutomationExecution`, `AutomationAlert`, `AppNotification`. Cron em `/api/cron/automations` protegido por `CRON_SECRET`. IA só explica e propõe. Sem dinheiro, sem canal externo e sem decisão crítica automática.

## 2. Automation engine

Criar a partir de template, nascer desligada, ativar/desativar, executar agora ou via cron. Limite de 40 por owner.

## 3. Rule engine

Condições com operadores `gt/gte/lt/lte/eq/neq/contains/days_since/status_is/missing`. OpenAI não decide se a condição foi atingida.

## 4. Conditions

`metric`, `operator`, `threshold`, `period`, `entity`, `companyId`, `status`. Engine propositalmente restrita aos sinais persistidos.

## 5. Templates

CMV acima da meta, EBITDA negativo, meta atrasada, tarefa vencida, plano parado, experimento sem medição, decisão pendente, financeiro desatualizado, caixa abaixo do limite, oportunidade alta sem plano, alocação pendente, briefing diário, resumo semanal.

## 6. Alerts

OPEN / ACKNOWLEDGED / RESOLVED / DISMISSED. Prioridade CRÍTICO/ALTO/MÉDIO/BAIXO. Histórico preservado.

## 7. Notifications

Somente `IN_APP`. EMAIL/WHATSAPP/SLACK existem no enum e recusam envio.

## 8. Executions

Log com status, resumo, falha classificada, itens e alertas criados. Sem secrets e sem stack trace.

## 9. Scheduler

Vercel Cron diário `0 11 * * *` (08:00 America/São Paulo). Endpoint 401 sem secret.

## 10. Idempotência

`AutomationExecution.idempotencyKey` e `AutomationAlert.idempotencyKey` únicos. Segunda execução no mesmo slot não duplica.

## 11. Cooldown

Horas por automação. Alerta aberto/reconhecido no intervalo é suprimido.

## 12. Deduplicação

Mesma regra + empresa + slot = uma chave.

## 13. Retry

Só PROVIDER / TIMEOUT / DATABASE / RATE_LIMIT. Validação e permissão sem retry. Máximo 2.

## 14. Briefing

Determinístico: prioridades, alertas, vencidas, decisões, experimentos, financeiro, mudanças.

## 15. Resumo semanal

Mudou / melhorou / piorou só com trilha persistida. Sem causalidade inventada.

## 16. IA

Consulta alertas, propõe regra (“CMV > 32%”) e pede confirmação. `aiMayEnableAutomation()` = false.

## 17–21. Integrações

Alocação pendente, experimento sem medição, CMV/EBITDA/caixa, tarefas/planos, decisões > 3 dias. Sem realocar ou aprovar sozinha.

## 22. Auditoria

`automation.created|enabled|disabled|executed|failed`, `alert.created|acknowledged|resolved|dismissed`, `notification.read`.

## 23–24. Segurança / owner isolation

ID alheio falha. Escopo por `ownerId`. Role real do produto continua `owner`.

## 25. RBAC

Sem papéis VIEWER/MANAGER inventados. Owner cria/edita; isolamento por dono.

## 26. Timezone

Padrão `America/Sao_Paulo`. UTC no banco. Exibição local.

## 27–28. Performance e limites

Jobs só de automações devidas (máx. 50). Máx. 30 alertas/job. Índices em owner/status/nextRunAt.

## 29. Testes

233/233 (226 anteriores + 7 novos).

## 30–32. Qualidade

TypeScript 0 · lint 0 · build aprovado (`/automacoes`, `/api/cron/automations`).

## 33. Migration

`database/migrations/20260919023000_sprint11_automation_engine` no Neon. Incremental.

## 34. Commit SHA

`6448e4b3fd431a4f058dc181347b8b4b731407e1`

## 35. Vercel

**Ready** — `https://a-teia.vercel.app`  
Deploy: `https://a-teia-oohdp6per-renato16.vercel.app` (50s)

`/api/health`: ok, Sprint 11 / 0.11.0, `automationEngine: ok`, `openaiExposed: false`, `scheduler: not_configured` (CRON_SECRET ainda não está no ambiente da Vercel; o endpoint `/api/cron/automations` responde 401 sem secret).  
`/api/integrations/status`: OpenAI `configured: true` · Tavily `configured: true`

## 36. Pendências bloqueantes

Nenhuma.

## 37. Pendências não bloqueantes

Walkthrough autenticado (template CMV → ativar → executar → reconhecer → resolver).  
Definir `CRON_SECRET` na Vercel para o cron diário autenticar (`scheduler: configured`). Execução manual já cobre o fluxo.

## 38. Backlog pós-Sprint 13

Sino, filtros, mobile, snooze, builder visual, heatmap, sons. Sem bug/segurança escondido.

**Sprint 12 não iniciada.**
