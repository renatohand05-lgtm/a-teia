import { describe, expect, it } from "vitest";
import { canAccessCompany } from "@/lib/access-policy";
import {
  displayHours,
  displayMoney,
  emptyAllocationCopy,
  scenarioLabel,
} from "@/lib/allocation-ui";
import { auditActionLabel } from "@/lib/audit-ui";
import {
  alertPriorityLabel,
  alertStatusLabel,
  automationBucket,
  conditionLabel,
  frequencyLabel,
  groupAutomations,
  missingRuleDataCopy,
  runNowDisclaimer,
  runNowResultCopy,
} from "@/lib/automation-ui";
import { AUTOMATION_TEMPLATES, evaluateTemplate, isAutomationQuestion, parseAutomationPrompt, type CompanyFacts } from "@/lib/automation-rules-engine";
import { authorizeCronRequest, isSchedulerConfigured } from "@/lib/cron-auth";
import { showCountBadge } from "@/lib/cockpit-ui";
import { detectQuestionIntent } from "@/lib/ai-executive-engine";
import { missingMoneyIsNotZero } from "@/lib/money";
import { buildHealthPayload } from "@/lib/release";
import { aiMayApproveAllocation, aiMayMoveMoney, allocateResources, isAllocationQuestion, type AllocationCandidate, type AllocationConstraints } from "@/lib/resource-allocation-engine";
import { aiMayExecute } from "@/lib/security/critical-actions";
import { auditContainsSecret, sanitizeAuditValue } from "@/lib/security/sanitize";
import { aiMayCreateAutomationSilently, aiMayEnableAutomation } from "@/lib/automation-config";

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
    companySegment: "Alimentação",
    sourceKind: "OPPORTUNITY",
    sourceId: "opp-1",
    title: "Reduzir CMV",
    description: null,
    investmentCents: 2_500_000,
    hoursHundredths: 4_000,
    expectedMonthlyReturnCents: 800_000,
    paybackMonthsHundredths: 200,
    impact: 4,
    urgency: 4,
    score: 91,
    evidenceLevel: "HYPOTHESIS",
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

function facts(overrides: Partial<CompanyFacts> = {}): CompanyFacts {
  return {
    companyId: "emp-1",
    companyName: "J BURGUERS",
    cogsPercent: 30,
    cogsTarget: 28,
    ebitda: 12000,
    ebitdaTarget: 15000,
    cash: 8000,
    revenue: 100000,
    financeUpdatedAt: "2026-09-18T12:00:00.000Z",
    overdueTaskCount: 0,
    stalePlanCount: 0,
    experimentStaleCount: 0,
    pendingDecisionDays: null,
    pendingDecisionCount: 0,
    highScoreOpportunityWithoutPlan: 0,
    allocationPendingDays: null,
    financeAgeDays: 2,
    ...overrides,
  };
}

describe("Refinamento 7 — alocação", () => {
  it("não consome 100% e ausência não vira zero", () => {
    const result = allocateResources([candidate()], constraints());
    expect(result.capitalPreservedCents).toBeGreaterThan(0);
    expect(result.hoursPreservedHundredths).toBeGreaterThan(0);
    expect(missingMoneyIsNotZero(null)).toBe(true);
    expect(displayMoney(null)).toBe("Sem dados");
    expect(displayHours(null)).toBe("Sem dados");
    expect(displayMoney(0)).toMatch(/R\$/);
    expect(displayHours(0)).toBe("0h");
    expect(scenarioLabel("BALANCEADO")).toBe("Base");
    expect(emptyAllocationCopy(true).title).toBe("Nenhuma simulação criada.");
  });

  it("IA não aprova nem move dinheiro e aprovação continua humana", () => {
    expect(aiMayApproveAllocation()).toBe(false);
    expect(aiMayMoveMoney()).toBe(false);
    expect(aiMayExecute("allocation.approve")).toBe(false);
    expect(aiMayExecute("capital.move")).toBe(false);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    expect(isAllocationQuestion("Como eu distribuiria R$ 50 mil?")).toBe(true);
    expect(detectQuestionIntent("Tenho alguma decisão de investimento pendente?")).toBe("ALLOCATION");
  });
});

