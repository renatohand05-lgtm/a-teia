# Refinamento 1.0 — Bloco 6

**Escopo:** Assistente IA + inteligência externa + fontes + contexto executivo  
**Data:** 2026-09-19  
**Commit:** `refactor: refinement 6 ai assistant and external intelligence UX`  
**SHA:** (preenchido após o commit)  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Bloco 7:** não iniciado  
**Migrations:** nenhuma

## Auditoria inicial

O motor dos Sprints 7 e 8 já existia e foi reutilizado:

- `askExecutiveAssistant`, `getExecutiveContext`, `buildExecutiveBriefing`, `sliceExecutiveContext`
- OpenAI via `buildOpenAIMessages` (SYSTEM RULES / INTERNAL DATA / EXTERNAL RESEARCH / USER QUESTION)
- Tavily via `researchService` + `shouldUseExternalResearch` (web opcional; pergunta interna não pesquisa)
- Models `AIConversation`, `AIMessage`, `AISource` sem alteração
- Classificação DADO / INFERÊNCIA / HIPÓTESE / EVIDÊNCIA já no briefing determinístico
- Fallback sem OpenAI e sem Tavily já persistido
- Isolamento por `userId` / `ownerId` / `companyId` em conversa e pesquisa

Lacunas de experiência (não de motor):

- Cobertura da empresa não aparecia (ausência podia parecer vazio técnico)
- Atalhos misturavam automação/alocação com a pergunta executiva
- Resposta despejava classificação e `researchDebug` na tela principal
- Fontes rejeitadas/irrelevantes podiam aparecer no fluxo do usuário
- Histórico usava só a conversa mais recente, sem “Nova conversa”
- Cockpit “Analisar com IA” não levava a pergunta da prioridade
- Chips globais iam para `/assistente` sem `companyId` quando o filtro existia

## Arquivos alterados

- `lib/assistant-ui.ts` (novo) — cobertura ✓/—, atalhos, erros amigáveis, fontes, loading, hrefs
- `lib/ai-executive-engine.ts` — copy executiva (gargalo, experimento sem resultado, evidência comprovada, memória de outra operação); atalhos; intent `comprov*`
- `components/ai/AssistantView.tsx` — copiloto executivo
- `app/empresas/[id]/assistente/page.tsx` — contexto, cobertura, histórico, `?nova=` / `?conversa=`
- `app/assistente/page.tsx` — `?empresa=` redireciona com isolamento
- `components/cockpit/CockpitView.tsx` — “Analisar esta prioridade com IA”
- `components/cockpit/GlobalCockpitPanels.tsx` — chips com empresa quando o filtro existe
- `tests/refinement-ai-intelligence.test.ts`
- `BACKLOG-POS-SPRINT-13.md` — seção BLOCO 6
- `REFINEMENT-6-AI-EXTERNAL-INTELLIGENCE-REPORT.md`

Não alterados: Prisma, OpenAI client, Tavily client, `research-engine` de filtro/claims, `aiContextService` (reutilizado), version 1.0.0.

## Melhorias

- Contexto discreto: empresa, segmento, período, cobertura ✓/— (ausência não vira 0)
- Perguntas rápidas só preenchem/enviam; sem resposta hardcoded
- Layout: Resposta direta → Por que → Seu negócio / Referência externa → Leitura → Próxima ação → Fontes
- Classificação detalhada só em “Ver classificação”
- Máximo 4 fontes usadas; exemplo/calculadora fora da resposta principal; `researchDebug` oculto
- Divergência sem média artificial
- Diagnóstico ausente: “Esta empresa ainda não possui Diagnóstico 360°.” + CTA
- Experimento sem medição: “O experimento ainda não possui resultado medido.”
- Evidência sem VALIDATED não aparece como comprovada
- Memória de outra empresa: “Aprendizado de outra operação.”
- Uma ação principal e no máximo duas secundárias
- Loading contextual; erros sem stack e sem nome de credencial na UI
- Fallback determinístico rotulado como tal
- Histórico por empresa + Nova conversa; conversa de outro owner/empresa é ignorada
- Cockpit e ficha da empresa abrem o Assistente já contextualizado

## Segurança

Owner, company, conversation e research continuam isolados. Texto web permanece DADO NÃO CONFIÁVEL (`wrapExternalAsData`). SYSTEM / INTERNAL / EXTERNAL / USER separados. Ações críticas (`evidence.validate`, `experiment.complete`, `memory.promote`, `decision.approve`) continuam humanas. IA só sugere CREATE_EXPERIMENT / CREATE_PLAN / CREATE_OPPORTUNITY com confirmação.

## Testes / TypeScript / lint / build

**304** testes, 39 arquivos. TypeScript 0. Lint 0. Build aprovado.

## Commit / Vercel / health

Preenchido após deploy.

## Pendências

Walkthrough autenticado com J BURGUERS não executado (sem browser autenticado). Cosméticos no backlog do Bloco 6. Não bloqueia o Release 1.0.

## Conclusão

**BLOCO 6 ENCERRADO.** O Assistente passa a se comportar como copiloto executivo sobre dados reais, sem reconstruir OpenAI, Tavily ou os Sprints 7/8. Aguardo autorização para o Bloco 7.
