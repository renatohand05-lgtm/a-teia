# SPRINT 2 — Relatório

**Projeto:** a-teia  
**Data:** 2026-09-17  
**Commit:** `feat: Sprint 2 opportunity engine and priority scoring`

A Sprint 0 e a Sprint 1 permanecem intactas: autenticação, Cockpit V9, onboarding, Diagnóstico 360°, Score 360, histórico e isolamento por `ownerId`.

## O que foi implementado

Fluxo:

`DIAGNÓSTICO 360° → GARGALOS → OPORTUNIDADES → SCORE DE PRIORIDADE → RANKING → AÇÃO RECOMENDADA`

- Motor de hipóteses a partir do último diagnóstico (dimensões com nota ≤ 3).
- Criação manual de oportunidade.
- Score de prioridade 0–100 com explicação persistida.
- Ranking filtrável.
- Payback simples (`investimento / retorno mensal`) sem inventar dado.
- Mini cockpit da empresa: bloco Oportunidades + Central de Decisão Top 3.
- Geração **nunca** automática: o usuário seleciona e salva.

Classificação:

| Tipo | O que é |
| --- | --- |
| DADO | nota do diagnóstico |
| INFERÊNCIA | gargalo (menor nota) |
| HIPÓTESE | oportunidade sugerida ou manual |
| EVIDÊNCIA | não atribuída nesta sprint (`HYPOTHESIS` por padrão) |

## Models usados

Reuso do `Opportunity` da Sprint 0 (não foi criado model duplicado). `Decision` e `Strategy` não foram ativados.

Campos novos em `Opportunity`: `diagnosisId`, `createdById`, `sourceDimension`, `templateKey`, `origin`, `problemStatement`, `hypothesis`, `expectedImpact`, `urgency`, `confidence`, `effort`, `estimatedHours`, `paybackMonths`, `scorePartial`, `scoreReasons`, `evidenceLevel`, `queuedForPlan`.

Campos reaproveitados:

- `investment` = investimento estimado
- `expectedReturn` = retorno mensal estimado
- `score` = prioridade 0–100
- `status` passou de `String` (`open`) para enum `OpportunityStatus`

Enums novos: `OpportunityStatus`, `EvidenceLevel`, `OpportunityOrigin`.

Nenhuma oportunidade nasce como `VALIDATED_EVIDENCE`.

## Migration

`database/migrations/20260917140000_sprint2_opportunity_engine`

Aplicada com `npx prisma migrate deploy --schema database/schema.prisma` no Neon `neondb`.

## Fórmula do score

Arquivo: `lib/opportunity-score.ts`

```
priority =
  severity * 0.25
+ impact   * 0.20
+ urgency  * 0.20
+ confidence * 0.15
+ speed    * 0.10
+ ease     * 0.10
```

Cada fator está em 1–5. Normalização: `((weighted - 1) / 4) × 100` → 0–100.

- **severity** = `6 - nota da dimensão` (nota 1 = máxima prioridade)
- **ease** = `6 - effort`
- **speed**: payback ≤1 mês → 5; ≤3 → 4; ≤6 → 3; ≤12 → 2; >12 → 1
- Sem investimento/retorno: speed = 3 (neutro), `scorePartial = true`, payback = null

Faixas (`PRIORITY_BANDS`):

| Score | Badge |
| --- | --- |
| 80–100 | Alta prioridade |
| 60–79 | Média prioridade |
| 0–59 | Baixa prioridade |

## Templates por dimensão

Arquivo: `lib/opportunity-templates.ts`

Sugestões só para nota ≤ 3. Exemplos:

| Dimensão | Hipóteses |
| --- | --- |
| Atração | aquisição, mídia local, parceria, indicação, presença digital |
| Conversão | script, treinamento, follow-up, velocidade, taxa de resposta |
| Ticket Médio | upsell, cross-sell, combos, pacotes, mix premium |
| Recorrência | CRM, recompra, fidelização, pós-venda, campanhas |
| Indicação | programa, embaixadores, benefício |
| Imagem da Marca | posicionamento, identidade, prova social, avaliações |
| Imagem Comercial | apresentação, proposta, catálogo, materiais |
| Operação | processo, SLA, produtividade, escala, padrão |
| Financeiro | DRE, margem, CMV, folha, caixa |
| Gestão & Dados | KPIs, metas, rotina, dashboard, governança |

Template já gerado para o mesmo `diagnosisId` não duplica.

## Rotas

| Rota | Função |
| --- | --- |
| `/empresas/[id]/oportunidades` | Ranking + filtros |
| `/empresas/[id]/oportunidades/gerar` | Selecionar hipóteses do 360° |
| `/empresas/[id]/oportunidades/nova` | Criação manual |
| `/empresas/[id]/oportunidades/[opportunityId]` | Detalhe, score, ações |
| `/empresas/[id]/oportunidades/[opportunityId]/editar` | Edição |

Ações no detalhe: editar, ativar, arquivar, em execução, preparar para plano futuro (`queuedForPlan` — sem 30/60/90 nesta sprint).

## Testes

`npm test` — **33/33**

Inclui: score, severidade, ease, payback, ranking, empate, ausência de retorno, templates, isolamento, persistência sugerida + manual, idempotência de template.

`npm run build` — passou (Next.js 15.5.25). Rotas novas no output.

## Riscos

- Score parcial quando não há financeiro: correto, mas o ranking ainda compara com oportunidades que têm payback.
- Templates são hipóteses genéricas, não causa comprovada.
- Isolamento continua por `ownerId` (sem RBAC avançado).
- `queuedForPlan` só marca intenção; Sprint 3 precisa consumir isso.

## Pendências

1. Reiniciar `npm run dev` (Prisma generate no Windows exige soltar o query engine).
2. Walkthrough manual dos 15 passos no browser.
3. Se a Vercel usar banco diferente do Neon de `DATABASE_URL`, aplicar a mesma migration lá.

## Sugestões Sprint 3

Não iniciar agora.

1. Plano 30/60/90 a partir de `queuedForPlan` / Top 3.
2. Tarefas e donos.
3. Experimentos ligados à hipótese (TESTING → evidência parcial).
4. Visual de evolução Score 360 × execução das oportunidades.
5. Motor financeiro (DRE) usando as estimativas já gravadas.

## Critério de conclusão

| Critério | Status |
| --- | --- |
| Oportunidades persistem | Sim |
| Manual funciona | Sim |
| Sugestões por diagnóstico | Sim (com aprovação) |
| Score 0–100 | Sim |
| Explicabilidade | Sim |
| Ranking | Sim |
| Payback básico | Sim |
| Top 3 na empresa | Sim |
| Isolamento por owner | Sim |
| Migration | Aplicada |
| `npm test` | 33/33 |
| `npm run build` | Passou |
| Relatório | Este arquivo |