describe("Refinamento 7 — automações e alertas", () => {
  it("frequência é executiva e automação não ativa sozinha", () => {
    expect(frequencyLabel("DAILY")).toBe("Todos os dias");
    expect(frequencyLabel("0 8 * * *")).toBe("0 8 * * *");
    expect(aiMayEnableAutomation()).toBe(false);
    expect(aiMayCreateAutomationSilently()).toBe(false);
    expect(parseAutomationPrompt("Criar alerta se CMV ultrapassar 32%")?.requiresConfirmation).toBe(true);
    expect(missingRuleDataCopy()).toMatch(/ainda não possui/);
  });

  it("dado ausente não gera alerta falso e buckets respeitam o ciclo", () => {
    const cmv = AUTOMATION_TEMPLATES.find((item) => item.key === "cmv_above_target")!;
    expect(evaluateTemplate(cmv, facts({ cogsPercent: null }))).toBeNull();
    expect(alertPriorityLabel("MEDIO")).toBe("ATENÇÃO");
    expect(alertPriorityLabel("BAIXO")).toBe("INFORMATIVO");
    expect(alertStatusLabel("OPEN")).toBe("Aberto");
    expect(automationBucket({ enabled: true, lastRunAt: "2026-09-19" })).toBe("ATIVAS");
    expect(automationBucket({ enabled: false, lastRunAt: null })).toBe("RASCUNHOS");
    expect(automationBucket({ enabled: false, lastRunAt: "2026-09-19" })).toBe("PAUSADAS");
    expect(automationBucket({ enabled: true, lastRunAt: "2026-09-19" }, "FAILED")).toBe("COM PROBLEMA");
    const grouped = groupAutomations(
      [
        { id: "1", enabled: true, lastRunAt: "x" },
        { id: "2", enabled: false, lastRunAt: null },
      ],
      { "1": "SUCCESS" },
    );
    expect(grouped.ATIVAS).toHaveLength(1);
    expect(grouped.RASCUNHOS).toHaveLength(1);
    expect(conditionLabel({ metric: "cogsPercent", operator: "gt", threshold: 32 })).toBe("CMV acima de 32%");
    expect(runNowDisclaimer()).toMatch(/Nenhuma movimentação financeira/);
    expect(runNowResultCopy({ itemsProcessed: 3, alertsCreated: 0 })).toBe("Regras avaliadas: 3. Alertas criados: 0.");
    expect(runNowResultCopy({ skipped: true })).toMatch(/Sem alteração/);
    expect(isAutomationQuestion("Quais automações estão ativas?")).toBe(true);
    expect(isAutomationQuestion("Por que recebi este alerta?")).toBe(true);
  });

  it("badge usa quantidade real e cron não vaza secret", () => {
    expect(showCountBadge(0)).toBe(false);
    expect(showCountBadge(2)).toBe(true);
    expect(authorizeCronRequest(new Request("https://a-teia.vercel.app/api/cron/automations"))).toBe(false);
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "refinement-7-secret";
    expect(isSchedulerConfigured()).toBe(true);
    expect(authorizeCronRequest(new Request("https://x", { headers: { authorization: "Bearer refinement-7-secret" } }))).toBe(true);
    const health = buildHealthPayload();
    expect(health.scheduler).toMatch(/configured/);
    expect(JSON.stringify(health)).not.toContain("refinement-7-secret");
    expect(JSON.stringify(health)).not.toMatch(/CRON_SECRET/);
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});

describe("Refinamento 7 — auditoria e isolamento", () => {
  it("traduz eventos e sanitiza metadata", () => {
    expect(auditActionLabel("allocation.approved")).toBe("Alocação aprovada");
    expect(auditActionLabel("automation.created")).toBe("Automação criada");
    expect(auditActionLabel("alert.acknowledged")).toBe("Alerta reconhecido");
    const clean = sanitizeAuditValue({
      title: "ok",
      CRON_SECRET: "abc",
      OPENAI_API_KEY: "sk-abcdefghijk",
      password: "x",
    }) as Record<string, unknown>;
    expect(clean.title).toBe("ok");
    expect(clean.CRON_SECRET).toBeUndefined();
    expect(clean.OPENAI_API_KEY).toBeUndefined();
    expect(clean.password).toBeUndefined();
    expect(auditContainsSecret({ token: "sk-abcdefghijk" })).toBe(false);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
    expect(aiMayExecute("automation.enable")).toBe(false);
    expect(aiMayExecute("decision.approve")).toBe(false);
  });
});
