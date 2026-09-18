# Sprint 6 — Memória estratégica e aprendizado transversal

**Branch:** `build/roadmap-completo`  
**Data:** 2026-09-17  
**Commit:** `feat: Sprint 6 strategic memory and cross-business learning`

## Arquitetura

Camadas:

- `lib/memory-engine.ts` — confiança, polaridade, contexto, transferibilidade, contradição, repetição e preview de score. Funções puras, sem React e sem persistência.
- `lib/validations.ts` — Zod de proposta, observação e IDs.
- `services/memoryService.ts` — persistência, owner isolation, proposta a partir de Evidence, aprovação humana, listagens, relacionados e auditoria.
- `app/empresas/memory-actions.ts` — server actions.
- UI em `/empresas/[id]/memoria/*` e `/memoria`.

Fluxo persistido:

DADO → INFERÊNCIA → HIPÓTESE → EXPERIMENTO → RESULTADO → EVIDÊNCIA → APRENDIZADO (proposto) → REVISÃO HUMANA → MEMÓRIA → REUTILIZAÇÃO.

Regra central: **memória não é verdade universal**. Sucesso em uma empresa não significa automaticamente sucesso em outra.

## Models reutilizados

`StrategicMemory` (estendido, não duplicado), `Evidence`, `Experiment`, `ExperimentResult`, `Opportunity`, `Strategy`, `Company`, `AuditLog`, `User`.

Taxonomia estratégica reutiliza `DIAGNOSTIC_DIMENSIONS` (Atração, Conversão, Ticket Médio, Recorrência, Indicação, Imagem da Marca, Imagem Comercial, Operação, Financeiro, Gestão & Dados). Aliases (assinatura, upsell, CMV, etc.) mapeiam para essas chaves — sem taxonomia paralela.

## Alterações Prisma

`StrategicMemory` ganhou rastreabilidade e governança:

- origem: `OBSERVATION` | `EXPERIMENT_EVIDENCE` | `MANUAL_LESSON`
- status: `PROPOSED` | `APPROVED` | `REJECTED`
- confiança: `LOW` | `MEDIUM` | `HIGH`
- polaridade: `POSITIVE` | `NEGATIVE` | `INCONCLUSIVE`
- vínculos: `evidenceId`, `experimentId`, `opportunityId`, `strategyId`
- contexto: `context`, `segment`, `kpi`, `family`, `baseline`, `target`, `measuredResult`, `classification`, `limitations`, `conditions`, `investment`, período
- aprovação: `approvedById`, `approvedAt`
- `validated` permanece: só fica `true` após aprovação humana de memória com evidência de experimento

O `completeExperiment` da Sprint 5 **deixou de criar StrategicMemory automaticamente**. Evidência continua sendo gerada; aprendizado exige ação explícita “Transformar em aprendizado”.

## Migration

`database/migrations/20260918010000_sprint6_strategic_memory_engine`

Não altera migrations antigas. Não reseta o banco. Enums novos (`MemoryOrigin`, `MemoryConfidence`, `MemoryStatus`, `MemoryPolarity`) são `CREATE TYPE` completos, então os defaults (`OBSERVATION`, `PROPOSED`, `LOW`) podem ser aplicados na mesma transação.

## Motor de memória

- `calculateMemoryConfidence` — determinístico. Observação/lição manual = LOW. Uma única validação pode gerar memória válida, mas **não** confiança HIGH. HIGH exige evidência, experimento concluído, baseline, resultado medido, aprovação humana e repetição.
- `canCreateValidatedMemory` — exige evidência rastreável + experimento concluído. Hipótese sozinha não passa.
- `buildMemoryFromEvidence` — preview com hipótese, resultado, classificação, lição sugerida, contexto, limitações e confiança. Não inventa números ausentes.
- `compareMemoryContexts` / `prioritizeRelatedMemories` — memória exata (mesma empresa + mesma oportunidade ou família+KPI) tem prioridade sobre transversal.
- `calculateTransferability` — score 0–100 apresentado como **“Compatibilidade estratégica: X/100”**. Nunca como chance de sucesso.
- `detectConflictingMemories` — polaridades opostas no mesmo mecanismo/KPI = “Evidências divergentes”. Nenhum overwrite.
- `countEvidenceRepetition` — N validações com contagem positiva / parcial / inconclusiva / refutada, sem média cega.
- `previewMemoryScoreImpact` — `scoreBase`, `memoryAdjustment` (±15), `scoreFinal`. `rankingChanged` permanece `false` nesta Sprint. Sem evidência real, score original é preservado. Contradição zera o ajuste.

