import { describe, expect, it } from "vitest";
import {
  buildJourney,
  emptyCompanyProgress,
  nextCockpitAction,
  releasedModuleHrefs,
  type CompanyProgress,
} from "@/lib/cockpit";
import { COMPANY_MODULE_TABS, GESTAO_NAV, gestaoHref, pathForModuleQuery } from "@/lib/company-nav";
import { CENTRAL_NAV, FUTURE_NAV, INTELLIGENCE_NAV, PRIMARY_NAV } from "@/types";

function progress(overrides: Partial<CompanyProgress> = {}): CompanyProgress {
  return {
    ...emptyCompanyProgress(),
    companyId: "emp-1",
    companyName: "Oficina Centro",
    hasCompany: true,
    ...overrides,
  };
}

describe("prioridade contextual do Cockpit", () => {
  it("carteira vazia pede a primeira empresa", () => {
    const action = nextCockpitAction(emptyCompanyProgress());
    expect(action.code).toBe("CREATE_COMPANY");
    expect(action.href).toBe("/empresas/nova");
    expect(action.title).toMatch(/empresa/i);
  });

  it("empresa sem diagnóstico pede o 360°", () => {
    const action = nextCockpitAction(progress());
    expect(action.code).toBe("DIAGNOSIS");
    expect(action.href).toBe("/empresas/emp-1/diagnostico");
  });

  it("diagnóstico sem oportunidade pede análise", () => {
    const action = nextCockpitAction(progress({ hasDiagnosis: true }));
    expect(action.code).toBe("OPPORTUNITIES");
    expect(action.href).toBe("/empresas/emp-1/oportunidades");
  });

  it("oportunidade priorizada sem plano pede 30/60/90", () => {
    const action = nextCockpitAction(
      progress({
        hasDiagnosis: true,
        opportunityCount: 2,
        prioritizedOpportunityCount: 1,
      }),
    );
    expect(action.code).toBe("PLAN");
    expect(action.href).toBe("/empresas/emp-1/execucao");
  });

  it("plano sem validação pede experimento", () => {
    const action = nextCockpitAction(
      progress({
        hasDiagnosis: true,
        opportunityCount: 1,
        prioritizedOpportunityCount: 1,
        planCount: 1,
      }),
    );
    expect(action.code).toBe("EXPERIMENT");
    expect(action.href).toBe("/empresas/emp-1/experimentos");
  });

  it("evidência sem memória pede aprendizado", () => {
    const action = nextCockpitAction(
      progress({
        hasDiagnosis: true,
        opportunityCount: 1,
        prioritizedOpportunityCount: 1,
        planCount: 1,
        experimentCompletedCount: 1,
        evidenceCount: 1,
      }),
    );
    expect(action.code).toBe("MEMORY");
    expect(action.href).toBe("/empresas/emp-1/memoria");
  });

  it("jornada completa revisa a empresa", () => {
    const action = nextCockpitAction(
      progress({
        hasDiagnosis: true,
        opportunityCount: 1,
        prioritizedOpportunityCount: 1,
        planCount: 1,
        experimentCompletedCount: 1,
        evidenceCount: 1,
        evidenceValidatedCount: 1,
        memoryValidatedCount: 1,
      }),
    );
    expect(action.code).toBe("REVIEW");
    expect(action.href).toBe("/empresas/emp-1");
  });
});

describe("jornada e links reais", () => {
  it("carteira vazia aponta para cadastro e seletor de módulo", () => {
    const journey = buildJourney(emptyCompanyProgress());
    expect(journey).toHaveLength(8);
    expect(journey.every((stage) => stage.clickable)).toBe(true);
    expect(journey[0]?.href).toBe("/empresas/nova");
    expect(journey[1]?.href).toBe("/empresas?modulo=diagnostico");
    expect(journey.map((stage) => stage.status)).toEqual(Array(8).fill("SEM_DADOS"));
  });

  it("empresa com diagnóstico marca 360 como concluído e o restante sem dados", () => {
    const journey = buildJourney(progress({ hasDiagnosis: true }));
    expect(journey.find((stage) => stage.key === "empresa")?.status).toBe("CONCLUIDO");
    expect(journey.find((stage) => stage.key === "diagnostico")?.status).toBe("CONCLUIDO");
    expect(journey.find((stage) => stage.key === "oportunidade")?.status).toBe("SEM_DADOS");
    expect(journey.find((stage) => stage.key === "diagnostico")?.href).toBe("/empresas/emp-1/diagnostico");
  });

  it("expõe hrefs dos módulos publicados", () => {
    const hrefs = releasedModuleHrefs("emp-1");
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/empresas/emp-1",
        "/empresas/emp-1/diagnostico",
        "/empresas/emp-1/oportunidades",
        "/empresas/emp-1/execucao",
        "/empresas/emp-1/financeiro",
        "/empresas/emp-1/financeiro/dre",
        "/empresas/emp-1/financeiro/fluxo-caixa",
        "/empresas/emp-1/financeiro/metas",
        "/empresas/emp-1/financeiro/cenarios",
        "/empresas/emp-1/experimentos",
        "/empresas/emp-1/memoria",
      ]),
    );
  });

  it("gestão sem empresa vai para o seletor e com empresa vai ao módulo", () => {
    expect(gestaoHref(null, "financeiro")).toBe("/empresas?modulo=financeiro");
    expect(gestaoHref("emp-1", "financeiro")).toBe("/empresas/emp-1/financeiro");
    expect(pathForModuleQuery("dre", "emp-1")).toBe("/empresas/emp-1/financeiro/dre");
    expect(pathForModuleQuery("evidencias", "emp-1")).toContain("/experimentos");
  });
});

describe("menu do produto publicado", () => {
  it("núcleo, gestão e inteligência usam rotas reais", () => {
    expect(PRIMARY_NAV.map((item) => item.label)).toEqual(["Meu Cockpit", "Empresas"]);
    expect(GESTAO_NAV.map((item) => item.label)).toEqual([
      "Diagnóstico 360°",
      "Oportunidades",
      "Plano 30/60/90",
      "Financeiro",
      "Experimentos",
    ]);
    expect(INTELLIGENCE_NAV.map((item) => item.label)).toEqual(expect.arrayContaining(["Memória Estratégica", "Assistente IA"]));
    expect(CENTRAL_NAV.map((item) => item.label)).toEqual(["Prioridades", "Decisões", "Alocação", "Automações", "Alertas", "Auditoria"]);
    expect(FUTURE_NAV.map((item) => item.label)).not.toContain("Assistente IA");
    expect(FUTURE_NAV.map((item) => item.label)).not.toContain("Auditoria");
    expect(COMPANY_MODULE_TABS.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Visão Geral", "Diagnóstico 360°", "Oportunidades", "Plano 30/60/90", "Financeiro", "Experimentos", "Memória Estratégica"]),
    );
    expect(FUTURE_NAV).toEqual([]);
    expect(FUTURE_NAV.map((item) => item.label)).not.toEqual(expect.arrayContaining(["Execução", "Financeiro", "Oportunidades"]));
  });
});
