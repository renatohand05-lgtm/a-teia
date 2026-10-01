# Sprint 20 — Certificação operacional 1.0

**Versão:** permanece **1.0.0**  
**Data:** 2026-10-01  
**Branch:** `main`  
**HEAD inicial:** `9204bb9` (Sprint 19 docs)  
**Working tree inicial:** limpa

## 1. Estado inicial

Sprint 19 em produção: 397 testes, health 1.0.0 ok, `openaiExposed false`, `webSearchConfigured true`. Pendências: walkthrough autenticado, conferência financeira da carteira, automação pela UI, responsividade visual, corrida de decisão.

Confirmado no repositório: `main` = `origin/main` = `9204bb9`. Produção `https://a-teia.vercel.app/api/health` ok.

## 2. Walkthrough autenticado

**WALKTHROUGH AUTENTICADO BLOQUEADO PELO AMBIENTE.**

Não há browser/session autenticado neste Sprint. `/login` devolve só a página pública. Autenticação não foi alterada, backdoor não foi criado, credencial não entrou em código.

Validação substituta: Prisma read-only na carteira persistida, motors, rotas compiladas, 401 testes.

Nada visual (clique, empty/filled, 1920–390, Assistente na UI, pesquisa web na UI) foi declarado visto.

## 3. Matriz de completude

Carteira persistida (não demo): **1 empresa**.

| EMPRESA | CADASTRO | 360 | FINANCEIRO | OPORT. | PLANO | EXP. | EVID. | MEMÓRIA | APLICAÇÃO |
|---|---|---|---|---|---|---|---|---|---|
| J BURGUERS | SIM · ACTIVE | 0 | 1 competência (9/2026) | 0 | 0 | 0 | 0 | 0 | 0 |

Segmento persistido: `ALIMENTAÇÃP` (typo do cadastro; não alterado).

Conexões 0 · Playbooks 0 · Automações 0 · Alertas 0.

## 4. Empresa(s) testada(s)

**J BURGUERS** — única empresa operacional. Números não foram alterados. Nenhuma entidade TESTE criada.

## 5. Financeiro

Competência **setembro/2026**, motor `calculateDRE` sobre o DRE persistido:

| Indicador | Origem | Valor |
|---|---|---|
| Faturamento | `grossRevenue` informado | R$ 600.000 |
| Deduções | informado | R$ 60.000 |
| Receita líquida | faturamento − deduções | R$ 540.000 |
| CMV | informado | R$ 162.000 |
| Margem bruta | receita líquida − CMV | R$ 378.000 |
| Folha | informado | R$ 108.000 |
| EBITDA | margem bruta − custos operacionais | R$ 170.490 |
| CMV % | CMV / receita líquida | 30,0% |
| EBITDA % | EBITDA / receita líquida | 31,57% |
| Meta de faturamento | `FinancialGoal.revenueTarget` | R$ 650.000 |
| Gap de faturamento | 600.000 − 650.000 | −R$ 50.000 |
| Meta de EBITDA | `FinancialGoal.ebitdaTarget` | R$ 204.750 |
| Gap de EBITDA | 170.490 − 204.750 | −R$ 34.260 |
| Meta de EBITDA % | persistida | 35% |
| Meta de CMV % | persistida | 28% |

As duas metas **não** são o mesmo campo (`mixed: false`). 204.750 não é 35% de 650.000.

**Inconsistência encontrada:** o Resultado financeiro rotulava “Meta” / “Gap para meta” com a **meta de faturamento** ao lado do EBITDA. O Cockpit comparava EBITDA 170.490 com a meta de EBITDA 204.750, mas o texto dizia só “meta”. Isso misturava naturezas.

**Correção:** rótulos distintos em Financeiro, hub da empresa, prioridades e Assistente IA. Meta de faturamento não substitui meta de EBITDA.

## 6. Diagnóstico

0 diagnósticos persistidos. Fluxo 10 dimensões existe no código/testes. **Não preenchido** na carteira real (não inventar 360°).

Nota = DADO INFORMADO. Gargalo = INFERÊNCIA. Diagnóstico ≠ evidência.

## 7. Oportunidades

0 persistidas. Geração a partir de diagnóstico **não executada** (sem 360°). Motor: oportunidade nasce como hipótese, não evidência.

## 8. Plano 30/60/90

0 planos. Não criado plano artificial na J BURGUERS.

## 9. Experimentos

0. Sem hipótese/medição fabricada.

## 10. Evidências

0. Encerrar experimento sem resultado medido continua bloqueado no serviço. Sem UI autenticada para tentativa inválida visual.

## 11. Memória

0. Aprovação continua humana. IA/automação/pesquisa/playbook não aprovam.

