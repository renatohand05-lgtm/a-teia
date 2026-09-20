# Release 1.0 — checklist de produção

Validado por código, testes e `/api/health` em Production. Walkthrough autenticado no browser permanece para inspeção manual do Renato.

## CORE

- [x] Auth.js / login com rate limit
- [x] Cockpit com dados persistidos e filtro de período
- [x] Empresas, cadastro dedicado e isolamento por owner
- [x] Health `1.0` / `1.0.0`

## DADOS

- [x] 0 ≠ Sem dados
- [x] Cobertura transparente
- [x] Sem invenção de métrica ausente

## FINANCEIRO

- [x] Realizado ≠ projeção ≠ cenário
- [x] DRE, caixa, metas e competências
- [x] Máscaras BRL/% sem corromper persistência

## DECISÃO

- [x] Human-in-the-loop
- [x] Justificativa humana opcional (governança)
- [x] IA não aprova

## EXECUÇÃO

- [x] Plano 30/60/90 e tarefas
- [x] Progresso e prazos persistidos

## EXPERIMENTOS

- [x] Hipótese, KPI, meta e prazo
- [x] Resultado medido antes de classificar

## EVIDÊNCIA

- [x] HIPÓTESE ≠ EVIDÊNCIA
- [x] Classificação rastreável

## MEMÓRIA

- [x] Promoção humana
- [x] Transferência ≠ verdade automática

## IA

- [x] OpenAI só no servidor
- [x] Fallback determinístico
- [x] Sem execução crítica autônoma

## PESQUISA EXTERNA

- [x] Tavily no servidor
- [x] FONTE EXTERNA ≠ evidência interna
- [x] Erros sem nome de provedor na UI

## ALOCAÇÃO

- [x] Simulação ≠ proposta ≠ aprovado
- [x] IA não move capital

## AUTOMAÇÕES

- [x] Regras determinísticas
- [x] Execução manual e cron autenticado

## ALERTAS

- [x] Inbox `/alertas`
- [x] Sem alerta falso por dado ausente

## AUDITORIA

- [x] Trail por owner
- [x] Metadata sanitizada
- [x] Drawer e filtros na URL

## SEGURANÇA

- [x] Owner isolation
- [x] Secrets fora do frontend
- [x] `openaiExposed false`
- [x] Cron com `CRON_SECRET`

## UX

- [x] Empty states, skeletons, feedback e copy executiva
- [x] Login sem resíduo técnico

## RESPONSIVIDADE

- [x] Drawer mobile, cards de tabela e breakpoints principais no código
- [ ] Walkthrough visual autenticado (manual)

## DEPLOY

- [x] TypeScript / lint / testes / build
- [x] Vercel Production Ready
- [x] `/api/health` ok

Conexões e Estratégia permanecem futuros. Refinamento 1.0 tecnicamente encerrado.
