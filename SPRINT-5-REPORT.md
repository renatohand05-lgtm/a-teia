# Sprint 5 — Motor de experimentos, validação real e evidências

**Branch:** `build/roadmap-completo`  
**Data:** 2026-09-17

## Arquitetura

Camadas:

- `lib/experiment-engine.ts` — matemática e classificação determinística.
- `lib/validations.ts` — Zod do ciclo de experimento.
- `services/experimentService.ts` — persistência, owner isolation, evidência, auditoria.
- `app/empresas/experiment-actions.ts` — server actions.
- UI em `/empresas/[id]/experimentos/*`.

Regra central: **hipótese não é evidência**. Tarefa concluída no 30/60/90 não valida oportunidade.

## Models reutilizados

- `Experiment`, `ExperimentResult` (append-only), `Evidence`, `Opportunity`, `ActionPlan`, `Strategy`, `StrategicMemory`, `AuditLog`.

## Models alterados

`Experiment` ganhou vínculo com plano/estratégia/autor, baseline, meta, direção, prazo previsto, investimento/retorno realizados, classificação e valor final.

`ExperimentResult` ganhou `recordedById`.

`Evidence` ganhou `experimentId`, `opportunityId` e `classification`.

Enum `ExperimentStatus` recebeu `DRAFT`, `READY` e `CANCELLED` sem apagar `PLANNED`/`ABANDONED` (equivalentes históricos).

Enums novos: `ExperimentDirection`, `ExperimentClassification`.

## Migration

`database/migrations/20260917233000_sprint5_experiment_evidence_engine`

Não altera migrations antigas. Não reseta o banco. O default SQL de status permanece `PLANNED`; o app grava `DRAFT`/`READY` explicitamente (valores novos de enum não podem ser usados como default na mesma transação em que são criados).

## Motor de validação

- `VALIDATED`: meta atingida segundo a direção, com baseline e medição.
- `PARTIALLY_VALIDATED`: melhoria mensurável, meta não atingida.
- `REFUTED`: não melhorou ou piorou.
- `INCONCLUSIVE`: sem baseline, sem medição, sem valor final, ou status ≠ COMPLETED.

`HIGHER_IS_BETTER` e `LOWER_IS_BETTER` são explícitos. CMV usa menor é melhor.

ROI real = `((retorno realizado - investimento realizado) / investimento realizado) * 100`. Investimento ≤ 0 → `null`. Esperado nunca vira realizado.

Evolução de `Opportunity.evidenceLevel` (documentada, determinística, só após COMPLETED):

- 1+ `VALIDATED` → `VALIDATED_EVIDENCE`
- senão 1+ `PARTIALLY_VALIDATED` → `PARTIAL_EVIDENCE`
- senão experimento concluído → `TESTING`
- senão permanece `HYPOTHESIS`

Score de prioridade **não** muda.

## Rotas

- `/empresas/[id]/experimentos`
- `/empresas/[id]/experimentos/novo`
- `/empresas/[id]/experimentos/[experimentId]`
- `/empresas/[id]/experimentos/[experimentId]/medicoes`
- `/empresas/[id]/experimentos/[experimentId]/resultado`

## Integrações

- Oportunidade: “Testar oportunidade”, lista de experimentos, evidência no ranking (dimensão separada do score).
- Execução 30/60/90: criar experimento a partir do plano.
- Financeiro: ROI/payback reais e impacto % só com base de receita informada.
- Central: card Validação real.

## Segurança

Toda query exige `company.ownerId === session.user.id`. Testes cobrem leitura e escrita isoladas.

## Limitações

- Sem memória transversal, benchmark externo, IA autônoma ou autoexecução.
- Impacto financeiro em reais só quando há base de receita real e KPI percentual.
- Walkthrough browser desta sessão: não disponível.

## Pendências

- Walkthrough manual: login → oportunidade → testar → iniciar → medir → encerrar → evidência.
- Memória estratégica como módulo próprio (Sprint 6+).

## Sugestão Sprint 6

Memória estratégica consultável na decisão, sem alterar score automaticamente e sem recomendação entre empresas.
