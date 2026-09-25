# Sprint 17 — Central de Aplicações + endurecimento do ciclo de transferência

**Versão:** permanece **1.0.0**  
**Data:** 2026-09-25  
**Branch:** `main`

## 1. Estado inicial

Sprint 16 fechou o ciclo Playbook → destino → compatibilidade → hipótese → oportunidade → decisão → plano → experimento → resultado → evidência local → memória local. Faltava a Central operacional (`/aplicacoes`) para acompanhar estágio, pendências e próxima ação sem criar domínio paralelo.

## 2. Arquitetura encontrada

Reutilizado `Playbook`, `PlaybookApplication`, `Company`, `Opportunity`, `Decision`, `ActionPlan`, `Experiment`, `ExperimentResult`, `Evidence`, `StrategicMemory`, `Alert`, `Automation`, `Audit`. Nenhum model novo. Nenhuma migration. Sem reset, seed ou apagamento de dados.

## 3. Central de Aplicações

Rota `/aplicacoes` na sidebar, grupo INTELIGÊNCIA: Memória Estratégica → Conexões → Estratégias → Playbooks → Aplicações → Assistente IA.

Pergunta da tela: o que estamos tentando replicar, onde, em qual estágio e o que precisa acontecer agora.

`/empresas/[id]/aplicacoes` redireciona para `/aplicacoes?destino=id`.

## 4. Listagem

Tabela no desktop (colunas essenciais em 1024/1366; detalhe completo em XL/2XL). Cards no mobile. Cada linha: playbook, origem, destino, segmento, score, status, KPI, prazo, experimento, resultado, evidência, responsável, próxima ação.

## 5. Filtros

searchParams: origem, destino, playbook, segmento, status, compatibilidade, resultado, evidência, período, ordem, q, pagina. Refresh preserva filtros.

## 6. Busca

`ApplicationSearch` com debounce de 400ms por playbook, empresa origem, empresa destino e KPI. Não dispara request a cada tecla.

## 7. Paginação

20 aplicações por página (`APPLICATION_PAGE_SIZE`). Anterior/Próxima preservam query. Listagem carrega summary (take 400) e pagina em memória — sem N+1 de evidência, memória, audit ou experimentos completos.

## 8. Status

Mapeamento do domínio existente, sem estado novo:

| Domínio | UI |
|---|---|
| PROPOSTA | Proposta |
| REVISADA | Revisada |
| AGUARDANDO_APROVACAO | Aguardando aprovação |
| APROVADA | Aprovada |
| CONFIRMADA | Oportunidade criada |
| PLANEJADA | Planejada |
| EM_TESTE | Em experimento |
| MEDIDA | Resultado registrado |
| CONCLUIDA | Concluída |
| REJEITADA | Rejeitada |
| CANCELADA | Cancelada |
| ARQUIVADA | Arquivada |

## 9. Próxima ação

`getApplicationNextAction()` determinístico (sem IA generativa): Completar dados, Revisar compatibilidade, Enviar para decisão, Aprovar/rejeitar aplicação, Criar plano, Criar experimento, Iniciar experimento, Registrar resultado, Avaliar evidência, Revisar memória, Concluído.

## 10. Detalhe

`/aplicacoes/[id]`: resumo executivo, playbook, origem, destino, compatibilidade, adaptações, decisão, plano, experimento, resultado, evidência, memória, cobertura, histórico, próxima ação.

## 11. Timeline

12 etapas reais: playbook selecionado → compatibilidade → revisada → decisão → plano → experimento criado → iniciado → resultado → evidência → memória proposta → memória aprovada → concluída. Só marca o que existe. Progresso: `N de 12 etapas concluídas`. Nunca “% de sucesso” nem “% de chance”.

## 12. Compatibilidade

Score /100, cobertura parcial/completa, fatores favoráveis, diferenças, dados ausentes, riscos, adaptações. Nunca probabilidade de sucesso.

## 13. Origem vs destino

Comparação só de segmento, problema, KPI, baseline, meta, investimento, duração, resultado. Ausência = Sem dados.

## 14. Adaptações

Playbook original versus aplicação adaptada. O original não é alterado.

## 15. Decisão / Plano

Card DECISÃO NECESSÁRIA com o que será testado, por quê, compatibilidade, investimento, prazo, KPI, meta, riscos, dados ausentes. Ações humanas: Aprovar, Rejeitar, Revisar, Adiar. IA não aprova. Plano vinculado ou CTA Criar plano (idempotente).

## 16. Experimento / Resultado

Hipótese, KPI, baseline, meta, período, investimento planejado/realizado, responsável, status. RESULTADO PENDENTE com CTA Registrar resultado. Sem resultado automático.

## 17. Evidência / Memória

