import { describe, expect, it } from "vitest";
import { canAccessCompany } from "@/lib/access-policy";
import {
  addCents,
  centsToDecimalString,
  estimatedRoiBps,
  missingMoneyIsNotZero,
  paybackMonthsHundredths,
  toCents,
} from "@/lib/money";
import {
  aiMayApproveAllocation,
  aiMayMoveMoney,
  allocateResources,
  assessCandidate,
  assessReadiness,
  buildAllocationAIContext,
  classifyEligibility,
  classifyEvidence,
  classifyRisk,
  compareScenarios,
  composeAllocationSummary,
  isAllocationQuestion,
  sensitivityAnalysis,
  type AllocationCandidate,
  type AllocationConstraints,
} from "@/lib/resource-allocation-engine";

function constraints(overrides: Partial<AllocationConstraints> = {}): AllocationConstraints {
  return {
    capitalAvailableCents: 10_000_000,
    hoursAvailableHundredths: 20_000,
    capacityLimit: 4,
    reserveMinimumCents: 3_000_000,
    maxPerCompanyCents: 8_000_000,
    maxPerInitiativeCents: 6_000_000,
    maxPercentPerInitiative: 80,
    horizon: "DAYS_90",
    scenario: "BALANCEADO",
    activeInitiativeCount: 0,
    ...overrides,
  };
}

function candidate(overrides: Partial<AllocationCandidate> = {}): AllocationCandidate {
  return {
    id: "OPPORTUNITY:opp-1",
    companyId: "emp-1",
    companyName: "J BURGUERS",
    companySegment: "restaurante",
    sourceKind: "OPPORTUNITY",
    sourceId: "opp-1",
    title: "Reduzir CMV",
    description: "Ajuste de ficha técnica",
    investmentCents: 2_500_000,
    hoursHundredths: 4_000,
    expectedMonthlyReturnCents: 800_000,
    paybackMonthsHundredths: 200,
    impact: 4,
    urgency: 4,
    score: 91,
    evidenceLevel: "TESTING",
    status: "ACTIVE",
    reversible: true,
    dependencyBlocked: false,
    blockedReason: null,
    hasValidatedEvidence: false,
    cashCents: 5_000_000,
    priorityScore: 70,
    ...overrides,
  };
}

describe("precisão e ausência de dado", () => {
  it("não usa float solto e trata ausência como ausência", () => {
    expect(addCents(1010, 2020)).toBe(3030);
    expect(centsToDecimalString(3030)).toBe("30.30");
    expect(toCents(null)).toBeNull();
    expect(missingMoneyIsNotZero(null)).toBe(true);
    expect(toCents(0)).toBe(0);
    expect(estimatedRoiBps(null, 1000)).toBeNull();
    expect(estimatedRoiBps(1500, 1000)).toBe(5000);
    expect(paybackMonthsHundredths(null, 1000)).toBeNull();
  });

  it("investimento, retorno e horas ausentes não viram zero", () => {
    const assessed = assessCandidate(
      candidate({ investmentCents: null, hoursHundredths: null, expectedMonthlyReturnCents: null, paybackMonthsHundredths: null }),
      constraints(),
    );
    expect(assessed.investmentCents).toBeNull();
    expect(assessed.hoursHundredths).toBeNull();
    expect(assessed.expectedMonthlyReturnCents).toBeNull();
    expect(assessed.eligibility).toBe("DADOS_INSUFICIENTES");
    expect(assessed.missingData).toEqual(expect.arrayContaining(["investimento", "horas", "retorno estimado"]));
    const result = allocateResources([assessed], constraints());
    expect(result.allocated).toHaveLength(0);
    expect(result.emptyReason ?? result.unallocated[0]?.skipReason).toMatch(/dados|estimativas/i);
  });
});

describe("elegibilidade e bloqueio", () => {
  it("classifica elegível, com ressalvas e bloqueado", () => {
    expect(classifyEligibility(candidate(), constraints()).eligibility).toBe("ELEGIVEL");
    expect(classifyEligibility(candidate({ expectedMonthlyReturnCents: null, paybackMonthsHundredths: null }), constraints()).eligibility).toBe(
      "ELEGIVEL_COM_RESSALVAS",
    );
    expect(classifyEligibility(candidate({ status: "ARCHIVED", blockedReason: "Oportunidade arquivada ou rejeitada." }), constraints()).eligibility).toBe(
      "BLOQUEADO",
    );
    expect(classifyEligibility(candidate({ investmentCents: 9_000_000 }), constraints({ maxPerInitiativeCents: 6_000_000 })).eligibility).toBe(
      "BLOQUEADO",
    );
    expect(classifyEligibility(candidate({ dependencyBlocked: true, blockedReason: "Etapa não concluída." }), constraints()).eligibility).toBe(
      "BLOQUEADO",
    );
  });
});

