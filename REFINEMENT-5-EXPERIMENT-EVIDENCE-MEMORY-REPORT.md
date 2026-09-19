# Refinamento 1.0 — Bloco 5

**Escopo:** Experimentos + Resultados + Evidências + Memória estratégica  
**Data:** 2026-09-19  
**Commit:** `refactor: refinement 5 experiment evidence and memory UX`  
**SHA:** pendente  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Bloco 6:** não iniciado  
**Migrations:** nenhuma

## Auditoria inicial

O ciclo Sprint 5/6 já existia: criar → iniciar → medições append-only → `completeExperiment` (humano) cria `Evidence` → memória só com `propose` + `approve`. IA já bloqueada em `experiment.complete`, `evidence.validate` e `memory.promote`. UX misturava hipótese, resultado e “validado”; 0 aparecia sem cobertura; estágio pulava RESULTADO.

## Arquivos alterados

Helpers `lib/experiment-ui.ts` e `lib/memory-ui.ts`. Telas de experimentos, resultado, memória, cockpit da empresa, Cockpit global e detalhe da oportunidade. DTO do experimento ganhou `createdByName`; resumo ganhou `total` e `years`. `recordedAt` opcional no encerramento (campo já existente). Testes em `tests/refinement-experiment-memory.test.ts`.

## Regras preservadas

Hipótese ≠ evidência. Resultado não valida memória sozinho. Pesquisa externa ≠ evidência operacional. Score persistido não muda. Owner isolation intacto. Histórico de `ExperimentResult` continua append-only. Sem models novos. Release 1.0.0.

## UX

Listagem responde o que se testa, KPI, meta, período, investimento, responsável, resultado e próximo passo. Formulário em hipótese / teste / KPI / meta / período. Detalhe executivo com linha Planejado → Em andamento → Resultado registrado → Evidência avaliada. Comparação meta × resultado sem chamar “sucesso”. Evidência: “Resultado disponível para avaliação” + força limitada quando faltar dado. Memória responde o que, onde, quando e se pode reutilizar. Transferência: “Possível estratégia transferível.” Cockpit: Sem dados sem cobertura.

## Testes / TypeScript / lint / build

**293** testes, 38 arquivos. TypeScript 0. Lint 0. Build aprovado.

## Commit / Vercel / health

Pendente no commit desta entrega. Production: https://a-teia.vercel.app

## Pendências

Walkthrough autenticado não executado. Cosméticos no backlog do Bloco 5.

## Conclusão

**BLOCO 5 ENCERRADO.** Hipótese → resultado real → evidência → aprendizado → memória ficou rastreável. Aguardo autorização para o Bloco 6.