## 12. Conexões

0 conexões. Empty correto no código. Mapa não inventa ligação.

## 13. Estratégias

0. Distinção hipótese / em teste / validada permanece no domínio.

## 14. Playbooks

0. Nenhum playbook universal inventado.

## 15. Aplicações

0. Ciclo origem/destino/evidência local intacto nos testes 16/17.

## 16. Decisões

Pendentes órfãs (`companyId` nulo, títulos “Aprovar plano-piloto” e “Alocação de recursos — BALANCEADO — v1”) acumuladas por testes que apagam a empresa (`onDelete: SetNull`). **Não apagadas.**

Correções:
- `proposeDecision` em transação serializable com retry P2034.
- Cockpit lista só decisão com empresa ou alocação vinculada.

## 17. Automações

0 regras na carteira. Criação pela UI nasce `enabled: false` (`createAutomationAction`). Motor não aprova, não investe, não cria evidência. Teste controlado na UI **não executado**.

## 18. Alertas

Inbox 0. Filtros Todos/Novos/Atenção/Resolvidos e severidade existem no código. Sem alerta real para abrir.

## 19. Prioridades

Sinal real da J BURGUERS: EBITDA abaixo da **meta de EBITDA** (170.490 vs 204.750) e CMV 30% vs meta 28%. Sem ranking com dado inexistente (360° ausente não vira score inventado).

## 20. Cockpit

Responde com dados persistidos (carteira 1, receita/EBITDA da competência, decisões operacionais). Sem card extra. Contradição de meta corrigida.

## 21. Assistente IA

Perguntas reais na UI **não executadas**. `buildFinancialSummary` agora declara meta de faturamento e meta de EBITDA em separado; se EBITDA meta falta, diz que faturamento não a substitui.

## 22. Pesquisa web

Não executada na interface. Health: `webSearchConfigured true`. Fonte externa ≠ evidência.

## 23. Auditoria

`cockpit.viewed` não volta no render. Eventos `reviewed` não são filtrados como viewed. Sem walkthrough para conferir trilha ao vivo.

## 24. Responsividade

Não auditada visualmente (1920–390). Código mobile/cards/wrap do Sprint 18 preservado.

## 25. UX

Só rótulos de meta/gap e prioridade. Identidade preta/dourada intacta. Sem redesign.

## 26. Persistência

Refresh de diagnóstico/decisão/automação **não visto**. Persistência coberta pela suíte.

## 27. Duplo clique

Proteção serializable em `proposeDecision`. Duplo clique visual não executado.

## 28. Erros

`toPublicError` do Sprint 19 preservado (sem P20xx/UUID/Prisma na API).

## 29. Bugs encontrados

1. Financeiro e hub rotulavam meta/gap de faturamento como se fosse meta genérica ao lado do EBITDA.
2. IA não recebia `ebitdaTarget` e só falava meta de faturamento.
3. Prioridade dizia “abaixo da meta” sem especificar EBITDA.
4. Decisões órfãs de teste saturavam a Central de Decisões.
5. Corrida residual de `proposeDecision` (find-then-create).

## 30. Bugs corrigidos

Os 5 acima.

## 31. Pendências

1. Walkthrough autenticado visual.
2. Diagnóstico 360°, oportunidades, plano, experimentos, memória, playbooks e aplicações da carteira (hoje vazios — não é bug).
3. Automação e alerta pela UI (não há regra na carteira).
4. Pesquisa web na interface.
5. Responsividade 1920–390.
6. Typo de segmento `ALIMENTAÇÃP` (dado do usuário).
7. Órfãs de decisão no banco (histórico; ocultas no Cockpit).

## 32. Testes

401/401 (56 arquivos). +4 Sprint 20.

## 33. TypeScript

Passou.

## 34. Lint

Passou.

## 35. Build

Passou.

## 36. Migration

Nenhuma.

## 37. Commit SHA

`4defdf9` — fix: separate revenue and EBITDA goals in operational surfaces

## 38. Vercel

Production Ready — https://a-teia.vercel.app (`dpl_8RWPD4TGyeiMiHWXhtWZzwfJaaBt`)

## 39. Health

status ok · release 1.0 · version 1.0.0 · openaiExposed false · webSearchConfigured true · automationEngine ok · scheduler configured · database ok

## 40. Conclusão da certificação

**CERTIFICADO COM RESSALVAS**

Critérios técnicos de motor, isolamento, financeiro persistido da J BURGUERS, metas distintas e qualidade gates aprovados. Lacuna obrigatória: QA visual autenticado continua impossível neste ambiente. Sem isso a versão 1.0 não é CERTIFICADO integral.
