import { describe, expect, it } from "vitest";
import { buildFinancialSummary } from "@/lib/ai-executive-engine";
import { calculateDRE, emptyDreInput } from "@/lib/financial-engine";
import { isOperationalDecision } from "@/lib/decision-reason";
import { FINANCIAL_GOAL_COPY, isDistinctFinancialGoal } from "@/lib/financial-ui";

describe("Sprint 20 — certificação operacional", () => {
  it("não mistura meta de faturamento com meta de EBITDA", () => {
    expect(FINANCIAL_GOAL_COPY.revenueTarget).toBe("Meta de faturamento");
    expect(FINANCIAL_GOAL_COPY.ebitdaTarget).toBe("Meta de EBITDA");
    expect(isDistinctFinancialGoal(650_000, 204_750)).toBe(true);
    expect(isDistinctFinancialGoal(650_000, 650_000)).toBe(false);
    expect(isDistinctFinancialGoal(650_000, null)).toBe(true);
  });

  it("reproduz a DRE persistida da J BURGUERS sem usar faturamento no lugar de receita líquida", () => {
    const dre = calculateDRE({
      ...emptyDreInput(),
      grossRevenue: 600_000,
      deductions: 60_000,
      cogs: 162_000,
      payroll: 108_000,
      otherOpex: 99_510,
    });
    expect(dre.netRevenue).toBe(540_000);
    expect(dre.grossMargin).toBe(378_000);
    expect(dre.ebitda).toBe(170_490);
    expect(dre.grossMargin).not.toBe(dre.grossRevenue);
  });

  it("Cockpit não trata decisão órfã de teste como pendência operacional", () => {
    expect(isOperationalDecision({ companyId: null, hasAllocationProposal: false })).toBe(false);
    expect(isOperationalDecision({ companyId: "emp-1", hasAllocationProposal: false })).toBe(true);
    expect(isOperationalDecision({ companyId: null, hasAllocationProposal: true })).toBe(true);
  });

  it("IA compara EBITDA só com meta de EBITDA", () => {
    const rows = buildFinancialSummary({
      periodLabel: "Set/2026",
      grossRevenue: 600_000,
      netRevenue: 540_000,
      cogsPercent: 30,
      grossMarginPercent: 70,
      payrollPercent: 20,
      ebitda: 170_490,
      ebitdaPercent: 31.6,
      breakEven: null,
      revenueTarget: 650_000,
      revenueGap: -50_000,
      ebitdaTarget: 204_750,
      ebitdaGap: -34_260,
      cogsTarget: null,
      cashBalance: null,
      scenarios: [],
      informed: true,
    });
    const ebitdaMeta = rows.find((item) => item.text.includes("Meta de EBITDA"));
    const revenueMeta = rows.find((item) => item.text.includes("Meta de faturamento"));
    const inference = rows.find((item) => item.kind === "INFERENCIA" && item.text.includes("EBITDA"));
    expect(revenueMeta?.text).toMatch(/R\$\s*650/);
    expect(ebitdaMeta?.text).toMatch(/R\$\s*204/);
    expect(ebitdaMeta?.text).not.toMatch(/R\$\s*650/);
    expect(inference?.text).toMatch(/meta de EBITDA/);
    expect(inference?.text).toMatch(/não entra nesta comparação/);
  });
});
