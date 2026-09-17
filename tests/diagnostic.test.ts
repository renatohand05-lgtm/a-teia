import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_DIMENSIONS,
  calculateScore360,
  classifyMaturity,
  isDiagnosticScore,
} from "@/lib/diagnostic";
import { diagnosisInputSchema, onboardingInputSchema } from "@/lib/validations";
import { canAccessCompany } from "@/lib/access-policy";
import { deriveOnboardingStatus } from "@/lib/onboarding";

function scores(map: Record<string, number>) {
  return DIAGNOSTIC_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    score: map[dimension.key] ?? 3,
  }));
}

describe("Score 360", () => {
  it("converte 30/50 em 60/100", () => {
    const result = calculateScore360(
      scores({
        attraction: 2,
        conversion: 3,
        averageTicket: 3,
        recurrence: 3,
        referral: 3,
        brandImage: 3,
        commercialImage: 3,
        operations: 3,
        finance: 4,
        managementData: 3,
      }),
    );
    expect(result.rawTotal).toBe(30);
    expect(result.score100).toBe(60);
    expect(result.maturity).toBe("Em desenvolvimento");
  });

  it("classifica as faixas de maturidade", () => {
    expect(classifyMaturity(0)).toBe("Crítico");
    expect(classifyMaturity(39)).toBe("Crítico");
    expect(classifyMaturity(40)).toBe("Em estruturação");
    expect(classifyMaturity(59)).toBe("Em estruturação");
    expect(classifyMaturity(60)).toBe("Em desenvolvimento");
    expect(classifyMaturity(74)).toBe("Em desenvolvimento");
    expect(classifyMaturity(75)).toBe("Estruturado");
    expect(classifyMaturity(89)).toBe("Estruturado");
    expect(classifyMaturity(90)).toBe("Alta maturidade");
    expect(classifyMaturity(100)).toBe("Alta maturidade");
  });

  it("identifica o menor score como gargalo", () => {
    const result = calculateScore360(
      scores({
        attraction: 2,
        conversion: 3,
        finance: 4,
      }),
    );
    expect(result.bottlenecks.map((item) => item.label)).toEqual(["Atração"]);
    expect(result.scoresKind).toBe("INTERNAL_DATA");
    expect(result.bottleneckKind).toBe("INFERENCE");
  });

  it("registra empate de gargalos", () => {
    const result = calculateScore360(
      scores({
        attraction: 2,
        conversion: 2,
        finance: 4,
      }),
    );
    expect(result.bottlenecks.map((item) => item.label)).toEqual(["Atração", "Conversão"]);
  });

  it("rejeita notas fora de 1–5", () => {
    expect(isDiagnosticScore(0)).toBe(false);
    expect(isDiagnosticScore(6)).toBe(false);
    expect(isDiagnosticScore(3.5)).toBe(false);
    expect(isDiagnosticScore(1)).toBe(true);
    expect(() => calculateScore360(scores({ attraction: 6 }))).toThrow(/1 a 5/);
    expect(() => calculateScore360([])).toThrow(/10 dimensões/);
  });
});

describe("validação de diagnóstico e onboarding", () => {
  it("exige as 10 notas", () => {
    const parsed = diagnosisInputSchema.safeParse({
      idempotencyKey: "not-a-uuid",
      scores: { attraction: 3 },
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita payload completo 1–5", () => {
    const parsed = diagnosisInputSchema.safeParse({
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      scores: Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 4])),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita número inválido no onboarding", () => {
    const parsed = onboardingInputSchema.safeParse({
      name: "Oficina Centro",
      revenueMonthly: "abc",
    });
    expect(parsed.success).toBe(false);
  });

  it("permite salvar onboarding incompleto", () => {
    const parsed = onboardingInputSchema.safeParse({ name: "Cliente A" });
    expect(parsed.success).toBe(true);
    expect(deriveOnboardingStatus({ name: "Cliente A" })).toBe("DRAFT");
  });
});

describe("proteção de acesso", () => {
  it("isola empresa por owner", () => {
    expect(canAccessCompany("user-a", "user-a")).toBe(true);
    expect(canAccessCompany("user-a", "user-b")).toBe(false);
  });
});
