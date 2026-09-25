# Sprint 19 — Validação operacional em carteira real + hardening end-to-end

**Versão:** permanece **1.0.0**  
**Data:** 2026-09-25  
**Branch:** `main`

## 1. Estado inicial

Sprints 14–18 entregaram o ciclo CONEXÕES → ESTRATÉGIAS → PLAYBOOKS → APLICAÇÕES → DECISÃO → PLANO → EXPERIMENTO → RESULTADO → EVIDÊNCIA → MEMÓRIA, com shell único, breadcrumbs, timeline operacional e uma CTA principal.

Produção em `https://a-teia.vercel.app`. Último commit funcional informado: `dd09392`. Health 1.0.0 ok.

Pendência herdada do Sprint 18: walkthrough autenticado visual das telas. Sem sessão de browser autenticada neste ambiente.

Mapa de rotas após auditoria de código + relatórios 14–18 + health/login públicos:

| Rota | Estado |
|---|---|
| `/cockpit` | FUNCIONANDO (código + testes de persistência) |
| `/empresas` e hub contextual | FUNCIONANDO |
| `/conexoes` e `/conexoes/[id]` | FUNCIONANDO |
| `/estrategias` e `/estrategias/[id]` | FUNCIONANDO |
| `/playbooks` e `/playbooks/[id]` | FUNCIONANDO |
| `/aplicacoes` e `/aplicacoes/[id]` | FUNCIONANDO |
| `/prioridades` (bloco no Cockpit) | FUNCIONANDO |
| `/decisoes` (bloco no Cockpit) | PARCIAL — href antigo ia ao hub da empresa; corrigido |
| `/alocacao` | FUNCIONANDO |
| `/automacoes` | FUNCIONANDO |
| `/alertas` | PARCIAL — playbook ia a `/aplicacoes` genérico; corrigido |
| `/auditoria` | PARCIAL — ruído de viewed / lista saturada; corrigido |
| `/memoria` | FUNCIONANDO |
| `/assistente` | FUNCIONANDO (código + testes; perguntas reais NÃO TESTÁVEL sem sessão) |
| Financeiro / diagnóstico / experimentos / evidências | FUNCIONANDO no motor; carteira real NÃO TESTÁVEL sem auth |

“Sem dados” não foi tratado como bug.

## 2. Ambiente

- Workspace local: `c:\Users\renat\a-teia`
- Node / Next.js 15.5 / Prisma 6 / Neon
- Produção: Vercel `https://a-teia.vercel.app`
- Sem MCP de browser autenticado nesta sessão
- Autenticação **não** foi alterada nem enfraquecida

## 3. Walkthrough autenticado

**walkthrough autenticado indisponível.**

`GET https://a-teia.vercel.app/login` devolve a página pública (A Teia — Cockpit executivo). Não há ferramenta de browser autenticado neste Sprint. Nenhum resultado de clique, filtro, CTA, empty/filled, mobile ou assistente com dados reais foi inventado.

Validação substituta: relatórios 14–18, rotas compiladas, health público, suíte de persistência/isolamento (397 testes) e correções só do que o código + testes mostraram.

## 4. Empresas utilizadas

Nenhuma empresa da carteira real foi aberta, editada ou preenchida.

Nenhum dado financeiro fictício foi gravado em empresa operacional.

Nenhuma entidade TESTE foi criada em produção.

Testes de persistência usam empresas temporárias no banco de desenvolvimento/CI e as removem no `afterAll`.

## 5. Fluxo principal da empresa

Validado em código e testes de persistência (não em UI autenticada):

Empresas → hub → Diagnóstico 360° → Oportunidades → Plano 30/60/90 → Financeiro → Experimentos → Evidências → Memória → Assistente.

Rotas contextuais existem e compilam. Breadcrumbs e CTAs do Sprint 18 preservados. Empty states usam “Sem dados” / “Não informado” nas telas críticas. Refresh/voltar/erros humanos cobertos por `ErrorState` + `toPublicError`.

**Não testável visualmente:** responsividade 1920–390 e jornada humana ponta a ponta.

## 6. Ciclo de inteligência

Preservado: dado → diagnóstico → gargalo → hipótese → oportunidade → decisão → execução → experimento → resultado → evidência → memória.

Regra absoluta mantida: **HIPÓTESE ≠ EVIDÊNCIA**. Evidência local exige resultado medido. Testes Sprint 16/17 de persistência revalidam isolamento origem/destino.

## 7. Ciclo de transferência

Preservado ponta a ponta no domínio:

EMPRESA A → resultado validado → evidência A → memória A → estratégia → playbook → aplicação em B → compatibilidade → aprovação humana → plano B → experimento B → resultado B → evidência B → memória B.

Evidência A permanece em A. Evidência B só nasce após resultado em B. Sem cópia de evidência (`sprint16-persistence`, `sprint17-persistence`).

**Não testável** com duas empresas reais da carteira (sem sessão).

## 8. Conexões

