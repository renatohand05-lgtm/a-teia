import { describe, expect, it } from "vitest";
import { companyInputSchema, loginSchema } from "@/lib/validations";
import { KNOWLEDGE_LABELS } from "@/lib/knowledge";
import { cockpitPriorityFromCompany } from "@/lib/priority";

describe("validações", () => {
  it("rejeita empresa sem nome", () => {
    const result = companyInputSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("aceita cadastro mínimo", () => {
    const result = companyInputSchema.safeParse({ name: "Oficina Centro" });
    expect(result.success).toBe(true);
  });

  it("ignora campos numéricos vazios", () => {
    const result = companyInputSchema.safeParse({
      name: "Mercado Express",
      units: "",
      revenueMonthly: "",
    });
    expect(result.success).toBe(true);
  });

  it("valida login", () => {
    expect(loginSchema.safeParse({ email: "x", password: "123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "renato@a-teia.local", password: "12345678" }).success).toBe(true);
  });
});

describe("conhecimento", () => {
  it("mantém as seis categorias da Teia", () => {
    expect(Object.values(KNOWLEDGE_LABELS)).toEqual([
      "DADO INTERNO",
      "FONTE EXTERNA",
      "INFERÊNCIA",
      "HIPÓTESE",
      "EVIDÊNCIA",
      "RECOMENDAÇÃO",
    ]);
  });
});

describe("prioridade preliminar", () => {
  const base = {
    revenueMonthly: 0,
    marginPercent: 3,
    perceivedBottlenecks: "CMV alto",
    objectives: null,
  };

  it("sobe prioridade quando há gargalo e margem baixa", () => {
    const result = cockpitPriorityFromCompany(base);
    expect(result.score).toBeGreaterThan(50);
    expect(result.reason).toContain("margem");
  });
});