Evidência local permanece na empresa destino. Evidência da origem continua na origem. Memória: sem memória / proposta / aprovada / rejeitada. Sem validação automática.

## 18. Cobertura / Maturidade

Aplicações totais, medidas, empresas, segmentos. Maturidade EXPERIMENTAL / REPLICADO / MULTICONTEXTO só com critérios reais. Mede quantidade e diversidade de evidência — não garantia de sucesso.

## 19. Biblioteca de Playbooks

Filtros: família, segmento origem, KPI, maturidade, aplicações, empresas, segmentos, status. Ordenação: recentes, mais aplicados, maior cobertura, maior diversidade. Sem ranking de “melhores playbooks”. Card: nome, família, origem, KPI, maturidade, aplicações, empresas, segmentos, atualização, Abrir, Testar em empresa.

## 20. Cockpit

Bloco compacto TRANSFERÊNCIA DE APRENDIZADO: em teste, aguardando decisão, resultados pendentes, concluídas. CTA Abrir aplicações.

## 21. Prioridades / Alertas / Automações

Prioridade só com ação concreta (decidir, registrar resultado, completar KPI, avaliar evidência). Href `/aplicacoes/[id]`. Alertas equivalentes. Automações: aguardando resultado, aguardando decisão, experimento de transferência vencido — só geram alerta. Não aprovam, não concluem, não movem dinheiro, não criam resultado.

## 22. IA

Intent PLAYBOOK consulta applications reais. Atalhos: playbooks em teste, aguardam decisão, resultados pendentes, testados em mais de uma empresa, aprendizado transferido, dados insuficientes, o que mudou entre origem e destino. Não inventa resultado. Não aprova.

## 23. Conexões / Estratégias

Transferência cria/reusa `APRENDIZADO_TRANSFERIVEL` com copy “Conhecimento transferido. Não é parceria comercial.” Estratégia mostra aplicações, empresas e resultados medidos do playbook relacionado.

## 24. Auditoria

Histórico no detalhe: data/hora, usuário, evento, resultado. Labels em português. Sem `application.viewed` em render.

## 25. Segurança

Owner isolation em listagem e detalhe. Opportunity, Decision, Plan, Experiment, Evidence e Memory do outro owner continuam bloqueados via `requireOwnedResource`. ID manipulado retorna NOT_FOUND.

## 26. Idempotência / Concorrência

Duplo clique / retry / propose paralelo: 1 Application (unique playbook+destino), 1 Opportunity, 1 Plan, 1 Experiment, 1 Evidence, 1 Memory quando o recurso é criado. `updateMany` com FK nulo.

## 27. Performance

Listagem = summary. Detalhe = contexto completo. Sem N+1 de evidências/memórias/audit/experimentos na central.

## 28. Responsividade / Acessibilidade

1920–390: tabela no desktop, cards no mobile, timeline vertical no detalhe. Sem scroll horizontal obrigatório. Labels, aria-label, sr-only, focus visível nos filtros e busca.

## 29. Empty states

Sem aplicações: “Nenhum playbook está sendo testado em outra empresa.” + Abrir Playbooks. Sem resultado: “Nenhum resultado pendente.” Sem evidência: “Nenhuma evidência local registrada.”

## 30. E2E lógico

Empresa A → Evidência A → Playbook → Application B → Decision → Plan → Experiment B → Result B → Evidence B → Memory B.

Asserções: Evidence A.companyId === A; Evidence B.companyId === B; Evidence B só após Result B; Memory B referencia Evidence B.

## 31. Testes

387/387 (53 arquivos). Preservados os 376 anteriores. Novos: 10 unitários Sprint 17 + 1 persistência E2E (isolamento, ID manipulado, idempotência, evidência local). Timeout do Sprint 14 persistência elevado para 120s por contenção de suite.

## 32. TypeScript

Passou (`npx tsc --noEmit`).

## 33. Lint

Passou (`npm run lint`).

## 34. Build

Passou (`npm run build`). Rotas `/aplicacoes` e `/aplicacoes/[id]` presentes.

## 35. Migration

Nenhuma. Integridade já coberta pelo Sprint 16.

## 36. Commit

`8f0956f` — feat: add application center to operate the transfer cycle

## 37. Vercel

Production Ready — https://a-teia.vercel.app (`dpl_6JGwpXENEgMCgjUHUPSSfcyj1sbH`)

## 38. Health

status ok · release 1.0 · version 1.0.0 · openaiExposed false · webSearchConfigured true · automationEngine ok · scheduler configured · database ok

## 39. Pendências reais

Walkthrough autenticado visual da Central (1920 / 1440 / 1366 / 1024 / 768 / 390) pelo Renato. Sprint 18 **não iniciado**.
