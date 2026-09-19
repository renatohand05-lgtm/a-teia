import { describe, expect, it } from "vitest";
import {
  assessDataHealth,
  buildAlerts,
  buildPortfolioAIContext,
  canCompareCompanies,
  collectSignals,
  composePortfolioSummary,
  consolidateFinance,
  executionSummary,
  experimentSummary,
  explainPriority,
  groupOverdueTasks,
  isInformedNumber,
  mapRecentChanges,
  missingIsNotZero,
  opportunitySummary,
  rankGlobalPriorities,
  separateMemories,
  trendFromHistory,
  type PortfolioCompanyInput,
} from "@/lib/global-priority-engine";
import { canAccessCompany } from "@/lib/access-policy";

function company(overrides: Partial<PortfolioCompanyInput> = {}): PortfolioCompanyInput {
  return {
    id: "emp-1",
    name: "J BURGUERS",
    segment: "restaurante",
    status: "ACTIVE",
    updatedAt: "2026-09-18T12:00:00.000Z",
    diagnosis: { overallScore: 62, bottleneck: "Operação", createdAt: "2026-09-01T00:00:00.000Z" },
    finance: {
      periodLabel: "Set/2026",
      revenue: 100000,
      ebitda: 12000,
      ebitdaPercent: 12,
      ebitdaTarget: 15000,
      cogsPercent: 30,
      cogsTarget: 28,
      cash: 8000,
      history: [
        { periodLabel: "Ago/2026", revenue: 95000, ebitda: 11000, cogsPercent: 29 },
        { periodLabel: "Set/2026", revenue: 100000, ebitda: 12000, cogsPercent: 30 },
      ],
    },
    opportunities: [],
    plans: [],
    experiments: [],
    memories: [],
    evidence: [],
    ...overrides,
  };
}

describe("isolamento e ausência de dado", () => {
  it("isola portfolio por owner", () => {
    expect(canAccessCompany("owner-a", "owner-a")).toBe(true);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    const context = buildPortfolioAIContext({
      ownerId: "owner-a",
      companies: [company()],
      priorities: rankGlobalPriorities([company()]),
      consolidation: consolidateFinance([company()]),
    });
    expect(context.companyIds).toEqual(["emp-1"]);
    expect(context.payload).not.toContain("owner-b");
  });

  it("dado ausente não é zero e EBITDA ausente não é negativo", () => {
    expect(missingIsNotZero(null)).toBe(true);
    expect(isInformedNumber(null)).toBe(false);
    const empty = company({
      finance: {
        periodLabel: null,
        revenue: null,
        ebitda: null,
        ebitdaPercent: null,
        ebitdaTarget: null,
        cogsPercent: null,
        cogsTarget: null,
        cash: null,
        history: [],
      },
    });
    const signals = collectSignals(empty);
    expect(signals.some((item) => item.category === "DATA_GAP" && /EBITDA não cadastrado|Financeiro não informado/.test(item.situation))).toBe(
      true,
    );
    expect(signals.some((item) => /EBITDA negativo/.test(item.situation))).toBe(false);
    const consolidation = consolidateFinance([empty]);
    expect(consolidation.revenue).toBeNull();
    expect(consolidation.ebitda).toBeNull();
    expect(consolidation.complete).toBe(false);
  });
});

