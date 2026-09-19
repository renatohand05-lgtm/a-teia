# Sprint 10 — Motor de Alocação de Capital, Tempo e Recursos

**Data:** 2026-09-18  
**Commit:** `feat: Sprint 10 resource allocation engine`  
**SHA:** `05978e201bb5514a8a07ab8e2d261746fd33e6bc`  
**Branch:** `main`  
**Sprint 11:** não iniciada.

## 1. Arquitetura

Reuso da stack (Next.js 15, Prisma, Neon, Vitest). Motor determinístico em `lib/resource-allocation-engine.ts`. Persistência incremental: `ResourceBudget`, `AllocationProposal`, `AllocationItem`. Números monetários em centavos inteiros (`lib/money.ts`). Serviço em `services/allocationService.ts`. UI em `/alocacao`. Cockpit Global ganhou resumo. Decision Center do Sprint 9 recebe a proposta só após ação humana. OpenAI não calcula ranking nem aprova.

Pipeline: recursos informados → candidatos reais → elegibilidade → risco/evidência → cenário → proposta → revisão humana → decisão → plano. Sem movimentação financeira.

## 2. Recursos

Capital, horas e capacidade só entram se o owner informar. Nulo ≠ zero. Reserva mínima, máximo por empresa/iniciativa e percentual máximo são opcionais. Horizonte: 30/60/90 dias, 6 e 12 meses.

## 3. Engine

`allocateResources` é gulosa e determinística. Não força 100% do capital nem das horas. Sobra vira preservação.

## 4. Elegibilidade

`ELEGIVEL` / `ELEGIVEL_COM_RESSALVAS` / `DADOS_INSUFICIENTES` / `BLOQUEADO`. Bloqueio: arquivada, rejeitada, experimento incompatível, dependência, limite absoluto configurado.

## 5. Risco

`BAIXO` / `MODERADO` / `ALTO` / `INDETERMINADO` com `riskReasons[]`. Sem probabilidade inventada.

## 6. Evidência

`SEM_EVIDENCIA` / `HIPOTESE` / `SINAL_INICIAL` / `EVIDENCIA_VALIDADA`. Afeta ordem, não vira “73% de chance”.

## 7. ROI / payback

ROI só com investimento e retorno informados. Payback informado ou derivado de investimento ÷ retorno mensal. Ausência de payback não é infinito. Horizonte incompatível exclui o item, com motivo.

## 8. Caixa / reserva

Reserva só vale se configurada. Senão: “Reserva mínima não definida.” Caixa persistido entra no risco relativo, sem inventar piso.

## 9. Capital

Alocação parcial. Concentração elevada avisa, não bloqueia (salvo regra configurada).

## 10. Tempo

Horas entram no knapsack junto com capital. Ausência de horas ≠ zero horas.

## 11. Capacidade

Planos/experimentos ativos consomem capacidade. Capacidade esgotada não recomenda iniciar mais trabalho.

## 12. Cenários

Conservador, Balanceado, Expansão. Estratégias de alocação, não promessa de retorno. Comparação sem “melhor cenário”.

## 13. Simulador

Inputs: capital, horas, capacidade, horizonte, cenário, limites. Output persistido como `SIMULATION` versionada.

## 14. Proposta

Empresa, iniciativa, capital, tempo, impacto/payback quando houver, evidência, risco, motivo, próxima ação, “Por que esta alocação?”.

## 15. Não alocados

Fila com motivo: dados insuficientes, capacidade, risco/evidência, payback, reserva, máximo por empresa.

## 16. Decision Center

“Revisar proposta” → `PROPOSAL`. “Enviar para decisão” → `Decision` `PENDING_HUMAN_APPROVAL`. Aprovação no Cockpit.

## 17. Human-in-the-loop

IA não aprova, não move dinheiro, não cria dívida, não executa pagamento. Aprovação registra decisão gerencial. Plano só após aprovação, reusando ActionPlan.

## 18. IA

Atalhos em `/alocacao` e no Assistente. `buildAllocationAIContext` reduzido (≤ 2.200 chars, só IDs do owner). Fallback determinístico sem OpenAI.

## 19. Cockpit

Bloco Alocação: disponível, proposto, preservado, horas, capacidade, decisões pendentes. CTA “Simular alocação”.

## 20. Multiempresa

Cobertura explícita: `N/M empresas possuem iniciativas elegíveis`.

## 21. Allocation readiness

`PRONTO` / `PARCIAL` / `INSUFICIENTE` por completude de investimento, tempo, retorno/payback. Não é saúde da empresa.

## 22. Auditoria

`allocation.simulated` · `allocation.recalculated` · `allocation.proposal_created` · `allocation.proposal_reviewed` · `allocation.sent_to_decision` · `allocation.approved` · `allocation.rejected`. Sem secrets.

## 23. Segurança

Owner isolation em simulação, proposta, decisão, companyId e opportunityId. IA sem mutação crítica.

## 24. Owner isolation

`assertOwnedAllocationIds`. ID de outro owner falha com “não encontrada”. Teste de persistência cobre approve alheio.

## 25. Concorrência

`expectedUpdatedAt` obrigatório nas mutações. Conflito: “A proposta foi atualizada em outra sessão.” Nova simulação incrementa versão e não sobrescreve `SENT_TO_DECISION`/`APPROVED`.

## 26. Precisão monetária

Centavos inteiros. Prisma `Decimal(14,2)`. Sem somar float solto.

## 27. Performance

Queries em lote por owner. Engine no servidor. OpenAI só se o usuário pedir interpretação.

## 28. Testes

226/226 (213 anteriores + 13 novos).

## 29. TypeScript

`npx tsc --noEmit` — 0.

## 30. Lint

`npm run lint` — 0.

## 31. Build

`npm run build` — aprovado. Rota `/alocacao` publicada.

## 32. Migration

`database/migrations/20260919010000_sprint10_resource_allocation`  
Models `ResourceBudget`, `AllocationProposal`, `AllocationItem` + enums. Incremental. Sem reset. Aplicada no Neon.

## 33. Commit SHA

`05978e201bb5514a8a07ab8e2d261746fd33e6bc`

## 34. Vercel

**Ready** — `https://a-teia.vercel.app`  
Deploy: `https://a-teia-cbip0bruy-renato16.vercel.app` (1m)

`/api/health`: ok, Sprint 10 / 0.10.0, `openaiExposed: false`  
`/api/integrations/status`: OpenAI `configured: true` · Tavily `configured: true`

## 35. Pendências bloqueantes

Nenhuma.

## 36. Pendências não bloqueantes

Walkthrough autenticado (Cockpit → Alocação → simular → comparar → decisão, sem aprovar automaticamente). Coberto por testes.

## 37. Backlog pós-Sprint 13

Gráficos, tooltips, mobile, animações, drag-and-drop, comparação visual e skeletons. Nenhum bug/segurança/cálculo escondido.

**Sprint 11 não iniciada.**
