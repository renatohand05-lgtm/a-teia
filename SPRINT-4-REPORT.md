# Sprint 4 — Motor financeiro

**Branch:** `build/roadmap-completo`  
**Data:** 2026-09-17  
**Commits:** correção Sprint 3 em commit separado; este relatório descreve o motor financeiro.

## Arquitetura

Camadas:

- `lib/financial-engine.ts` — matemática pura (DRE, indicadores, break-even, faturamento necessário, cenários, ROI, payback, meta vs realizado, caixa).
- `lib/financial-insights.ts` — DADO → INFERÊNCIA → HIPÓTESE → TESTE. Não afirma causa sem evidência.
- `lib/period.ts` — competência `periodMonth` + `periodYear`.
- `lib/validations.ts` — Zod (dinheiro ≥ 0, % 0–100, mês 1–12, ano 2000–2100, sem NaN/Infinity).
- `services/financialService.ts` — persistência Prisma, owner isolation, dashboard.
- `app/empresas/financial-actions.ts` — server actions.
- UI em `/empresas/[id]/financeiro/*`.

Regra: fórmula não vive em componente React.

## Models usados

Reutilizados:

- `FinancialRecord` — fluxo de caixa (`kind` INFLOW/OUTFLOW) + `category`, `periodMonth`, `periodYear`.
- `Opportunity.investment` / `expectedReturn` — hipótese financeira.
- `ActionPlan` — `realizedCost` / `realizedReturn` só se o usuário informar.
- `Company.ownerId` — isolamento.

Novos (mínimos):

- `FinancialStatement` — DRE mensal. Nulo = sem dado informado. Zero = zero registrado.
- `FinancialGoal` — metas da competência.

Não criados: Open Banking, conciliação, NF-e, forecast ML.

## Migration

`database/migrations/20260917223000_sprint4_financial_engine`

Não altera migrations antigas. Não reseta o banco.

## Fórmulas

- Receita líquida = receita bruta − deduções
- Margem bruta = receita líquida − CMV
- EBITDA = margem bruta − despesas operacionais
- CMV % = CMV / receita líquida × 100
- Margem bruta % = margem bruta / receita líquida × 100
- Folha % / marketing % / EBITDA % sobre receita líquida
- Ticket médio só com número de vendas informado
- Margem de contribuição = 1 − (% CMV + % impostos + % delivery + % outros variáveis)
- Break-even = custos fixos / margem de contribuição
- Faturamento necessário = (custos fixos + lucro desejado) / margem de contribuição
- Cenários: 70% / 100% / 130% sobre receita e custos variáveis; fixos inalterados
- ROI 12 meses = ((retorno mensal × 12) − investimento) / investimento × 100; investimento ≤ 0 → null
- Payback = investimento / retorno mensal

Divisão por zero e dados insuficientes devolvem `null` + lista do que falta.

## Validações

Zod: valores ≥ 0, percentuais 0–100, competência válida, rejeita NaN/Infinity.

## Rotas

- `/empresas/[id]/financeiro`
- `/empresas/[id]/financeiro/dre`
- `/empresas/[id]/financeiro/fluxo-caixa`
- `/empresas/[id]/financeiro/cenarios`
- `/empresas/[id]/financeiro/metas`

## Testes

- Motor: DRE, indicadores, break-even, faturamento necessário, contribuição, cenários 70/100/130, ROI, payback, meta vs realizado, divisão por zero, dados ausentes, negativo inválido, fluxo de caixa, insights sem afirmar causa.
- Persistência: DRE, metas, caixa, owner isolation (usuário B não lê/grava empresa de A).

## Segurança

Toda query financeira exige `company.ownerId === session.user.id`. `companyId` da URL sozinho não basta.

## Limitações

- Sem conciliação bancária, PIX, Open Banking, NF-e ou contabilidade fiscal.
- Caixa básico (entrada/saída).
- Retorno realizado do 30/60/90 nunca é copiado do esperado.
- Gráfico só com ≥ 2 meses de DRE.

## Pendências

- Walkthrough manual no browser (login → DRE → caixa → metas → cenários → oportunidade → plano).
- Comparação ano atual vs ano anterior (estrutura mensal já existe).
- Evidência financeira real (experimento medido) continua fora desta sprint.

## Sugestão Sprint 5

Memória estratégica + experimentos com KPI financeiro medido, para um resultado deixar de ser hipótese e virar evidência — sem automatizar investimento ou aprovação.
