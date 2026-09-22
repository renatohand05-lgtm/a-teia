# Sprint 16 — Ciclo de transferência de playbook

**Versão:** permanece **1.0.0**  
**Data:** 2026-09-22  
**Branch:** `main`

## 1. Estado inicial

Sprint 15 já tinha `Playbook` e `PlaybookApplication` (PROPOSTA / CONFIRMADA / REJEITADA / EM_TESTE / ARQUIVADA), score `playbook-compat-1.0` e oportunidade destino como HIPÓTESE. Faltava o ciclo completo até evidência e memória **locais**, cobertura/maturidade e máquina de estados.

## 2. Arquitetura encontrada

Reutilizado o domínio existente: Opportunity, Decision, ActionPlan, Experiment, ExperimentResult, Evidence, StrategicMemory, Connection, Strategy, Audit, prioridades, alertas e automações. Nenhum domínio paralelo.

## 3. Models reutilizados

`Playbook`, `PlaybookApplication`, `Opportunity`, `Decision`, `ActionPlan`, `Experiment`, `Evidence`, `StrategicMemory`, `Connection`, `Strategy`.

## 4. Models adicionados

Nenhum model novo. `PlaybookApplication` ganhou FKs e estados aditivos.

## 5. Migration

`20260922140000_sprint16_playbook_transfer_cycle` — aditiva. Sem reset. Sem seed. Sem apagar dados.

## 6. Application engine

Máquina de estados em `lib/playbook-transfer-engine.ts`. PROPOSTA não vai a CONCLUIDA. Unique `[playbookId, destinationCompanyId]`. P2002 e `updateMany` onde o FK ainda é nulo.

## 7. Compatibility engine

`playbook-transfer-1.0`, 100 pontos explicáveis. Dado ausente = 0 e parcial. Nunca probabilidade de sucesso. IA só explica.

## 8. Hipótese

Nasce local, origem `PLAYBOOK_APPLICATION`, classificação HIPÓTESE.

## 9. Oportunidade

`confirmPlaybookApplication` idempotente. Origin PLAYBOOK. EvidenceLevel HYPOTHESIS.

## 10. Decisão

Humana obrigatória. Aprovar / rejeitar / revisar / adiar. IA não aprova.

## 11. Plano

`createExecutionPlanFromOpportunity` — 30/60/90 real, sem tarefas falsas.

## 12. Experimento

Criado e iniciado no destino, com hipótese, KPI, baseline, meta, prazo e critério.

## 13. Resultado

`completeExperiment` registra medição. ROI só se houver dados. Meta não atingida não vira fracasso automático.

## 14. Evidência

Evidência pertence à empresa destino. Evidência da origem nunca é copiada.

## 15. Memória

`proposeMemoryFromEvidence` — PROPOSTA, governança existente.

## 16. Aprendizado transversal

Comparação origem vs destino. Sem causalidade sem evidência suficiente.

## 17. Maturidade

EXPERIMENTAL / REPLICADO / MULTICONTEXTO = cobertura e diversidade, não sucesso.

## 18. IA

Perguntas de teste, decisão, diferença origem/destino e evidência em quantas empresas. Distingue DADO / INFERÊNCIA / HIPÓTESE / EVIDÊNCIA.

## 19. Prioridades

Aplicação aguardando decisão, experimento vencido, resultado ausente, dados faltando.

## 20. Alertas

Condição detectada. Não conclui falha.

## 21. Automações

Templates `playbook_awaiting_decision`, `playbook_awaiting_result`, `playbook_transfer_overdue`. Só alerta.

## 22. Auditoria

Eventos do ciclo, sem spam de visualização.

## 23. Segurança

`requireOwnedResource` em playbook e playbookApplication. Owner isolation e ID manipulado testados.

## 24. Idempotência

Oportunidade, plano, experimento, evidência e memória não duplicam.

## 25. Concorrência

Unique + P2002 + `updateMany` com FK nulo. Duplo propose = 1 aplicação.

## 26. Performance

Includes pontuais, paginação de aplicações, sem N+1 de lista.

## 27. Responsividade

Tabela no desktop, cards/timeline no mobile.

## 28. Testes

376/376 (51 arquivos). 12 unitários Sprint 16 + 1 persistência crítica (evidência de A não vira evidência de B).

## 29. TypeScript

Passou (`npx tsc --noEmit`).

## 30. Lint

Passou (`npm run lint`).

## 31. Build

Passou (`npm run build`).

## 32. Commit

`f6dfb20` — feat: close playbook transfer cycle without moving evidence

## 33. Vercel

Production Ready — https://a-teia.vercel.app (`dpl_AzzCSUeFkWUpbQaoqb867EiKUZgF`)

## 34. Health

status ok · release 1.0 · version 1.0.0 · openaiExposed false · webSearchConfigured true · automationEngine ok · scheduler configured · database ok

## 35. Pendências reais

Walkthrough autenticado visual do wizard de transferência (1920–mobile) pelo Renato.

Sprint 17 **não iniciado**.
