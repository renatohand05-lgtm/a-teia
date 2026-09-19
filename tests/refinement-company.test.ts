import { describe, expect, it } from "vitest";
import {
  COMPANY_STATUS_LABELS,
  coverageFromFlags,
  displaySegment,
  listingPriorityLabel,
} from "@/lib/company-ux";
import { formatBRL, formatDateBR, parseBrazilianNumber } from "@/lib/format";
import { companyInputSchema, dreInputSchema, financialGoalSchema } from "@/lib/validations";
import { COMPANY_MODULE_TABS, COMPANY_NAV, pathForModuleQuery } from "@/lib/company-nav";

describe("Refinamento 2 — empresas e formulários", () => {
  it("aceita cadastro mínimo só com nome", () => {
    const parsed = companyInputSchema.safeParse({ name: "J Burguers" });
    expect(parsed.success).toBe(true);
  });

  it("rejeita nome curto e percentual inválido", () => {
    expect(companyInputSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(companyInputSchema.safeParse({ name: "Loja", marginPercent: "abc" }).success).toBe(false);
  });

  it("lê moeda brasileira sem confundir milhar e decimal", () => {
    expect(parseBrazilianNumber("R$ 600.000,00")).toBe(600000);
    expect(parseBrazilianNumber("600.000")).toBe(600000);
    expect(parseBrazilianNumber("600,50")).toBe(600.5);
    expect(parseBrazilianNumber("600000")).toBe(600000);
    expect(parseBrazilianNumber("")).toBeNull();
    expect(parseBrazilianNumber("abc")).toBeNull();
    expect(dreInputSchema.safeParse({ companyId: "clxxxxxxxxxxxxxxxxxxxx", periodMonth: 1, periodYear: 2026, grossRevenue: "R$ 600.000,00" }).success).toBe(true);
  });

  it("lê percentual como 30 e não como 0.30", () => {
    const parsed = financialGoalSchema.safeParse({
      companyId: "clxxxxxxxxxxxxxxxxxxxx",
      periodMonth: 1,
      periodYear: 2026,
      cogsPercentTarget: "30%",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.cogsPercentTarget).toBe(30);
  });

  it("zero real não é ausência de dado", () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
    expect(formatBRL(null)).toBe("—");
    expect(formatDateBR(null)).toBe("—");
    expect(companyInputSchema.parse({ name: "Zero", revenueMonthly: "0" }).revenueMonthly).toBe(0);
  });

  it("normaliza segmento só na apresentação", () => {
    expect(displaySegment("ALIMENTAÇÃO")).toBe("Alimentação");
    expect(displaySegment("alimentacao")).toBe("Alimentação");
    expect(displaySegment("Restaurante")).toBe("Alimentação");
    expect(displaySegment(null)).toBe("Não informado");
  });

  it("padroniza status sem inventar estado", () => {
    expect(COMPANY_STATUS_LABELS.ACTIVE).toBe("Ativa");
    expect(COMPANY_STATUS_LABELS.ARCHIVED).toBe("Arquivada");
  });

  it("cobertura essencial é determinística e sem percentual falso", () => {
    const empty = coverageFromFlags({
      cadastro: false,
      onboarding: false,
      diagnostico: false,
      financeiro: false,
      oportunidades: false,
    });
    expect(empty.level).toBe("INICIAL");
    expect(empty.label).toBe("0 de 5 essenciais");
    const mid = coverageFromFlags({
      cadastro: true,
      onboarding: true,
      diagnostico: true,
      financeiro: false,
      oportunidades: false,
    });
    expect(mid.level).toBe("PARCIAL");
    const full = coverageFromFlags({
      cadastro: true,
      onboarding: true,
      diagnostico: true,
      financeiro: true,
      oportunidades: true,
    });
    expect(full.level).toBe("COMPLETO");
  });

  it("prioridade da listagem some sem sinal informado", () => {
    expect(
      listingPriorityLabel({
        revenueMonthly: null,
        marginPercent: null,
        perceivedBottlenecks: null,
        objectives: null,
      }),
    ).toBe("—");
  });

  it("módulos contextuais usam rotas reais", () => {
    expect(COMPANY_MODULE_TABS.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Visão Geral", "Diagnóstico 360°", "Oportunidades", "Plano 30/60/90", "Financeiro", "Experimentos", "Memória Estratégica", "Assistente IA"]),
    );
    expect(pathForModuleQuery("financeiro", "emp-1")).toBe("/empresas/emp-1/financeiro");
    expect(pathForModuleQuery("evidencias", "emp-1")).toContain("/experimentos");
    expect(COMPANY_NAV.every((item) => item.href("emp-1").startsWith("/empresas/emp-1"))).toBe(true);
  });
});
