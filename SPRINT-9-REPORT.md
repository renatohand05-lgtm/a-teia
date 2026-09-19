# Sprint 9 — Cockpit Global e Central de Decisão Multiempresa

**Data:** 2026-09-18  
**Commit:** `feat: Sprint 9 global cockpit and decision center`  
**Branch:** `main`  
**Sprint 10:** não iniciada.

## 1. Arquitetura

Reuso da stack atual (Next.js 15, Prisma, Neon, Vitest). Motor novo e determinístico em `lib/global-priority-engine.ts`. Carga em lote em `services/portfolioService.ts`. Cockpit existente (`getCockpitSnapshot`) passou a incluir o portfólio. Decision Center reutiliza o model `Decision`. IA multiempresa usa o mesmo `askExecutiveAssistant`, com contexto reduzido quando não há empresa selecionada.

Pipeline: empresas do owner → dados persistidos → sinais → ranking → UI / IA. OpenAI não define prioridade crítica.

## 2. Cockpit Global

`/cockpit` consolida a carteira: empresas ativas, receita/EBITDA/caixa com cobertura explícita, oportunidades, planos, experimentos, alertas e evidências. Sem inventar zero quando o campo é nulo.

## 3. Motor de prioridade

`collectSignals` + `rankGlobalPriorities`. Score e nível (CRÍTICA / ALTA / MÉDIA / BAIXA) com `priorityReason`, `priorityFactors` e `sourceRefs`.

## 4. Regras de prioridade

Sinais: diagnóstico baixo, CMV acima da meta, EBITDA negativo (somente se informado), caixa crítico, oportunidade alta sem plano, plano com tarefas vencidas (agrupadas), experimento sem resultado, evidência validada, data gap.

## 5. Portfólio

Tabela por empresa: segmento, data health, 360°, financeiro, oportunidades, execução, experimentos, prioridade atual. Sem score arbitrário de “saúde da empresa”.

## 6. Data health

COMPLETO / PARCIAL / INSUFICIENTE pela completude (diagnóstico, financeiro, oportunidades, plano, experimentos). Não mede performance.

## 7. Alertas

Derivados dos sinais, sem IA. Deduplicados. Tarefas vencidas viram um alerta por plano.

## 8. Decisões

Fila com Revisar / Aprovar / Rejeitar / Adiar. Status `DEFERRED` adicionado. Sempre `requiresHumanApproval`.

## 9. Human-in-the-loop

IA sugere e explica. Não aprova investimento, não valida evidência, não conclui experimento, não executa ação crítica.

## 10. Financeiro consolidado

Soma só valores informados. Exibe `N de M empresas com dados no período`. Completo somente se cobertura = 100%.

## 11. Oportunidades

Top da carteira com score, empresa, evidência e se há plano. Link para revisar/criar plano.

## 12. Execução

Planos ativos, pendentes, vencidas e concluídas.

## 13. Experimentos

Ativos, aguardando resultado, concluídos, com/sem evidência. Não afirma “funcionou” sem validação.

## 14. Memória

Memória da empresa vs aprendizado transversal. Sem promoção automática entre segmentos.

## 15. IA multiempresa

`buildPortfolioAIContext()`: até 6 empresas, payload ≤ 2.800 caracteres, só IDs do owner. Perguntas rápidas no Cockpit. Fallback determinístico sem OpenAI.

## 16. Comparação entre empresas

Válida só com mesmo segmento normalizado e mesmo indicador. Restaurante ≠ oficina para CMV.

## 17. Tendências

↑ ↓ → apenas com ≥ 2 pontos persistidos. Um ponto = histórico insuficiente.

## 18. Mudanças recentes

Mapeia `AuditLog` existente. Sem evento inventado.

## 19. Auditoria

`cockpit.viewed`, `priority.opened`, `decision.reviewed|approved|rejected|deferred`, `ai.portfolio_question|answer`. Sem secrets.

## 20. Segurança

Owner isolation no snapshot, decisões, contexto de IA e consolidado. ID de outro owner não lista empresa nem aprova decisão.

## 21. Owner isolation

Testes unitários e `tests/sprint9-persistence.test.ts`. `approveDecision` de outro actor falha.

## 22. Performance

Queries em lote por owner (sem N+1 por empresa). Listas limitadas (prioridades 5, alertas 8, decisões 20, auditoria 12). Contexto de IA reduzido.

## 23. Testes

213/213 (198 anteriores + 15 novos).

## 24. TypeScript

`npx tsc --noEmit` — 0.

## 25. Lint

`npm run lint` — 0.

## 26. Build

`npm run build` — aprovado.

## 27. Migration

`database/migrations/20260918220000_sprint9_global_cockpit`  
`DecisionStatus.DEFERRED` + `Decision.deferredAt`. Incremental. Sem reset.

## 28. Commit SHA

Preenchido após o push.

## 29. Vercel

Aguardando Production Ready após o push.

## 30. Pendências

Walkthrough autenticado (J BURGUERS + outra empresa) — **não bloqueante**; coberto por testes. Sprint 10 não iniciada.

## 31. Backlog pós-Sprint 13

`BACKLOG-POS-SPRINT-13.md`: spacing, tipografia, skeletons, tooltips, mobile da tabela, microinterações, copy, filtros visuais. Nenhum bug/segurança escondido.
