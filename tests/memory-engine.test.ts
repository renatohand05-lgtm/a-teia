import { describe, expect, it } from "vitest";
import {
  buildMemoryExplanation,
  buildMemoryFromEvidence,
  calculateMemoryConfidence,
  calculateTransferability,
  canCreateValidatedMemory,
  compareMemoryContexts,
  countEvidenceRepetition,
  detectConflictingMemories,
  formatTransferabilityLabel,
  inferFamilyFromKpi,
  polarityFromClassification,
  previewMemoryScoreImpact,
  prioritizeRelatedMemories,
  type EvidenceMemorySource,
  type MemoryLike,
} from "@/lib/memory-engine";
import { memoryObservationSchema, memoryProposeSchema } from "@/lib/validations";
import { canAccessCompany } from "@/lib/access-policy";

const source: EvidenceMemorySource = {
  evidenceId: "ev1",
  evidenceTitle: "Evidência · indicação",
  evidenceBody: "Resumo",
  classification: "VALIDATED",
  experimentId: "ex1",
  experimentTitle: "Programa de indicação",
  hypothesis: "Indicação aumenta clientes novos.",
  opportunityId: "op1",
  strategyId: null,
  kpi: "Número de indicações",
  family: "referral",
  baseline: 8,
  target: 15,
  measuredResult: 19,
  experimentCompleted: true,
  companyId: "c1",
  companyName: "Academia Centro",
  segment: "Academia",
  teamSize: 12,
  units: 1,
  investment: 2000,
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  conditions: "Clientes ativos no período",
  testDescription: "Recompensa simples",
};

describe("origem e validação", () => {
  it("não cria memória validada sem evidência", () => {
    expect(
      canCreateValidatedMemory({
        hasTraceableEvidence: false,
        experimentCompleted: true,
        hasMeasuredResult: true,
        classification: "VALIDATED",
      }),
    ).toBe(false);
  });

  it("permite memória validável a partir de evidência de experimento concluído", () => {
    expect(
      canCreateValidatedMemory({
        origin: "EXPERIMENT_EVIDENCE",
        hasTraceableEvidence: true,
        experimentCompleted: true,
        hasMeasuredResult: true,
        classification: "VALIDATED",
      }),
    ).toBe(true);
  });

  it("monta memória positiva e negativa a partir da evidência", () => {
    const positive = buildMemoryFromEvidence(source);
    expect(positive.polarity).toBe("POSITIVE");
    expect(positive.lesson).toContain("8");
    expect(positive.lesson).toContain("19");
    const negative = buildMemoryFromEvidence({
      ...source,
      classification: "REFUTED",
      measuredResult: 8,
    });
    expect(negative.polarity).toBe("NEGATIVE");
    expect(negative.lesson.toLowerCase()).toContain("não funcionou");
    const inconclusive = buildMemoryFromEvidence({
      ...source,
      classification: "INCONCLUSIVE",
      baseline: null,
      measuredResult: null,
      experimentCompleted: true,
    });
    expect(inconclusive.polarity).toBe("INCONCLUSIVE");
    expect(inconclusive.confidence.level).toBe("LOW");
    expect(inconclusive.canCreateValidated).toBe(true);
  });
});

