import { describe, expect, it } from "vitest";
import { AUTOMATION_TEMPLATES, evaluateTemplate, type CompanyFacts } from "@/lib/automation-rules-engine";
import { isNoisyAuditAction } from "@/lib/audit-ui";
import { calculateDRE, emptyDreInput } from "@/lib/financial-engine";
import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { auditResourceHref } from "@/lib/journey-ui";
import { toPublicError } from "@/lib/security/errors";
import { classifyStatementType } from "@/lib/ai-executive-engine";

function facts(overrides: Partial<CompanyFacts> = {}): CompanyFacts {
  return {
    companyId: "b",
    companyName: "B",
    cogsPercent: null,
    cogsTarget: null,
    ebitda: null,
    ebitdaTarget: null,
    cash: null,
    revenue: null,
    financeUpdatedAt: null,
    overdueTaskCount: 0,
    stalePlanCount: 0,
    experimentStaleCount: 0,
    pendingDecisionDays: null,
    pendingDecisionCount: 0,
    highScoreOpportunityWithoutPlan: 0,
    allocationPendingDays: null,
    financeAgeDays: null,
    playbookAwaitingDecision: 0,
    playbookAwaitingResult: 0,
    ...overrides,
  };
}

describe("Sprint 19 — validação operacional", () => {
  it("alertas do ciclo abrem o recurso certo", () => {
    expect(evaluateTemplate(AUTOMATION_TEMPLATES.find((item) => item.key === "playbook_awaiting_decision")!, facts({ playbookAwaitingDecision: 1 }))?.href).toBe(
      "/aplicacoes?status=AGUARDANDO_APROVACAO",
    );
    expect(evaluateTemplate(AUTOMATION_TEMPLATES.find((item) => item.key === "playbook_awaiting_result")!, facts({ playbookAwaitingResult: 1 }))?.href).toBe(
      "/aplicacoes?resultado=pendente",
    );
    expect(auditResourceHref({ entity: "PlaybookApplication", entityId: "app-1" })).toBe("/aplicacoes/app-1");
    expect(auditResourceHref({ entity: "Experiment", companyId: "emp-1", entityId: "exp-1" })).toBe("/empresas/emp-1/experimentos/exp-1");
    expect(auditResourceHref({ entity: "FinancialStatement", companyId: "emp-1" })).toBe("/empresas/emp-1/financeiro");
    expect(auditResourceHref({ entity: "Decision", companyId: "emp-1" })).toBe("/cockpit#cockpit-decisoes");
    expect(evaluateTemplate(AUTOMATION_TEMPLATES.find((item) => item.key === "cmv_above_target")!, facts({ cogsPercent: 40, cogsTarget: 32 }))?.href).toBe(
      "/empresas/b/financeiro",
    );
    expect(evaluateTemplate(AUTOMATION_TEMPLATES.find((item) => item.key === "experiment_stale")!, facts({ experimentStaleCount: 2 }))?.href).toBe(
      "/empresas/b/experimentos",
    );
    expect(evaluateTemplate(AUTOMATION_TEMPLATES.find((item) => item.key === "decision_pending")!, facts({ pendingDecisionDays: 5, pendingDecisionCount: 1 }))?.href).toBe(
      "/cockpit#cockpit-decisoes",
    );
    expect(auditResourceHref({ entity: "Evidence", companyId: "emp-1" })).toBe("/empresas/emp-1/experimentos?status=COMPLETED");
    expect(auditResourceHref({ entity: "StrategicMemory", companyId: "emp-1", entityId: "mem-1" })).toBe("/empresas/emp-1/memoria/mem-1");
  });

  it("auditoria operacional não trata reviewed como viewed", () => {
    expect(isNoisyAuditAction("cockpit.viewed")).toBe(true);
    expect(isNoisyAuditAction("page.refresh")).toBe(true);
    expect(isNoisyAuditAction("playbook.application.reviewed")).toBe(false);
    expect(isNoisyAuditAction("decision.reviewed")).toBe(false);
    expect(isNoisyAuditAction("company.restore")).toBe(false);
  });

  it("classifica dado, hipótese e evidência sem promover fonte externa", () => {
    expect(classifyStatementType("Dado: CMV informado 38%.")).toBe("DADO");
    expect(classifyStatementType("Hipótese: revisar compras pode reduzir CMV.")).toBe("HIPOTESE");
    expect(classifyStatementType("Evidência: experimento X validado e reduziu CMV.")).toBe("EVIDENCIA");
  });

  it("erro técnico não vaza Prisma, P2002 nem UUID", () => {
    const unique = toPublicError(new Error("Unique constraint failed on the fields: (`idempotencyKey`)"));
    expect(unique.body.error).toBe(HUMAN_MESSAGES.internal);
    expect(unique.body.error).not.toMatch(/P2002|Prisma|idempotencyKey/i);
    const code = toPublicError(new Error("P2025 Record to update not found"));
    expect(code.body.error).not.toMatch(/P2025|Record to update/);
    const uuid = toPublicError(new Error("company cmh1234567890 not found 550e8400-e29b-41d4-a716-446655440000"));
    expect(uuid.body.error).not.toMatch(/550e8400|cmh1234567890/);
  });

  it("margem bruta exige CMV informado e usa receita líquida", () => {
    const dre = calculateDRE({
      ...emptyDreInput(),
      grossRevenue: 80_000,
      deductions: 5_000,
      cogs: 25_000,
    });
    expect(dre.netRevenue).toBe(75_000);
    expect(dre.grossMargin).toBe(50_000);
    expect(dre.grossMargin).not.toBe(dre.grossRevenue);
  });
});
