# Refinamento 1.0 — Bloco 4

**Escopo:** Oportunidades + Score + Decisões + Execução 30/60/90  
**Data:** 2026-09-19  
**Commit:** `refactor: refinement 4 opportunities decisions and execution UX`  
**SHA:** pendente  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Bloco 5:** não iniciado

## Oportunidades

Listagem responde o quê, por que importa, prioridade, impacto, esforço, evidência e próximo passo. Origem só com o schema real: Diagnóstico 360° ou Manual. Problema observado e hipótese ficam separados. Empty state: “Nenhuma oportunidade identificada.” CTA único: Gerar a partir do Diagnóstico 360°. Filtros refinados (status, dimensão, origem, evidência, financeiro, faixa de score). Um CTA primário por contexto; demais ações recolhidas.

## Score

Fórmula e pesos do motor **não mudaram**. Fatores visíveis: Severidade, Impacto, Urgência, Confiança, Velocidade, Facilidade. Score parcial explícito quando falta payback. “Por que esta oportunidade tem score X?” com razões do motor. Score ≠ prioridade operacional.

## Ranking

Cards (não tabela): #, oportunidade, score, faixa, status, origem, evidência, próximo passo. Empresa implícita na rota da empresa. Mobile empilha.

## Decisões

Central do Cockpit responde o que se decide, por quê, custo/retorno estimados, evidência e o que acontece se aprovar. Fluxo Revisar → Aprovar / Rejeitar / Adiar. IA não aprova (`decision.approve` bloqueado). DEFERRED = Adiada. Rejeição não apaga oportunidade. Criar plano 30/60/90 é decisão humana explícita (origem USER).

## Plano 30/60/90

Topo: objetivo, empresa, origem, horizonte, status, responsável, progresso. Fases: 30 corrigir, 60 tração, 90 escalar. Sem tarefas: “Plano ainda sem tarefas.” — sem 0% fingindo execução. Progresso = concluídas / ativas.

## Tarefas / Execução

Tarefa responde o quê, quem, quando, status. Atraso determinístico: “Atrasada”. Carteira agrupada: atrasadas, em andamento, concluídas. Tarefa concluída ≠ resultado validado. CTA para criar experimento.

## Evidência / IA

Oportunidade continua hipótese até validação real. Pesquisa externa e memória não viram evidência operacional. IA pode explicar e sugerir; não aprova, não altera score definitivo, não valida evidência.

## Mobile / Acessibilidade / Segurança / Performance

Cards no ranking, detalhe, decisões e execução. Informações essenciais sem tabela horizontal. Labels nos filtros, `<details>` com summary, atrasos também em texto. Owner isolation intacto. `expectedUpdatedAt` não removido. Sem query extra desnecessária além de decisões da oportunidade no detalhe.

## Testes

**284** testes, 37 arquivos. Novos em `tests/refinement-decision-execution.test.ts`.

## TypeScript / lint / build

0 / 0 / aprovado.

## Commit / Vercel

**SHA:** pendente no commit desta entrega.  
Production: https://a-teia.vercel.app

## Pendências

Walkthrough autenticado não executado. Formulário de primeira tarefa em plano legado e justificativa de decisão no backlog.

## Backlog

Grupo **REFINAMENTO 1 — BLOCO 4** em `BACKLOG-POS-SPRINT-13.md`.

## Conclusão

**BLOCO 4 ENCERRADO.**
