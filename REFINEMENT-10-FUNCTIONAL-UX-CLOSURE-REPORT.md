# Refinamento 1.0 — Bloco 10

**Escopo:** Fechamento das pendências funcionais + UX residual  
**Data:** 2026-09-19  
**Commit:** `feat: close refinement 10 functional UX leftovers`  
**SHA:** `af99f33d22190e7ad4f6e996ee8e6b3abc10b035`  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Migration:** `20260919213000_refinement10_decision_reason` (`Decision.humanReason` opcional)  
**Próximo bloco:** não iniciado

## Auditoria inicial

As seis pendências do backlog continuavam abertas no código:

1. Focus trap — ESC e overlay existiam; TAB escapava
2. Inbox — alertas só em `/automacoes#alertas`
3. Período no Cockpit — filtros sem recorte de competência
4. Undo de arquivamento — só `archiveCompany`
5. Justificativa — `rationale` é da proposta, não do humano
6. Drawer de auditoria — painel lateral com JSON cru

Nada disso foi duplicado.

## Focus trap

`lib/focus-trap.ts` + `components/ui/FocusTrap.tsx` + `Drawer`.

Quando aberto: foco entra, TAB/SHIFT+TAB ciclam, ESC fecha, foco retorna, body lock, overlay e `aria-label` no fechar.

Usado no drawer mobile da sidebar e no detalhe da auditoria.

## Inbox de alertas

Rota `/alertas`. Motor inalterado.

Filtros: Todos / Novos / Atenção / Resolvidos e Crítico / Atenção / Informativo.

Ações: Reconhecer, Resolver, Dispensar. Badge do header usa `countOpenOwnerAlerts` (abertos reais).

## Filtro de período

URL `?periodo=atual|anterior|30d|90d`.

Financeiro recorta por competência mensal (último DRE na janela). Sem dado na competência → `—` / Sem dados, não zero.

Empresas, cadastro e memórias totais não fingem recorte temporal.

Alertas do KPI permanecem “abertos agora”.

## Arquivamento reversível

`restoreCompany` com owner isolation e auditoria `company.restore`. CTA na ficha arquivada. Sem exclusão.

## Justificativas

Campo novo `humanReason` (não reutiliza `rationale`).

Recomendada, não obrigatória — não quebra decisões antigas.

Aparece no detalhe, na oportunidade e na auditoria. IA só sugere texto via Assistente; humano confirma.

## Auditoria

Clique na linha/card abre drawer. Campos seguros + metadata sanitizada (sem senha, token, key, cookie, connection string). Mobile em cards.

## Testes

333 testes / 44 arquivos. TypeScript, lint e build a registrar após a rodada.

## Produção

Vercel Production **Ready**: https://a-teia.vercel.app (`dpl_CZzZasn8EDwLDTuAzYkLeBypWbKL`)

Health: status ok, release 1.0, version 1.0.0, openaiConfigured true, webSearchConfigured true, openaiExposed false, automationEngine ok, scheduler configured, database ok.

## Walkthrough

Browser autenticado **não disponível**. Pendência não bloqueante.

## Backlog

`BACKLOG-POS-SPRINT-13.md`: Bloco 10 marcado RESOLVIDO. Restam segmento fechado, rota de edição e filtros de auditoria na URL.
