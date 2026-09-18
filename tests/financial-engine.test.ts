import { describe, expect, it } from "vitest";
import {
  calculateAllScenarios,
  calculateBreakEven,
  calculateContributionMargin,
  calculateDRE,
  calculateFinancialRatios,
  calculatePayback,
  calculateRequiredRevenue,
  calculateROI,
  calculateScenario,
  compareTargetVsActual,
  emptyDreInput,
  SCENARIO_MULTIPLIERS,
  summarizeCashFlow,
} from "@/lib/financial-engine";
import { dreInputSchema, requiredRevenueSchema } from "@/lib/validations";
import { canAccessCompany } from "@/lib/access-policy";
import { buildFinancialInsights } from "@/lib/financial-insights";

const baseInput = {
  ...emptyDreInput(),
  grossRevenue: 100_000,
  deductions: 10_000,
  cogs: 27_000,
  payroll: 20_000,
  rent: 8_000,
  water: 500,
  energy: 1_500,
  internet: 300,
  marketing: 4_000,
  delivery: 3_000,
  accounting: 800,
  maintenance: 700,
  otherOpex: 1_200,
  salesCount: 500,
};

describe("DRE e indicadores", () => {
  const dre = calculateDRE(baseInput);
  const ratios = calculateFinancialRatios(dre);

  it("calcula receita líquida, margem bruta e EBITDA", () => {
    expect(dre.netRevenue).toBe(90_000);
    expect(dre.grossMargin).toBe(63_000);
    expect(dre.ebitda).toBe(23_000);
  });

  it("calcula CMV %, margem bruta %, folha % e EBITDA %", () => {
    expect(ratios.cogsPercent).toBe(30);
    expect(ratios.grossMarginPercent).toBe(70);
    expect(ratios.payrollPercent).toBeCloseTo(22.22, 1);
    expect(ratios.ebitdaPercent).toBeCloseTo(25.56, 1);
    expect(ratios.averageTicket).toBe(180);
  });

  it("não inventa ticket médio sem número de vendas", () => {
    const withoutSales = calculateFinancialRatios(calculateDRE({ ...baseInput, salesCount: null }));
    expect(withoutSales.averageTicket).toBeNull();
  });

  it("trata campo vazio como sem dado, não como zero inventado", () => {
    const empty = calculateDRE(emptyDreInput());
    expect(empty.grossRevenue).toBeNull();
    expect(empty.informed.grossRevenue).toBe(false);
    expect(empty.missing).toContain("receita bruta");
  });
});

