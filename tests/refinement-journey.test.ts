import { describe, expect, it } from "vitest";
import { canAccessCompany } from "@/lib/access-policy";
import { emptyCompanyProgress, nextCockpitAction } from "@/lib/cockpit";
import { COMPANY_NAV, COMPANY_MODULE_TABS, GESTAO_NAV } from "@/lib/company-nav";
import { formatBRL, formatDateBR, formatDateTimeBR, formatPercent } from "@/lib/format";
import {
  RELEASE_NOMENCLATURE,
  STAGE_CONFUSION,
  auditResourceHref,
  buildCompanyHubJourney,
  cockpitPriorityCta,
  contextualAssistantPrompt,
  countOrZero,
  decisionExecutionNext,
  journeyChipValue,
  memoryOriginCopy,
} from "@/lib/journey-ui";
import { opportunityNextAction } from "@/lib/opportunity-ui";
import { assistantHref } from "@/lib/assistant-ui";
import { releasedModuleHrefs as cockpitReleased } from "@/lib/cockpit";
import { aiMayExecute } from "@/lib/security/critical-actions";
import { CENTRAL_NAV, FUTURE_NAV as TYPE_FUTURE } from "@/types";

function progress(overrides: Partial<Parameters<typeof journeyChipValue>[0]> = {}) {
  return {
    ...emptyCompanyProgress(),
    companyId: "emp-1",
    companyName: "J BURGUERS",
    hasCompany: true,
    ...overrides,
  };
}

describe("Refinamento 8 — jornada e nomenclatura", () => {
  it("mantém o mapa oficial da Release 1.0", () => {
    expect(RELEASE_NOMENCLATURE.diagnostico).toBe("Diagnóstico 360°");
    expect(RELEASE_NOMENCLATURE.plano).toBe("Plano 30/60/90");
    expect(RELEASE_NOMENCLATURE.memoria).toBe("Memória Estratégica");
    expect(RELEASE_NOMENCLATURE.assistente).toBe("Assistente IA");
    expect(STAGE_CONFUSION.join(" ")).toMatch(/HIPÓTESE ≠ EVIDÊNCIA/);
    expect(GESTAO_NAV.map((item) => item.label)).toContain("Plano 30/60/90");
    expect(COMPANY_MODULE_TABS.map((item) => item.label)).toContain("Memória Estratégica");
    expect(COMPANY_NAV.find((item) => item.key === "execucao")?.label).toBe("Plano 30/60/90");
  });

  it("não mostra 0 quando não há cobertura e usa Pendente na etapa não feita", () => {
    const empty = emptyCompanyProgress();
    expect(journeyChipValue(empty, "diagnostico")).toBe("Sem dados");
    expect(journeyChipValue(empty, "oportunidades")).toBe("Sem dados");
    expect(journeyChipValue(progress(), "diagnostico")).toBe("Pendente");
    expect(journeyChipValue(progress(), "financeiro")).toBe("Pendente");
    expect(journeyChipValue(progress(), "oportunidades")).toBe("0");
    expect(journeyChipValue(progress(), "execucao")).toBe("Sem plano");
    expect(journeyChipValue(progress({ hasDiagnosis: true }), "diagnostico")).toBe("✓");
    expect(countOrZero(false, 0)).toBe("Sem dados");
    expect(countOrZero(true, 0)).toBe("0");
  });

  it("hub da empresa encadeia cadastro até memória com rotas reais", () => {
    const chips = buildCompanyHubJourney(progress({ hasDiagnosis: true, financialCount: 1 }));
    expect(chips.map((item) => item.key)).toEqual([
      "cadastro",
      "financeiro",
      "diagnostico",
      "oportunidades",
      "execucao",
      "experimentos",
      "evidencias",
      "memorias",
    ]);
    expect(chips.find((item) => item.key === "cadastro")?.value).toBe("✓");
    expect(chips.find((item) => item.key === "financeiro")?.value).toBe("✓");
    expect(chips.find((item) => item.key === "diagnostico")?.href).toBe("/empresas/emp-1/diagnostico");
    expect(chips.find((item) => item.key === "cadastro")?.href).toBe("/empresas/emp-1/editar");
    expect(chips.every((item) => item.href && !item.href.includes("#"))).toBe(true);
  });

  it("próxima ação determinística não inventa prioridade", () => {
    expect(nextCockpitAction(emptyCompanyProgress()).code).toBe("CREATE_COMPANY");
    expect(nextCockpitAction(progress()).href).toBe("/empresas/emp-1/diagnostico");
    expect(nextCockpitAction(progress({ hasDiagnosis: true })).href).toBe("/empresas/emp-1/oportunidades");
    expect(
      nextCockpitAction(progress({ hasDiagnosis: true, opportunityCount: 1, prioritizedOpportunityCount: 1 })).href,
    ).toBe("/empresas/emp-1/execucao");
  });
});