`/conexoes`: mapa, lista fallback, filtros, detalhe, zoom/pan/fit e escala 1–100 (Sprint 18). Uma empresa = estado vazio correto, sem conexão inventada.

Estado: FUNCIONANDO no código. NÃO TESTÁVEL autenticado.

## 9. Estratégias

`/estrategias`: origem, problema, mecanismo, empresa, segmento, playbooks/aplicações/evidência relacionados. Validação continua humana. Sem “estratégia validada” automática.

Estado: FUNCIONANDO no código. NÃO TESTÁVEL autenticado.

## 10. Playbooks

`/playbooks` e `/playbooks/[id]`: origem, problema, mecanismo, KPI, pré-requisitos, evidências, aplicações, empresas, segmentos, maturidade EXPERIMENTAL / REPLICADO / MULTICONTEXTO.

PLAYBOOK VALIDADO ≠ PLAYBOOK AINDA EM TESTE permanece no domínio.

Estado: FUNCIONANDO no código. NÃO TESTÁVEL autenticado.

## 11. Aplicações

`/aplicacoes` e `/aplicacoes/[id]`: filtros, busca, ordenação, status, destino, playbook, compatibilidade, timeline, uma próxima ação (`getApplicationNextAction`), decisão, plano, experimento, resultado, evidência, memória.

Estado: FUNCIONANDO no código. NÃO TESTÁVEL autenticado.

## 12. Decisões

Causa de duplicata sistêmica encontrada: `proposeDecision` criava nova PENDING a cada chamada concorrente/repetida com o mesmo owner + empresa + oportunidade + título.

Correção: reutiliza PENDING_HUMAN_APPROVAL / DEFERRED existente antes do `create`. Histórico aprovado/rejeitado não é apagado.

Href de Decision na auditoria/jornada: `/cockpit#cockpit-decisoes` (antes caía no hub da empresa).

Risco residual: corrida extrema find-then-create sem índice único parcial — sem migration neste Sprint.

## 13. Prioridades

Ranking no Cockpit continua exigindo ação humana (decidir, registrar, dados ausentes). Sem prioridade inventada só porque existe registro. Sem redesign.

Estado: FUNCIONANDO no código. NÃO TESTÁVEL autenticado.

## 14. Alertas

Corrigidos destinos de playbook:

- aguardando decisão → `/aplicacoes?status=AGUARDANDO_APROVACAO`
- resultado pendente → `/aplicacoes?resultado=pendente`
- transferência atrasada → `/aplicacoes?status=EM_TESTE`

CMV → Financeiro da empresa. Experimento sem medição → Experimentos. Decisão pendente → Cockpit decisões. Evidência → experimentos concluídos. Memória → memória da empresa.

## 15. Automações

Motor inalterado na autoridade: detecta, avisa, gera alerta. Não aprova, não investe, não move dinheiro, não cria evidência, não valida memória, não conclui experimento, não executa ação externa.

Teste controlado (criar regra desligada → revisar → ativar → condição → alerta → pausar) **não executado na UI** (walkthrough indisponível). Persistência Sprint 11 cobre criação, isolamento, idempotência da execução e reconhecimento humano.

## 16. Financeiro

Bug real no motor: margem bruta usava CMV como 0 quando não informado, e isso puxava EBITDA.

Correção: `grossMargin` só existe com `informed.cogs`; senão `null` e `ebitda` também `null`. Fórmula: margem bruta = receita líquida − CMV. Faturamento bruto não substitui receita líquida.

Consistência matemática coberta por `financial-engine.test.ts`. Carteira real **não** foi aberta.

## 17. Cockpit

Render **não** grava mais `cockpit.viewed` a cada carga (spam de auditoria). `writeCockpitViewed` / `recordCockpitViewAction` permanecem disponíveis, sem chamada no page render.

Perguntas operacionais (quem precisa de atenção, por quê, indicador, decisão, ação, o que mudou) continuam no snapshot existente. Sem card decorativo novo.

## 18. Assistente IA

Classificação DADO / INFERÊNCIA / HIPÓTESE / EVIDÊNCIA revalidada em testes. Fonte externa permanece distinta e não vira evidência da empresa.

Perguntas reais do briefing **não foram executadas** (sem sessão). Não inventar respostas.

## 19. Pesquisa externa

Motor exige fonte, URL e contexto. Health produção: `webSearchConfigured true`. Benchmark de mercado ≠ evidência operacional. Sem walkthrough autenticado da pergunta de CMV vs mercado.

## 20. Memória

Observação → proposta → aprovação/rejeição humana → memória validada / transversal. Sem promoção automática. Persistência Sprint 6 e ciclo 16/17 revalidam.

## 21. Auditoria

Problemas reais:

1. `cockpit.viewed` no render poluía a trilha.
2. `getApplicationAudit` usava `contains: "viewed"`, o que **escondia** `*.reviewed` (`reviewed` contém `viewed`).
3. Lista do owner saturava testes/consulta operacional (limit baixo + ruído).