describe("margem de contribuição, break-even e faturamento necessário", () => {
  it("calcula margem de contribuição", () => {
    const result = calculateContributionMargin({
      cogsPercent: 30,
      taxPercent: 10,
      deliveryPercent: 5,
      otherVariablePercent: 5,
    });
    expect(result.percent).toBe(50);
    expect(result.rate).toBe(0.5);
  });

  it("calcula ponto de equilíbrio", () => {
    const result = calculateBreakEven(calculateDRE(baseInput));
    expect(result.value).not.toBeNull();
    expect(result.value).toBeGreaterThan(0);
  });

  it("calcula faturamento necessário", () => {
    const result = calculateRequiredRevenue({
      desiredProfit: 20_000,
      cogsPercent: 30,
      taxPercent: 10,
      deliveryPercent: 5,
      otherVariablePercent: 5,
      fixedCosts: 30_000,
    });
    expect(result.value).toBe(100_000);
  });

  it("bloqueia divisão por zero na margem", () => {
    const result = calculateContributionMargin({
      cogsPercent: 50,
      taxPercent: 30,
      deliveryPercent: 10,
      otherVariablePercent: 10,
    });
    expect(result.rate).toBeNull();
    expect(calculateRequiredRevenue({
      desiredProfit: 10_000,
      cogsPercent: 50,
      taxPercent: 30,
      deliveryPercent: 10,
      otherVariablePercent: 10,
      fixedCosts: 10_000,
    }).value).toBeNull();
  });

  it("break-even fica nulo sem receita", () => {
    const result = calculateBreakEven(calculateDRE(emptyDreInput()));
    expect(result.value).toBeNull();
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

describe("cenários 70/100/130", () => {
  it("usa constantes centralizadas", () => {
    expect(SCENARIO_MULTIPLIERS.CONSERVATIVE).toBe(0.7);
    expect(SCENARIO_MULTIPLIERS.BASE).toBe(1);
    expect(SCENARIO_MULTIPLIERS.AGGRESSIVE).toBe(1.3);
  });

  it("escala receita e CMV no conservador e mantém custo fixo", () => {
    const conservative = calculateScenario(baseInput, "CONSERVATIVE");
    expect(conservative.dre.grossRevenue).toBe(70_000);
    expect(conservative.dre.cogs).toBe(18_900);
    expect(conservative.dre.fixedCosts).toBe(calculateDRE(baseInput).fixedCosts);
  });

  it("cenário base preserva a receita", () => {
    expect(calculateScenario(baseInput, "BASE").dre.grossRevenue).toBe(100_000);
  });

  it("cenário agressivo sobe a receita em 30%", () => {
    const aggressive = calculateScenario(baseInput, "AGGRESSIVE");
    expect(aggressive.dre.grossRevenue).toBe(130_000);
    expect(calculateAllScenarios(baseInput)).toHaveLength(3);
  });
});

describe("ROI, payback e meta vs realizado", () => {
  it("calcula ROI e payback", () => {
    expect(calculatePayback(12_000, 3_000)).toBe(4);
    expect(calculateROI(12_000, 3_000)).toBe(200);
  });

  it("ROI fica nulo se investimento <= 0", () => {
    expect(calculateROI(0, 1000)).toBeNull();
    expect(calculateROI(-10, 1000)).toBeNull();
  });

  it("compara meta vs realizado com status textual", () => {
    const above = compareTargetVsActual(38, 32, "lower_is_better");
    expect(above.status).toBe("Acima da meta");
    expect(above.difference).toBe(6);
    const hit = compareTargetVsActual(120_000, 100_000, "higher_is_better");
    expect(hit.status).toBe("Atingiu a meta");
  });
});

describe("fluxo de caixa e validações", () => {
  it("soma entradas, saídas e acumulado", () => {
    const months = summarizeCashFlow([
      { direction: "INFLOW", amount: 10_000, occurredAt: new Date(2026, 0, 5) },
      { direction: "OUTFLOW", amount: 4_000, occurredAt: new Date(2026, 0, 10) },
      { direction: "INFLOW", amount: 8_000, occurredAt: new Date(2026, 1, 2) },
    ]);
    expect(months[0]).toMatchObject({ inflows: 10_000, outflows: 4_000, operatingBalance: 6_000, accumulatedBalance: 6_000 });
    expect(months[1]?.accumulatedBalance).toBe(14_000);
  });

  it("rejeita valor negativo, percentual inválido e NaN", () => {
    expect(dreInputSchema.safeParse({
      companyId: "clxxxxxxxxxxxxxxxxxxxx",
      periodMonth: 9,
      periodYear: 2026,
      grossRevenue: -1,
    }).success).toBe(false);
    expect(requiredRevenueSchema.safeParse({
      desiredProfit: 1000,
      cogsPercent: 120,
      taxPercent: 10,
      deliveryPercent: 0,
      otherVariablePercent: 0,
      fixedCosts: 1000,
    }).success).toBe(false);
    expect(dreInputSchema.safeParse({
      companyId: "clxxxxxxxxxxxxxxxxxxxx",
      periodMonth: 13,
      periodYear: 2026,
    }).success).toBe(false);
    expect(requiredRevenueSchema.safeParse({
      desiredProfit: Number.NaN,
      cogsPercent: 10,
      taxPercent: 10,
      deliveryPercent: 0,
      otherVariablePercent: 0,
      fixedCosts: 1000,
    }).success).toBe(false);
  });

  it("mantém isolamento conceitual e insights sem afirmar causa", () => {
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    const dre = calculateDRE(baseInput);
    const ratios = calculateFinancialRatios(dre);
    const insights = buildFinancialInsights({
      dre,
      ratios,
      comparisons: {
        cogsPercent: compareTargetVsActual(38, 32, "lower_is_better"),
      },
    });
    expect(insights.some((item) => item.kind === "DADO")).toBe(true);
    expect(insights.some((item) => item.body.toLowerCase().includes("desperdício"))).toBe(false);
  });
});