describe("confiança explicável", () => {
  it("mantém observação em LOW", () => {
    const result = calculateMemoryConfidence({
      origin: "OBSERVATION",
      experimentCompleted: false,
      hasBaseline: false,
      hasTarget: false,
      hasMeasuredResult: false,
      hasTraceableEvidence: false,
      classification: null,
      humanApproved: true,
      repeatedValidationCount: 0,
    });
    expect(result.level).toBe("LOW");
  });

  it("classifica uma única validação como MEDIUM, nunca HIGH", () => {
    const result = calculateMemoryConfidence({
      origin: "EXPERIMENT_EVIDENCE",
      experimentCompleted: true,
      hasBaseline: true,
      hasTarget: true,
      hasMeasuredResult: true,
      hasTraceableEvidence: true,
      classification: "VALIDATED",
      humanApproved: true,
      repeatedValidationCount: 0,
    });
    expect(result.level).toBe("MEDIUM");
    expect(result.reasons.some((item) => item.includes("única validação"))).toBe(true);
  });

  it("exige repetição para HIGH", () => {
    const result = calculateMemoryConfidence({
      origin: "EXPERIMENT_EVIDENCE",
      experimentCompleted: true,
      hasBaseline: true,
      hasTarget: true,
      hasMeasuredResult: true,
      hasTraceableEvidence: true,
      classification: "VALIDATED",
      humanApproved: true,
      repeatedValidationCount: 2,
    });
    expect(result.level).toBe("HIGH");
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});

describe("transferibilidade e contexto", () => {
  it("separa memória exata de memória transversal", () => {
    const exact = compareMemoryContexts(
      { companyId: "c1", segment: "Academia", family: "referral", kpi: "Número de indicações", opportunityId: "op1", teamSize: 12, units: 1 },
      { companyId: "c1", segment: "Academia", family: "referral", kpi: "Número de indicações", opportunityId: "op1", teamSize: 12, units: 1 },
    );
    expect(exact.kind).toBe("EXACT");
    const transversal = compareMemoryContexts(
      { companyId: "c1", segment: "Academia", family: "recurrence", kpi: "Assinaturas", opportunityId: "opA", teamSize: 12, units: 1 },
      { companyId: "c2", segment: "Oficina", family: "recurrence", kpi: "Planos de manutenção", opportunityId: "opB", teamSize: 8, units: 1 },
    );
    expect(transversal.kind).toBe("TRANSVERSAL");
  });

  it("calcula compatibilidade estratégica e nunca chance de sucesso", () => {
    const result = calculateTransferability({
      source: { companyId: "c1", segment: "Academia", family: "recurrence", kpi: "Assinaturas", opportunityId: null, teamSize: 10, units: 1 },
      target: { companyId: "c2", segment: "Oficina", family: "recurrence", kpi: "Assinaturas", opportunityId: null, teamSize: 9, units: 1 },
      evidenceQuality: "VALIDATED",
    });
    expect(result.label).toBe(formatTransferabilityLabel(result.score));
    expect(result.label).toContain("Compatibilidade estratégica");
    expect(result.label.toLowerCase()).not.toContain("chance");
    expect(result.warning).toContain("não é probabilidade de sucesso");
    expect(result.band).toMatch(/LOW|MEDIUM|HIGH/);
  });

  it("prioriza memória exata sobre transversal", () => {
    const items: MemoryLike[] = [
      { companyId: "c2", family: "referral", kpi: "Número de indicações", polarity: "POSITIVE", classification: "VALIDATED", segment: "Oficina" },
      { companyId: "c1", family: "referral", kpi: "Número de indicações", polarity: "POSITIVE", classification: "VALIDATED", opportunityId: "op1", segment: "Academia" },
    ];
    const ranked = prioritizeRelatedMemories(items, {
      companyId: "c1",
      segment: "Academia",
      family: "referral",
      kpi: "Número de indicações",
      opportunityId: "op1",
      teamSize: 12,
      units: 1,
    });
    expect(ranked[0]?.matchKind).toBe("EXACT");
    expect(ranked[1]?.matchKind).toBe("TRANSVERSAL");
  });
});

describe("contradição, repetição e preview de score", () => {
  it("detecta memórias conflitantes sem sobrescrever", () => {
    const conflicts = detectConflictingMemories([
      { companyId: "c1", family: "referral", kpi: "Número de indicações", polarity: "POSITIVE", classification: "VALIDATED", status: "APPROVED" },
      { companyId: "c1", family: "referral", kpi: "Número de indicações", polarity: "NEGATIVE", classification: "REFUTED", status: "APPROVED" },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.reason).toContain("Evidências divergentes");
  });

  it("conta repetições sem média cega", () => {
    const summary = countEvidenceRepetition([
      { classification: "VALIDATED" },
      { classification: "VALIDATED" },
      { classification: "PARTIALLY_VALIDATED" },
      { classification: "INCONCLUSIVE" },
      { classification: "REFUTED" },
    ]);
    expect(summary.label).toBe("5 validações");
    expect(summary.positive).toBe(2);
    expect(summary.partial).toBe(1);
    expect(summary.inconclusive).toBe(1);
    expect(summary.refuted).toBe(1);
  });

  it("preserva score original sem evidência e não altera ranking", () => {
    const empty = previewMemoryScoreImpact(72, []);
    expect(empty.scoreBase).toBe(72);
    expect(empty.memoryAdjustment).toBe(0);
    expect(empty.rankingChanged).toBe(false);
    const preview = previewMemoryScoreImpact(72, [
      {
        companyId: "c1",
        family: "referral",
        kpi: "Número de indicações",
        polarity: "POSITIVE",
        classification: "VALIDATED",
        status: "APPROVED",
        origin: "EXPERIMENT_EVIDENCE",
        validated: true,
        confidence: "MEDIUM",
      },
    ]);
    expect(preview.rankingChanged).toBe(false);
    expect(Math.abs(preview.memoryAdjustment)).toBeLessThanOrEqual(15);
    expect(preview.explanation).toContain("não aplicado");
  });
});

describe("explicação e família", () => {
  it("explica só com valores persistidos", () => {
    const text = buildMemoryExplanation({
      companyName: "Academia Centro",
      family: "recurrence",
      kpi: "recorrência",
      baseline: 8,
      measuredResult: 19,
      polarity: "POSITIVE",
      origin: "EXPERIMENT_EVIDENCE",
      validated: true,
    });
    expect(text).toContain("Academia Centro");
    expect(text).toContain("8");
    expect(text).toContain("19");
  });

  it("infere família a partir do KPI sem duplicar taxonomia", () => {
    expect(inferFamilyFromKpi("Número de indicações")).toBe("referral");
    expect(inferFamilyFromKpi("Clientes recorrentes")).toBe("recurrence");
    expect(polarityFromClassification("REFUTED")).toBe("NEGATIVE");
  });
});

describe("zod e owner policy", () => {
  it("rejeita NaN, Infinity e IDs inválidos", () => {
    expect(memoryProposeSchema.safeParse({ companyId: "x", evidenceId: "y", title: "abc", lesson: "lição" }).success).toBe(false);
    expect(
      memoryObservationSchema.safeParse({
        companyId: "cmh000000000000000000000",
        origin: "OBSERVATION",
        title: "Obs válida",
        lesson: "Texto suficientemente longo",
        baseline: Number.NaN,
      }).success,
    ).toBe(false);
    expect(
      memoryObservationSchema.safeParse({
        companyId: "cmh000000000000000000000",
        origin: "OBSERVATION",
        title: "Obs válida",
        lesson: "Texto suficientemente longo",
        target: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
  });

  it("isola empresas por owner", () => {
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    expect(canAccessCompany("owner-a", "owner-a")).toBe(true);
  });
});