describe("evidência, risco e sem probabilidade inventada", () => {
  it("classifica evidência e risco sem chance percentual", () => {
    expect(classifyEvidence(candidate({ hasValidatedEvidence: true }))).toBe("EVIDENCIA_VALIDADA");
    expect(classifyEvidence(candidate({ evidenceLevel: "HYPOTHESIS", hasValidatedEvidence: false }))).toBe("HIPOTESE");
    const risk = classifyRisk(candidate({ evidenceLevel: "HYPOTHESIS", investmentCents: 8_000_000 }), constraints(), "HIPOTESE");
    expect(risk.risk).toMatch(/ALTO|MODERADO/);
    expect(risk.reasons.join(" ")).not.toMatch(/% de chance|probabilidade/);
    const summary = composeAllocationSummary(allocateResources([candidate()], constraints()));
    expect(summary).not.toMatch(/73%|chance de funcionar/);
    expect(summary).toMatch(/DADO:|INFERÊNCIA:/);
  });
});

describe("ROI, payback e horizonte", () => {
  it("calcula ROI estimado só com dados e respeita horizonte", () => {
    const assessed = assessCandidate(candidate(), constraints({ horizon: "DAYS_90" }));
    expect(assessed.roiBps).not.toBeNull();
    expect(assessed.horizonReturnCents).toBe(2_400_000);
    const late = allocateResources(
      [candidate({ paybackMonthsHundredths: 1200, title: "Payback longo" })],
      constraints({ horizon: "DAYS_30", scenario: "CONSERVADOR" }),
    );
    expect(late.allocated).toHaveLength(0);
    expect(late.unallocated[0]?.skipReason).toMatch(/payback/i);
  });
});

describe("capital, tempo e capacidade", () => {
  it("aloca parcialmente e preserva sobras", () => {
    const cheap = candidate({ id: "a", sourceId: "a", investmentCents: 2_000_000, hoursHundredths: 3000, title: "A" });
    const mid = candidate({
      id: "b",
      sourceId: "b",
      companyId: "emp-2",
      companyName: "Oficina",
      investmentCents: 3_500_000,
      hoursHundredths: 4000,
      title: "B",
      score: 70,
    });
    const result = allocateResources([cheap, mid], constraints({ capitalAvailableCents: 10_000_000, reserveMinimumCents: 3_000_000 }));
    expect(result.capitalAllocatedCents).toBeLessThan(10_000_000);
    expect(result.capitalPreservedCents).toBeGreaterThan(0);
    expect(result.hoursPreservedHundredths).toBeGreaterThan(0);
  });

  it("não força 100% do capital nem das horas", () => {
    const result = allocateResources(
      [candidate({ investmentCents: 4_000_000, hoursHundredths: 2000 })],
      constraints({ capitalAvailableCents: 10_000_000, hoursAvailableHundredths: 20_000, reserveMinimumCents: null }),
    );
    expect(result.capitalAllocatedCents).toBe(4_000_000);
    expect(result.capitalPreservedCents).toBe(6_000_000);
    expect(result.hoursAllocatedHundredths).toBe(2000);
    expect(result.hoursPreservedHundredths).toBe(18_000);
  });

  it("respeita reserva, máximo por empresa e concentração", () => {
    const heavy = candidate({ investmentCents: 8_000_000, title: "Pesada" });
    const reserved = allocateResources([heavy], constraints({ reserveMinimumCents: 3_000_000, maxPerInitiativeCents: null, maxPercentPerInitiative: null }));
    expect(reserved.allocated).toHaveLength(0);
    expect(reserved.unallocated[0]?.skipReason).toMatch(/reserva/i);
    const companyCap = allocateResources(
      [candidate({ investmentCents: 5_000_000 }), candidate({ id: "c2", sourceId: "c2", investmentCents: 4_000_000, title: "Segunda" })],
      constraints({ maxPerCompanyCents: 6_000_000, reserveMinimumCents: null, maxPercentPerInitiative: null }),
    );
    expect(companyCap.unallocated.some((item) => /empresa/i.test(item.skipReason ?? ""))).toBe(true);
    const concentrated = allocateResources(
      [candidate({ investmentCents: 8_000_000 })],
      constraints({ reserveMinimumCents: null, maxPerInitiativeCents: null, maxPercentPerInitiative: null, capitalAvailableCents: 10_000_000 }),
    );
    expect(concentrated.warnings.join(" ")).toMatch(/CONCENTRAÇÃO ELEVADA/);
    expect(concentrated.allocated[0]?.concentration).toBe(true);
  });

  it("capacidade esgotada considera planos ativos", () => {
    const result = allocateResources(
      [candidate(), candidate({ id: "x", sourceId: "x", companyId: "emp-2", companyName: "X", title: "X" })],
      constraints({ capacityLimit: 6, activeInitiativeCount: 6 }),
    );
    expect(result.allocated).toHaveLength(0);
    expect(result.unallocated.every((item) => item.skipReason === "Capacidade esgotada.")).toBe(true);
  });
});