describe("Refinamento 8 — integração entre etapas", () => {
  it("oportunidade sem plano pede revisão humana e não aprova", () => {
    expect(
      opportunityNextAction(
        { id: "op-1", status: "ACTIVE", evidenceLevel: "HYPOTHESIS", queuedForPlan: false, experimentCount: 0 },
        "emp-1",
      ),
    ).toMatchObject({ kind: "experiment", label: "Criar experimento" });
    expect(
      opportunityNextAction(
        { id: "op-1", status: "ACTIVE", evidenceLevel: "HYPOTHESIS", queuedForPlan: false, experimentCount: 2 },
        "emp-1",
      ).label,
    ).toBe("Revisar para decisão");
    expect(
      opportunityNextAction(
        { id: "op-1", status: "ACTIVE", evidenceLevel: "HYPOTHESIS", queuedForPlan: true, experimentCount: 0 },
        "emp-1",
      ).label,
    ).toBe("Criar plano 30/60/90");
    expect(
      opportunityNextAction(
        { id: "op-1", status: "ACTIVE", evidenceLevel: "HYPOTHESIS", queuedForPlan: false, experimentCount: 0, planId: "plan-1" },
        "emp-1",
      ),
    ).toMatchObject({ kind: "execution", label: "Abrir plano", href: "/empresas/emp-1/execucao/plan-1" });
  });

  it("decisão aprovada oferece plano e rejeitada não sugere execução", () => {
    expect(
      decisionExecutionNext({ status: "APPROVED", companyId: "emp-1", opportunityId: "op-1" }),
    ).toMatchObject({ show: true, label: "Criar plano 30/60/90", href: "/empresas/emp-1/execucao/novo?opportunityId=op-1" });
    expect(
      decisionExecutionNext({ status: "APPROVED", companyId: "emp-1", opportunityId: "op-1", planId: "plan-9" }),
    ).toMatchObject({ show: true, label: "Abrir plano", href: "/empresas/emp-1/execucao/plan-9" });
    expect(decisionExecutionNext({ status: "REJECTED", companyId: "emp-1", opportunityId: "op-1" })).toMatchObject({
      show: false,
    });
  });

  it("memória de outra empresa continua hipótese transferível", () => {
    expect(memoryOriginCopy({ validated: true, companyName: "Oficina Centro", sameCompany: true })).toBe(
      "Baseado em aprendizado validado na empresa Oficina Centro.",
    );
    expect(memoryOriginCopy({ validated: true, companyName: "Oficina Centro", sameCompany: false })).toMatch(
      /Possível estratégia transferível/,
    );
    expect(memoryOriginCopy({ validated: false, companyName: "Oficina Centro", sameCompany: false })).toMatch(
      /não validado/,
    );
  });

  it("Cockpit e IA carregam o contexto da empresa sem CTA genérico", () => {
    expect(cockpitPriorityCta("Realizar Diagnóstico 360°.")).toBe("Realizar diagnóstico");
    expect(assistantHref("emp-1", contextualAssistantPrompt("diagnostico"))).toBe(
      "/empresas/emp-1/assistente?pergunta=Quais+s%C3%A3o+meus+maiores+gargalos%3F",
    );
    expect(assistantHref("emp-1", contextualAssistantPrompt("oportunidade", "CMV"))).toContain("emp-1");
    expect(assistantHref("emp-1", contextualAssistantPrompt("oportunidade", "CMV"))).toContain("CMV");
  });
});

describe("Refinamento 8 — contexto, auditoria e isolamento", () => {
  it("propaga IDs corretos entre módulos e recusa outro owner", () => {
    const hrefs = cockpitReleased("emp-1");
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/empresas/emp-1",
        "/empresas/emp-1/diagnostico",
        "/empresas/emp-1/oportunidades",
        "/empresas/emp-1/execucao",
        "/empresas/emp-1/experimentos",
        "/empresas/emp-1/memoria",
      ]),
    );
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    expect(canAccessCompany("owner-a", "owner-a")).toBe(true);
    expect(aiMayExecute("decision.approve")).toBe(false);
  });

  it("auditoria só gera link quando há empresa segura", () => {
    expect(auditResourceHref({ entity: "Decision", companyId: "emp-1", entityId: "dec-1" })).toBe("/cockpit#cockpit-decisoes");
    expect(auditResourceHref({ entity: "Opportunity", companyId: "emp-1", entityId: "op-1" })).toBe(
      "/empresas/emp-1/oportunidades/op-1",
    );
    expect(auditResourceHref({ entity: "ActionPlan", companyId: "emp-1", entityId: "plan-1" })).toBe(
      "/empresas/emp-1/execucao/plan-1",
    );
    expect(auditResourceHref({ entity: "Experiment", companyId: "emp-1", entityId: "exp-1" })).toBe(
      "/empresas/emp-1/experimentos/exp-1",
    );
    expect(auditResourceHref({ entity: "StrategicMemory", companyId: "emp-1", entityId: "mem-1" })).toBe(
      "/empresas/emp-1/memoria/mem-1",
    );
    expect(auditResourceHref({ entity: "Opportunity", companyId: null, entityId: "op-1" })).toBeNull();
    expect(auditResourceHref({ entity: "AutomationAlert", companyId: null, entityId: "al-1" })).toBe("/alertas");
  });

  it("Conexões e Estratégia continuam em breve sem href morto", () => {
    expect(TYPE_FUTURE.every((item) => item.enabled === false && item.href !== "#")).toBe(true);
    expect(CENTRAL_NAV.every((item) => item.href.startsWith("/"))).toBe(true);
  });

  it("padroniza data e valor sem alterar persistência", () => {
    expect(formatDateBR("2026-09-19T15:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatDateTimeBR("2026-09-19T15:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatBRL(1234.56)).toMatch(/1\.234,56/);
    expect(formatPercent(30.5)).toBe("30,5%");
    expect(formatBRL(null)).toBe("—");
  });
});