Correções: não gravar viewed no render; excluir `*.viewed` / `*.refresh` / `*.render` da listagem padrão **sem** excluir `reviewed`; `company.archive` agora grava `companyId`; teste de restore consulta por empresa.

## 22. Duplicidades

Diagnosticado no código:

- Decision: causa de proposta duplicada (corrigida na origem).
- PlaybookApplication: unique `[playbookId, destinationCompanyId]` já existia.
- Opportunity / Experiment / Evidence / Memory / Alert: sem DELETE destrutivo. Idempotência do ciclo 16/17 preservada.

Varredura destrutiva de produção **não** foi feita.

## 23. Concorrência

`proposeDecision` passou a ser idempotente no caso same-key pendente. Persistência Sprint 10/11/16 cobre retry e unique de automação. Duplo clique visual NÃO TESTÁVEL.

## 24. Segurança

`requireOwnedResource`, isolamento de company / application / playbook / strategy / connection / AI / audit **não** foram relaxados. Testes de ID manipulado (Sprint 12, 16, 17, refinement-10) passam. Login permanece exigido.

## 25. Responsividade

Código: tabela desktop / cards mobile, filtros wrap, timeline vertical, overflow-x só em chips do Cockpit.

**Auditoria visual 1920 / 1440 / 1366 / 1024 / 768 / 390: não executada** (walkthrough autenticado indisponível).

## 26. Performance

Sem N+1 novo. Listagens summary (take limitado) + detalhe full. `sprint14-persistence` continua o mais lento (~100s) por contenção do banco — timeout já elevado no Sprint 18; sem otimização prematura.

## 27. Erros

`toPublicError` agora mascara P20xx, Unique/Foreign key constraint, “Record to update not found” e UUID. Usuário vê mensagem humana (`HUMAN_MESSAGES.internal` etc.). Sem Prisma/SQL/stack na API pública.

## 28. Dados ausentes

Motor financeiro e chips de jornada preferem `null` / “Sem dados” a 0 inventado. Correção da margem bruta reforça isso no CMV ausente.

## 29. Consistência

Mesma fórmula DRE no Cockpit, Empresa e Financeiro (um motor). Assistente classifica a partir dos fatos persistidos. Carteira real não foi cruzada tela a tela (sem sessão).

## 30. Bugs encontrados

1. `proposeDecision` duplicava pendentes iguais.
2. Margem bruta / EBITDA inventados com CMV ausente.
3. Erros técnicos (P2002, P2025, UUID, unique constraint) podiam vazar.
4. `cockpit.viewed` a cada render.
5. Alertas de playbook apontavam para `/aplicacoes` sem filtro.
6. Decision na auditoria não ia à fila de decisões.
7. Auditoria de aplicação escondia eventos `reviewed`.
8. Arquivamento sem `companyId` no audit.
9. Lista de auditoria saturada por ruído de visualização.

## 31. Bugs corrigidos

Todos os 9 acima, com testes em `tests/sprint19-operational-validation.test.ts` e ajustes nos testes de jornada / financeiro / refinement-10.

## 32. Bugs pendentes

- Walkthrough autenticado visual (1920–390) ainda pendente.
- Perguntas reais do Assistente e pesquisa web na carteira real ainda pendentes.
- Teste controlado de automação na UI ainda pendente.
- Corrida extrema de `proposeDecision` sem unique parcial (sem migration).
- Consistência numérica EBITDA/CMV entre telas da carteira real: não conferida ao vivo.

## 33. Testes

397/397 (55 arquivos). Obrigatórios cobertos: owner/company isolation (persistência existente), idempotência (decisão + automação + ciclo), evidence origin/destination (16/17), application lifecycle (17), decision duplication (propose + isolation), financial consistency, AI classification, external source (research), alert navigation (sprint19).

## 34. TypeScript

`npx tsc --noEmit` passou.

## 35. Lint

`npm run lint` passou.

## 36. Build

`npm run build` passou.

## 37. Migration

Nenhuma. Sem reset, drop, truncate ou apagamento de produção.

## 38. Commit SHA

Preenchido após o commit deste Sprint.

## 39. Vercel

Preenchido após o deploy Production.

## 40. Health

Pré-deploy (produção vigente): status ok · release 1.0 · version 1.0.0 · openaiExposed false · webSearchConfigured true · automationEngine ok · scheduler configured · database ok.

Pós-deploy: revalidar `/api/health`.

## 41. Pendências reais

1. Walkthrough autenticado humano nas telas do ciclo.
2. Conferência ao vivo do financeiro da carteira (sem inventar número).
3. Execução controlada de automação na UI.
4. Unique parcial de decisão pendente, só se a corrida aparecer em produção.

## 42. Recomendação para Sprint 20

**Não iniciado.** Quando for: walkthrough autenticado real (prioridade), conferência financeira da carteira sem dado fictício, e só então unique parcial de decisão se a duplicata residual aparecer. Sem novo módulo.