describe("cenários, comparação e sensibilidade", () => {
  it("conservador, balanceado e expansão diferem sem eleger o melhor", () => {
    const risky = candidate({
      id: "risco",
      sourceId: "risco",
      evidenceLevel: "HYPOTHESIS",
      hasValidatedEvidence: false,
      investmentCents: 4_000_000,
      score: 95,
      impact: 5,
      title: "Expansão agressiva",
    });
    const safe = candidate({
      id: "safe",
      sourceId: "safe",
      companyId: "emp-2",
      companyName: "Oficina",
      hasValidatedEvidence: true,
      evidenceLevel: "VALIDATED_EVIDENCE",
      investmentCents: 2_000_000,
      score: 60,
      title: "Ajuste validado",
    });
    const comparison = compareScenarios([risky, safe], constraints({ reserveMinimumCents: null }));
    expect(comparison.map((item) => item.scenario)).toEqual(["CONSERVADOR", "BALANCEADO", "EXPANSAO"]);
    const conservative = allocateResources([risky, safe], constraints({ scenario: "CONSERVADOR", reserveMinimumCents: null }));
    const expansion = allocateResources([risky, safe], constraints({ scenario: "EXPANSAO", reserveMinimumCents: null }));
    expect(conservative.allocated.some((item) => item.title === "Ajuste validado")).toBe(true);
    expect(expansion.allocated.length).toBeGreaterThanOrEqual(conservative.allocated.length);
    const sensitivity = sensitivityAnalysis([safe], constraints({ reserveMinimumCents: null }));
    expect(sensitivity.capitalMinus20.capitalAvailableCents).toBe(8_000_000);
    expect(sensitivity.capitalPlus20.capitalAvailableCents).toBe(12_000_000);
    expect(sensitivity.hoursMinus20.hoursAvailableHundredths).toBe(16_000);
    expect(sensitivity.horizon12.horizonMonths).toBe(12);
  });
});

describe("prontidão, trade-off e empty states", () => {
  it("mede allocation readiness e compara custo de oportunidade", () => {
    expect(assessReadiness(candidate())).toBe("PRONTO");
    expect(assessReadiness(candidate({ expectedMonthlyReturnCents: null, paybackMonthsHundredths: null }))).toBe("PARCIAL");
    expect(assessReadiness(candidate({ investmentCents: null, hoursHundredths: null, expectedMonthlyReturnCents: null, paybackMonthsHundredths: null }))).toBe("INSUFICIENTE");
    const a = candidate({ id: "oa", sourceId: "oa", investmentCents: 3_000_000, hoursHundredths: 4000, paybackMonthsHundredths: 200, title: "Opção A" });
    const b = candidate({
      id: "ob",
      sourceId: "ob",
      companyId: "emp-2",
      companyName: "Oficina",
      investmentCents: 3_000_000,
      hoursHundredths: 9000,
      paybackMonthsHundredths: 250,
      score: 40,
      title: "Opção B",
    });
    const result = allocateResources([a, b], constraints({ capitalAvailableCents: 3_000_000, reserveMinimumCents: null, hoursAvailableHundredths: 10_000, maxPercentPerInitiative: null }));
    expect(result.allocated).toHaveLength(1);
    expect(result.unallocated).toHaveLength(1);
    expect(result.opportunityCosts.length).toBeGreaterThan(0);
    expect(allocateResources([], constraints()).emptyReason).toMatch(/Não há iniciativas elegíveis/);
    expect(allocateResources([candidate()], constraints({ capitalAvailableCents: null, hoursAvailableHundredths: null })).emptyReason).toMatch(
      /Informe os recursos/,
    );
  });
});

describe("IA, isolamento e auditoria determinística", () => {
  it("IA não aprova nem move dinheiro e reduz contexto do owner", () => {
    expect(aiMayApproveAllocation()).toBe(false);
    expect(aiMayMoveMoney()).toBe(false);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    const result = allocateResources([candidate()], constraints({ reserveMinimumCents: null }));
    const context = buildAllocationAIContext({ ownerId: "owner-a", result, companyIds: ["emp-1", "emp-2"] });
    expect(context.ownerId).toBe("owner-a");
    expect(context.payload).not.toContain("owner-b");
    expect(context.chars).toBeLessThanOrEqual(2200);
    expect(isAllocationQuestion("Tenho R$ 100 mil. Onde alocar?")).toBe(true);
    expect(isAllocationQuestion("Onde devo agir primeiro?")).toBe(false);
    expect(result.allocated[0]?.explanation.limitations.join(" ")).toMatch(/não movimenta dinheiro/i);
    expect(composeAllocationSummary(result)).not.toMatch(/você ganhará/i);
  });
});
