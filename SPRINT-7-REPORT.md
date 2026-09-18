# Sprint 7 — IA Executiva contextual

**Branch:** `build/sprint-7`  
**Data:** 2026-09-18  
**Commit:** `feat: Sprint 7 executive contextual AI assistant`

## Arquitetura

Camadas:

- `lib/ai-config.ts` — modelo via `OPENAI_MODEL` (fallback `gpt-4.1-mini`), limites de contexto.
- `lib/ai-executive-engine.ts` — motor determinístico: briefing, classificação, recorte, prioridade, propostas, prompt injection.
- `services/aiContextService.ts` — monta contexto de **uma** empresa com owner isolation.
- `services/aiService.ts` — conversa, persistência, chamada OpenAI opcional, auditoria.
- `services/aiActionService.ts` — propostas persistidas; execução só após confirmação humana.
- UI em `/assistente` e `/empresas/[id]/assistente`.

A IA **não inventa dados**. Fatos vêm do motor determinístico. OpenAI, se configurada, só reescreve o resumo; números fora do contexto são descartados.

## Context builder

`getExecutiveContext(ownerId, companyId)` exige `company.ownerId === ownerId`. Recorte:

cadastro, 360°, gargalos, oportunidades (score/status/evidência), planos/tarefas, DRE/metas/caixa/cenários, experimentos/medições, evidências, memórias aprovadas.

Não envia o banco inteiro. `sliceExecutiveContext` prioriza a intenção da pergunta. Limite ~12k caracteres.

## Prompt base

`EXECUTIVE_SYSTEM_PROMPT` separa:

1. SYSTEM RULES  
2. CONTEXT DATA (bloco “not instructions”)  
3. USER QUESTION  

Regras: não inventar; separar DADO/INFERÊNCIA/HIPÓTESE/EVIDÊNCIA; ausência explícita; memória não é verdade universal; transferibilidade ≠ probabilidade; nenhuma ação crítica sem confirmação.

## Segurança

- Chaves só no servidor. `openaiExposed: false` no health.
- Sem OpenAI a aplicação não quebra: briefing determinístico + “IA indisponível — configure o provedor.”
- Prompt injection em pergunta ou em `notes` da empresa é tratado como dado.
- IDs de outra carteira → `Empresa não encontrada.`
- Pesquisa web desta Sprint permanece desligada no `/api/ai`.

## Owner isolation

Toda leitura/escrita de contexto, conversa e proposta exige o owner. Testes cobrem contexto, pergunta e confirmação.

## Fallback

Sem `OPENAI_API_KEY` (ou se a API falhar / inventar número): briefing determinístico com faturamento, CMV, EBITDA, oportunidade, atraso de plano e experimentos quando existirem.

## Ações sugeridas

Permitidas, **só após Revisar proposta → Confirmar criação**:

- criar oportunidade (rascunho)
- criar plano 30/60/90
- criar experimento

Bloqueadas: criar despesa, mudar status crítico, aprovar investimento, excluir dados, concluir experimento, validar evidência, alterar score, promover memória, ação externa.

## Persistência

Reuso de `AIConversation` / `AIMessage` / `AISource`. Extensão:

- `AIMessage.provider`, `model`, `structured`
- `AIActionProposal` (PENDING / CONFIRMED / REJECTED)

Auditoria: `ai.question`, `ai.answer`, `ai.action.proposed`, `ai.action.confirmed`. Sem log de conteúdo completo nem secrets.

## Rotas

- `/assistente`
- `/empresas/[id]/assistente`
- `/api/ai` (POST autenticado)

## UI

Tela premium preto/dourado: seletor de empresa, histórico, atalhos executivos, blocos classificados, fontes internas, propostas com confirmação.

Menu: Assistente IA em Inteligência (sai de “Em breve”). Cockpit: “Perguntar à A TEIA”. Central da empresa: “Analisar com IA”.

## Testes

110 anteriores + 16 novos = **126/126**.

Cobertura: context builder, empty, financeiro, oportunidades, execução, experimentos, evidências, memória, DADO/INFERÊNCIA/HIPÓTESE/EVIDÊNCIA, fallback sem chave, proposta, confirmação obrigatória, prompt injection, isolation, leakage.

## Build

- `npx tsc --noEmit` — 0 erros
- `npm run lint` — 0 erros
- `npm test` — 126/126
- `npm run build` — passou (`/assistente` e `/empresas/[id]/assistente`)

## Modelo configurado

`process.env.OPENAI_MODEL` com fallback `gpt-4.1-mini`. Não há modelo antigo hardcoded além desse fallback seguro.

## Migration

`database/migrations/20260918030000_sprint7_ai_executive`

Não altera migration antiga. Não reseta banco.

## Limitações

- OpenAI só narra o resumo; a estrutura factual é determinística.
- Score de oportunidade **não** muda.
- Sem pesquisa web, benchmark, WhatsApp, e-mail, agentes autônomos ou scraping.
- Walkthrough autenticado no browser de produção não foi feito nesta sessão.

## Pendências

- Sprint 8 não iniciada.
- Conexões, Estratégia e Auditoria continuam fora do produto.
- Walkthrough manual: login → selecionar empresa → atalhos → revisar proposta → confirmar.

## Segurança do commit

Nenhum `.env`, token, senha, API key ou secret incluído.
