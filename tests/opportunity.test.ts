import { describe, expect, it } from "vitest";
import {
  calculatePaybackMonths,
  calculatePriorityScore,
  classifyPriority,
  easeFromEffort,
  rankOpportunities,
  severityFromDimensionScore,
  speedFromPayback,
} from "@/lib/opportunity-score";
import {
  isLowDimensionScore,
  templateByKey,
  templatesForDimension,
} from "@/lib/opportunity-templates";
import { canAccessCompany } from "@/lib/access-policy";
import { opportunityInputSchema } from "@/lib/validations";

describe("score de prioridade", () => {
  it("mapeia nota do diagnóstico para severidade inversa", () => {
    expect(severityFromDimensionScore(1)).toBe(5);
    expect(severityFromDimensionScore(5)).toBe(1);
    expect(severityFromDimensionScore(3)).toBe(3);
  });

  it("converte effort em ease", () => {
    expect(easeFromEffort(1)).toBe(5);
    expect(easeFromEffort(5)).toBe(1);
    expect(easeFromEffort(2)).toBe(4);
  });

  it("normaliza extremos para 0 e 100", () => {
    const low = calculatePriorityScore({
      dimensionScore: 5,
      expectedImpact: 1,
      urgency: 1,
      confidence: 1,
      effort: 5,
      estimatedInvestment: 1000,
      expectedMonthlyReturn: 10,
    });
    const high = calculatePriorityScore({
      dimensionScore: 1,
      expectedImpact: 5,
      urgency: 5,
      confidence: 5,
      effort: 1,
      estimatedInvestment: 1000,
      expectedMonthlyReturn: 5000,
    });
    expect(low.score).toBe(0);
    expect(high.score).toBe(100);
    expect(high.band).toBe("Alta prioridade");
    expect(low.band).toBe("Baixa prioridade");
  });

  it("marca cálculo parcial sem retorno financeiro", () => {
    const result = calculatePriorityScore({
      dimensionScore: 2,
      expectedImpact: 4,
      urgency: 4,
      confidence: 3,
      effort: 2,
    });
    expect(result.partial).toBe(true);
    expect(result.speed).toBe(3);
    expect(result.paybackMonths).toBeNull();
    expect(result.reasons.some((item) => /não validado/i.test(item))).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });
});

describe("payback básico", () => {
  it("calcula investment / monthlyReturn", () => {
    expect(calculatePaybackMonths(10_000, 5_000)).toBe(2);
  });

  it("não inventa payback se retorno <= 0", () => {
    expect(calculatePaybackMonths(10_000, 0)).toBeNull();
    expect(calculatePaybackMonths(10_000, -1)).toBeNull();
    expect(speedFromPayback(null)).toEqual({ speed: 3, partial: true });
  });
});

describe("ranking", () => {
  it("ordena da maior prioridade para a menor", () => {
    const ranked = rankOpportunities([
      { title: "B", score: 70 },
      { title: "A", score: 90 },
      { title: "C", score: 40 },
    ]);
    expect(ranked.map((item) => item.title)).toEqual(["A", "B", "C"]);
  });

  it("empate de score permanece estável por título", () => {
    const ranked = rankOpportunities([
      { title: "Zeta", score: 80 },
      { title: "Alfa", score: 80 },
    ]);
    expect(ranked.map((item) => item.title)).toEqual(["Alfa", "Zeta"]);
    expect(ranked[0]?.score).toBe(ranked[1]?.score);
  });
});

describe("geração por dimensão", () => {
  it("oferece hipóteses de atração", () => {
    const templates = templatesForDimension("attraction");
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.some((item) => /digital/i.test(item.key))).toBe(true);
    expect(templateByKey("conversion-script")?.title).toMatch(/script/i);
  });

  it("considera nota baixa até 3", () => {
    expect(isLowDimensionScore(3)).toBe(true);
    expect(isLowDimensionScore(4)).toBe(false);
  });
});

describe("validação e isolamento", () => {
  it("exige campos obrigatórios da oportunidade manual", () => {
    const parsed = opportunityInputSchema.safeParse({
      title: "X",
      problemStatement: "curto",
      hypothesis: "curto",
      sourceDimension: "attraction",
      expectedImpact: 3,
      urgency: 3,
      effort: 3,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita escala fora de 1–5 e investimento negativo", () => {
    const parsed = opportunityInputSchema.safeParse({
      title: "Melhorar conversão comercial",
      problemStatement: "Orçamentos esfriam sem follow-up.",
      hypothesis: "Se houver follow-up em 48h, a conversão sobe.",
      sourceDimension: "conversion",
      expectedImpact: 6,
      urgency: 4,
      effort: 2,
      estimatedInvestment: -10,
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita hipótese manual válida", () => {
    const parsed = opportunityInputSchema.safeParse({
      title: "Criar programa de recorrência",
      problemStatement: "Clientes não voltam após a primeira compra.",
      hypothesis: "Uma rotina de recompra em 60 dias pode elevar a recorrência.",
      sourceDimension: "recurrence",
      expectedImpact: 4,
      urgency: 4,
      effort: 3,
      confidence: 3,
      estimatedInvestment: 2000,
      expectedMonthlyReturn: 1500,
    });
    expect(parsed.success).toBe(true);
  });

  it("isola empresa por owner", () => {
    expect(canAccessCompany("owner-a", "owner-a")).toBe(true);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
  });

  it("classifica faixas de prioridade", () => {
    expect(classifyPriority(80).key).toBe("high");
    expect(classifyPriority(60).key).toBe("medium");
    expect(classifyPriority(59).key).toBe("low");
  });
});