describe("consolidação, prioridade e data health", () => {
  it("consolida financeiro com cobertura parcial explícita", () => {
    const other = company({
      id: "emp-2",
      name: "Oficina Centro",
      segment: "oficina",
      finance: {
        periodLabel: null,
        revenue: null,
        ebitda: null,
        ebitdaPercent: null,
        ebitdaTarget: null,
        cogsPercent: null,
        cogsTarget: null,
        cash: null,
        history: [],
      },
    });
    const result = consolidateFinance([company(), other]);
    expect(result.revenue).toBe(100000);
    expect(result.revenueUsed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.complete).toBe(false);
    expect(result.label).toMatch(/1 de 2/);
  });

  it("ranqueia CMV acima da meta e explica a prioridade", () => {
    const ranked = rankGlobalPriorities([company()]);
    const cmv = ranked.find((item) => item.situation === "CMV acima da meta");
    expect(cmv).toBeTruthy();
    expect(cmv?.level).toBe("ALTA");
    expect(cmv?.reason).toMatch(/30%|28%|\+2/);
    const explanation = explainPriority(cmv!);
    expect(explanation.reasons).toContain("cmv_acima_meta");
    expect(explanation.sourceRefs.length).toBeGreaterThan(0);
    expect(explanation.limitations.join(" ")).toMatch(/estrutural|histórico/i);
  });

  it("classifica data health sem score arbitrário de empresa", () => {
    expect(assessDataHealth(company()).level).toBe("PARCIAL");
    const complete = company({
      opportunities: [{ id: "o1", title: "X", score: 91, status: "ACTIVE", expectedImpact: 5, urgency: 4, evidenceLevel: "HYPOTHESIS", hasPlan: true }],
      plans: [{ id: "p1", title: "Plano", overdueTaskCount: 0, pendingTaskCount: 1, doneTaskCount: 2, updatedAt: "2026-09-18" }],
      experiments: [{ id: "e1", title: "Teste", status: "RUNNING", hasResult: false, evidenceCount: 0, validatedEvidence: false }],
    });
    expect(assessDataHealth(complete).level).toBe("COMPLETO");
    const poor = company({
      diagnosis: null,
      opportunities: [],
      plans: [],
      experiments: [],
      finance: { periodLabel: null, revenue: null, ebitda: null, ebitdaPercent: null, ebitdaTarget: null, cogsPercent: null, cogsTarget: null, cash: null, history: [] },
    });
    expect(assessDataHealth(poor).level).toBe("INSUFICIENTE");
  });
});

describe("alertas, execução e evidência", () => {
  it("deduplica alertas e agrupa tarefas vencidas", () => {
    const plans = [
      { id: "p1", title: "Plano CMV", overdueTaskCount: 5, pendingTaskCount: 5, doneTaskCount: 1, updatedAt: "2026-09-18" },
    ];
    expect(groupOverdueTasks(plans)).toEqual([{ planId: "p1", title: "Plano CMV", overdue: 5 }]);
    const item = company({ plans });
    const signals = collectSignals(item);
    const execution = signals.filter((row) => row.category === "EXECUTION");
    expect(execution).toHaveLength(1);
    expect(execution[0]?.situation).toMatch(/5 tarefa/);
    const alerts = buildAlerts(rankGlobalPriorities([item], 10));
    expect(alerts.filter((row) => row.kind === "EXECUTION")).toHaveLength(1);
  });

  it("sinaliza oportunidade alta parada e experimento sem resultado", () => {
    const item = company({
      opportunities: [
        { id: "o1", title: "Delivery próprio", score: 91, status: "ACTIVE", expectedImpact: 5, urgency: 4, evidenceLevel: "HYPOTHESIS", hasPlan: false },
      ],
      experiments: [
        { id: "e1", title: "Teste cardápio", status: "COMPLETED", hasResult: false, evidenceCount: 0, validatedEvidence: false },
      ],
    });
    const signals = collectSignals(item);
    expect(signals.some((row) => row.situation.includes("score 91 sem plano"))).toBe(true);
    expect(signals.some((row) => row.situation.includes("aguardando conclusão"))).toBe(true);
    expect(signals.some((row) => row.situation.includes("funcionou"))).toBe(false);
  });

  it("evidência validada não vira afirmação falsa de sucesso de outro experimento", () => {
    const item = company({
      experiments: [
        { id: "e1", title: "Preço", status: "COMPLETED", hasResult: true, evidenceCount: 1, validatedEvidence: true },
        { id: "e2", title: "Novo canal", status: "RUNNING", hasResult: false, evidenceCount: 0, validatedEvidence: false },
      ],
    });
    const signals = collectSignals(item);
    const validated = signals.find((row) => row.category === "EVIDENCE");
    expect(validated?.situation).toMatch(/Evidência validada/);
    const running = signals.find((row) => row.href.includes("e2"));
    expect(running?.reason).toMatch(/Não afirmar que funcionou/);
  });
});