## Confiança

Não usa IA. Sinais objetivos: experimento concluído, baseline, meta, resultado medido, evidência rastreável, aprovação humana, repetição.

- LOW: observação, inconclusivo, falta de evidência/medição.
- MEDIUM: evidência medida de experimento concluído, inclusive validação única.
- HIGH: MEDIUM + aprovação + repetição + desfecho claro (validado/refutado) + baseline.

## Transferibilidade

Fatores: mecanismo, objetivo, KPI, público/segmento, porte operacional, qualidade da evidência.

Rotulagem obrigatória: compatibilidade estratégica, não probabilidade. Texto de aviso persistido na UI.

## Memórias contraditórias

Aprendizados positivos, negativos e inconclusivos convivem. Fracasso medido não é apagado. Pares divergentes são detectados e exibidos.

## Aprovação humana

Evidence → proposta (`PROPOSED`, `validated=false`) → revisão → `APPROVED` (`approvedBy`/`approvedAt`, `validated=true` só com origem `EXPERIMENT_EVIDENCE`) ou `REJECTED`.

Observação/lição manual nasce como `OBSERVATION`/`MANUAL_LESSON` e **nunca** como aprendizado validado.

## Owner isolation

Toda leitura/escrita exige `company.ownerId === session.user.id`. Listagem global (`/memoria`) só vê empresas do usuário. Testes cobrem leitura e escrita isoladas.

## Rotas

- `/empresas/[id]/memoria`
- `/empresas/[id]/memoria/nova`
- `/empresas/[id]/memoria/propor?evidenceId=`
- `/empresas/[id]/memoria/[memoryId]`
- `/memoria` (visão multiempresa do owner)

## Integrações internas

- Central da empresa: card Memória estratégica (validados, recentes, divergências, transferíveis) + CTA Ver memória.
- Oportunidade: Aprendizados relacionados (empresa, segmento, resultado, confiança, compatibilidade) + preview `scoreBase / memoryAdjustment / scoreFinal` sem alterar ranking.
- Experimento concluído: Resultado, Evidência, Memória (nenhuma / proposta / validada) + ação Transformar em aprendizado.
- Navegação: Memória sai de “em breve” e entra no núcleo.

## Auditoria

`memory.proposed`, `memory.created`, `memory.approved`, `memory.rejected`. Sem log de simples renderização.

## Testes

76 testes anteriores preservados + 17 novos = **93 testes**.

Cobertura nova: memória a partir de Evidence; bloqueio sem evidência; observação manual; confiança LOW/MEDIUM/HIGH; transferibilidade; memória exata vs transversal; conflitos; repetição; owner isolation leitura/escrita; aprovação humana; rastreabilidade; integração com Opportunity; NaN/Infinity/IDs inválidos; dados ausentes.

## Build

- `npx tsc --noEmit` — 0 erros
- `npm run lint` — 0 erros
- `npm test` — 93/93
- `npm run build` — passou, rotas de memória incluídas

## Limitações

- Ranking de oportunidades **não** é alterado automaticamente. O preview existe, mas `rankingChanged` é sempre falso.
- Confiança HIGH só com repetição — uma validação isolada permanece MEDIUM.
- Transferibilidade baixa quando segmento/porte não foram informados (não inventados).
- Memórias da Sprint 5 criadas automaticamente no `completeExperiment` (se existirem no banco) ficam como `OBSERVATION`/`PROPOSED` após a migration e não influenciam recomendação até haver fluxo novo com evidência + aprovação.

## Pendências

- Walkthrough completo no navegador (login → experimento concluído → evidência → propor → aprovar → memória da empresa → oportunidade). Sem ferramenta de browser nesta sessão.
- Sprint 7 não iniciada: IA autônoma, pesquisa web, benchmark externo, alteração automática definitiva de score, execução automática, playbooks, integrações externas.

## Segurança do commit

Nenhum `.env`, token, senha, API key ou secret incluído. `main` não foi alterada. Push apenas em `origin/build/roadmap-completo`.
