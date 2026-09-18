import { describe, expect, it } from "vitest";
import {
  buildEvidenceSummary,
  calculateAbsoluteVariation,
  calculateExperimentPayback,
  calculateExperimentROI,
  calculatePercentageVariation,
  evaluateExperimentResult,
  hasSufficientEvidence,
  nextOpportunityEvidenceLevel,
} from "@/lib/experiment-engine";
import { experimentInputSchema, experimentMeasurementSchema, experimentResultSchema } from "@/lib/validations";
import { canAccessCompany } from "@/lib/access-policy";

const base = {
  baseline: 8,
  target: 20,
  finalValue: 21,
  direction: "HIGHER_IS_BETTER" as const,
  measurementCount: 2,
  status: "COMPLETED",
};

describe("variação e ROI", () => {
  it("calcula variação absoluta e percentual", () => {
    expect(calculateAbsoluteVariation(8, 20)).toBe(12);
    expect(calculatePercentageVariation(8, 20)).toBe(150);
  });

  it("bloqueia divisão por zero no percentual e no ROI", () => {
    expect(calculatePercentageVariation(0, 10)).toBeNull();
    expect(calculateExperimentROI(100, 0)).toBeNull();
    expect(calculateExperimentPayback(100, 0)).toBeNull();
  });

  it("calcula ROI e payback realizados", () => {
    expect(calculateExperimentROI(1500, 1000)).toBe(50);
    expect(calculateExperimentPayback(1000, 500)).toBe(2);
  });
});

describe("classificação determinística", () => {
  it("valida HIGHER_IS_BETTER quando a meta é atingida", () => {
    const result = evaluateExperimentResult(base);
    expect(result.classification).toBe("VALIDATED");
    expect(hasSufficientEvidence(base)).toBe(true);
  });

  it("parcial quando melhora mas não atinge a meta", () => {
    const result = evaluateExperimentResult({ ...base, finalValue: 12 });
    expect(result.classification).toBe("PARTIALLY_VALIDATED");
  });

  it("refuta quando não há melhoria", () => {
    const result = evaluateExperimentResult({ ...base, finalValue: 7 });
    expect(result.classification).toBe("REFUTED");
  });

  it("inconclusivo sem baseline", () => {
    const result = evaluateExperimentResult({ ...base, baseline: null });
    expect(result.classification).toBe("INCONCLUSIVE");
    expect(result.reason).toContain("baseline não informado");
  });

  it("inconclusivo sem medição ou sem resultado", () => {
    expect(evaluateExperimentResult({ ...base, measurementCount: 0 }).classification).toBe("INCONCLUSIVE");
    expect(evaluateExperimentResult({ ...base, finalValue: null }).classification).toBe("INCONCLUSIVE");
    expect(evaluateExperimentResult({ ...base, status: "RUNNING" }).classification).toBe("INCONCLUSIVE");
  });

  it("valida LOWER_IS_BETTER no CMV", () => {
    const result = evaluateExperimentResult({
      baseline: 38,
      target: 33,
      finalValue: 32,
      direction: "LOWER_IS_BETTER",
      measurementCount: 3,
      status: "COMPLETED",
    });
    expect(result.classification).toBe("VALIDATED");
    expect(result.absoluteVariation).toBe(-6);
  });

  it("parcial no CMV quando cai mas não chega na meta", () => {
    const result = evaluateExperimentResult({
      baseline: 38,
      target: 33,
      finalValue: 34,
      direction: "LOWER_IS_BETTER",
      measurementCount: 2,
      status: "COMPLETED",
    });
    expect(result.classification).toBe("PARTIALLY_VALIDATED");
  });
});

describe("evidência e Zod", () => {
  it("monta evidência rastreável", () => {
    const body = buildEvidenceSummary({
      title: "Programa de indicação",
      hypothesis: "Indicação aumenta clientes.",
      kpi: "Número de indicações",
      baseline: 0,
      target: 10,
      finalValue: 14,
      classification: "VALIDATED",
      reason: "Meta atingida",
      plannedInvestment: 1000,
      realizedInvestment: 900,
      realizedReturn: 2000,
      source: "Experimento x",
    });
    expect(body).toContain("Hipótese:");
    expect(body).toContain("Fonte: Experimento x");
  });

  it("evolui EvidenceLevel só com classificação medida", () => {
    expect(nextOpportunityEvidenceLevel(["VALIDATED"])).toBe("VALIDATED_EVIDENCE");
    expect(nextOpportunityEvidenceLevel(["PARTIALLY_VALIDATED"])).toBe("PARTIAL_EVIDENCE");
    expect(nextOpportunityEvidenceLevel(["INCONCLUSIVE"])).toBe("TESTING");
    expect(nextOpportunityEvidenceLevel([])).toBe("HYPOTHESIS");
  });

  it("rejeita NaN, Infinity, datas inválidas e investimento negativo", () => {
    const companyId = "clxxxxxxxxxxxxxxxxxxxx";
    expect(experimentInputSchema.safeParse({
      companyId,
      title: "Teste",
      hypothesis: "Hipótese longa o bastante.",
      kpi: "CMV %",
      direction: "LOWER_IS_BETTER",
      startedAt: "2026-01-10",
      plannedEndAt: "2026-01-01",
    }).success).toBe(false);
    expect(experimentMeasurementSchema.safeParse({
      companyId,
      experimentId: companyId,
      measuredValue: Number.NaN,
    }).success).toBe(false);
    expect(experimentResultSchema.safeParse({
      companyId,
      experimentId: companyId,
      finalValue: Number.POSITIVE_INFINITY,
    }).success).toBe(false);
    expect(experimentInputSchema.safeParse({
      companyId,
      title: "Teste",
      hypothesis: "Hipótese longa o bastante.",
      kpi: "CMV %",
      direction: "LOWER_IS_BETTER",
      investment: -10,
    }).success).toBe(false);
    expect(canAccessCompany("a", "b")).toBe(false);
  });
});