describe("decisão humana, IA e comparação", () => {
  it("bloqueia decisão de outro owner e exige aprovação humana", () => {
    expect(canAccessCompany("humano", "humano")).toBe(true);
    expect(canAccessCompany("ia", "humano")).toBe(false);
  });

  it("reduz contexto de IA e isola o portfólio", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      company({ id: `emp-${index}`, name: `Empresa ${index}`, finance: { ...company().finance, revenue: 10_000 } }),
    );
    const context = buildPortfolioAIContext({
      ownerId: "owner-a",
      companies: many,
      priorities: rankGlobalPriorities(many),
      consolidation: consolidateFinance(many),
    });
    expect(context.companyIds).toHaveLength(6);
    expect(context.reduced).toBe(true);
    expect(context.chars).toBeLessThanOrEqual(2800);
    expect(context.payload).not.toMatch(/sk-|tvly-|OPENAI_API_KEY/);
  });

  it("recusa comparação cruzada de segmento e aceita mesmo indicador no mesmo recorte", () => {
    const invalid = canCompareCompanies({ segment: "restaurante" }, { segment: "oficina" }, "CMV");
    expect(invalid.valid).toBe(false);
    expect(invalid.reason).toMatch(/não comparar/i);
    const valid = canCompareCompanies({ segment: "ALIMENTAÇÃO" }, { segment: "restaurante" }, "CMV");
    expect(valid.valid).toBe(true);
  });
});

describe("empty states, resumos e tendência", () => {
  it("carteira vazia e prioridades vazias não inventam conteúdo", () => {
    expect(rankGlobalPriorities([])).toEqual([]);
    expect(composePortfolioSummary([])).toMatch(/Nenhuma prioridade crítica/);
    expect(consolidateFinance([]).revenue).toBeNull();
  });

  it("resumemos globais de execução, experimentos, oportunidades e memória", () => {
    const item = company({
      plans: [{ id: "p1", title: "Plano", overdueTaskCount: 2, pendingTaskCount: 3, doneTaskCount: 4, updatedAt: "2026-09-18" }],
      experiments: [
        { id: "e1", title: "A", status: "RUNNING", hasResult: false, evidenceCount: 0, validatedEvidence: false },
        { id: "e2", title: "B", status: "COMPLETED", hasResult: true, evidenceCount: 1, validatedEvidence: true },
      ],
      opportunities: [{ id: "o1", title: "Top", score: 88, status: "ACTIVE", expectedImpact: 4, urgency: 3, evidenceLevel: "HYPOTHESIS", hasPlan: true }],
      memories: [{ id: "m1", title: "Aprendizado da loja", validated: true }],
    });
    expect(executionSummary([item])).toEqual({ activePlans: 1, pendingTasks: 3, overdueTasks: 2, doneTasks: 4 });
    expect(experimentSummary([item]).active).toBe(1);
    expect(experimentSummary([item]).withEvidence).toBe(1);
    expect(opportunitySummary([item])[0]?.title).toBe("Top");
    const memories = separateMemories([{ title: "Aprendizado da loja", companyId: "emp-1" }], [{ title: "Lição transversal" }]);
    expect(memories.company).toHaveLength(1);
    expect(memories.transversal).toHaveLength(1);
  });

  it("tendência exige histórico e mudanças recentes usam trilha existente", () => {
    expect(trendFromHistory([30])).toMatchObject({ insufficient: true });
    expect(trendFromHistory([30, 32])).toMatchObject({ direction: "up" });
    expect(trendFromHistory([32, 30])).toMatchObject({ direction: "down" });
    expect(trendFromHistory([30, 30.2])).toMatchObject({ direction: "stable" });
    const changes = mapRecentChanges([
      { id: "1", action: "opportunity.created", createdAt: "2026-09-18", companyName: "J BURGUERS" },
      { id: "2", action: "financial.updated", createdAt: "2026-09-17", companyName: "J BURGUERS" },
    ]);
    expect(changes[0]?.title).toMatch(/oportunidade/i);
    expect(composePortfolioSummary(rankGlobalPriorities([company()]))).toMatch(/PRIORIDADE 1/);
    expect(composePortfolioSummary(rankGlobalPriorities([company()]))).not.toMatch(/R\$ 0/);
    expect(["cockpit.viewed", "priority.opened", "decision.reviewed", "decision.approved", "decision.rejected", "decision.deferred", "ai.portfolio_question", "ai.portfolio_answer"]).toHaveLength(8);
  });
});
