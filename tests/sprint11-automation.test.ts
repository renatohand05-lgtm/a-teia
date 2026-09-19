import { describe, expect, it } from "vitest";
import { canAccessCompany } from "@/lib/access-policy";
import {
  AUTOMATION_LIMITS,
  aiMayCreateAutomationSilently,
  aiMayEnableAutomation,
  canManageAutomations,
  shouldRetry,
} from "@/lib/automation-config";
import {
  AUTOMATION_TEMPLATES,
  alertIdempotencyKey,
  composeDailyBriefing,
  composeWeeklySummary,
  evaluateCondition,
  evaluatePortfolio,
  evaluateTemplate,
  executionIdempotencyKey,
  isAutomationQuestion,
  parseAutomationPrompt,
  shouldSuppress,
  type CompanyFacts,
} from "@/lib/automation-rules-engine";
import { authorizeCronRequest, isSchedulerConfigured } from "@/lib/cron-auth";
import { DEFAULT_AUTOMATION_TIMEZONE } from "@/lib/automation-config";
import { slotKey, zonedParts } from "@/lib/timezone";
import { buildHealthPayload } from "@/lib/release";

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

const cmv = AUTOMATION_TEMPLATES.find((item) => item.key === "cmv_above_target")!;
const ebitda = AUTOMATION_TEMPLATES.find((item) => item.key === "ebitda_negative")!;
const overdue = AUTOMATION_TEMPLATES.find((item) => item.key === "task_overdue")!;
const experiment = AUTOMATION_TEMPLATES.find((item) => item.key === "experiment_stale")!;
const decision = AUTOMATION_TEMPLATES.find((item) => item.key === "decision_pending")!;
const financeStale = AUTOMATION_TEMPLATES.find((item) => item.key === "finance_stale")!;
const allocation = AUTOMATION_TEMPLATES.find((item) => item.key === "allocation_pending")!;
const briefing = AUTOMATION_TEMPLATES.find((item) => item.key === "daily_briefing")!;

describe("regras determinísticas", () => {
  it("avalia CMV, EBITDA, tarefa, experimento, decisão e alocação", () => {
    expect(evaluateTemplate(cmv, facts())?.message).toMatch(/CMV/);
    expect(evaluateTemplate(ebitda, facts({ ebitda: -10 }))?.priority).toBe("ALTO");
    expect(evaluateTemplate(ebitda, facts({ ebitda: 10 }))).toBeNull();
    expect(evaluateTemplate(overdue, facts({ overdueTaskCount: 2 }))?.ruleKey).toBe("task_overdue");
    expect(evaluateTemplate(experiment, facts({ experimentStaleCount: 1 }))?.ruleKey).toBe("experiment_stale");
    expect(evaluateTemplate(decision, facts({ pendingDecisionDays: 4 }))?.ruleKey).toBe("decision_pending");
    expect(evaluateTemplate(allocation, facts({ allocationPendingDays: 2 }))?.ruleKey).toBe("allocation_pending");
  });

  it("não dispara alerta financeiro com dado ausente", () => {
    expect(evaluateTemplate(cmv, facts({ cogsPercent: null, cogsTarget: 28 }))).toBeNull();
    expect(evaluateTemplate(ebitda, facts({ ebitda: null }))).toBeNull();
    expect(evaluateCondition({ metric: "ebitda", operator: "lt", threshold: 0 }, null).missing).toBe(true);
    expect(evaluateCondition({ metric: "ebitda", operator: "lt", threshold: 0 }, null).hit).toBe(false);
    const gap = evaluateTemplate(financeStale, facts({ financeUpdatedAt: null, financeAgeDays: null }));
    expect(gap?.dataGap).toBe(true);
  });
});

describe("deduplicação, cooldown e resolução", () => {
  it("gera chave idempotente e suprime repetição no cooldown", () => {
    const a = alertIdempotencyKey({ ownerId: "o1", ruleKey: "cmv_above_target", companyId: "emp-1", slot: "2026-09-18" });
    const b = alertIdempotencyKey({ ownerId: "o1", ruleKey: "cmv_above_target", companyId: "emp-1", slot: "2026-09-18" });
    expect(a).toBe(b);
    expect(executionIdempotencyKey({ mode: "cron", ownerId: "o1", automationId: "auto-1", slot: "2026-09-18" })).toContain("cron:");
    expect(shouldSuppress({ openOrAck: true, lastDetectedAt: new Date().toISOString(), cooldownHours: 24 })).toBe(true);
    expect(shouldSuppress({ openOrAck: false, lastDetectedAt: null, cooldownHours: 24 })).toBe(false);
  });
});

describe("briefing, retry, IA e isolamento", () => {
  it("gera briefing/resumo sem causalidade e sem ligar automação", () => {
    const daily = composeDailyBriefing({
      priorities: ["CMV acima da meta"],
      alerts: ["CMV"],
      overdueTasks: 2,
      pendingDecisions: 1,
      staleExperiments: 1,
      financeOff: ["J BURGUERS CMV"],
      changes: ["Financeiro atualizado"],
    });
    expect(daily).toMatch(/BRIEFING DETERMINÍSTICO/);
    expect(composeWeeklySummary({
      changed: ["Nova oportunidade"],
      improved: ["Receita"],
      worsened: [],
      pendingDecisions: 1,
      priorities: ["CMV"],
      experiments: ["J BURGUERS"],
      execution: "2 vencidas",
      finance: "CMV",
    })).toMatch(/Sem inferir causalidade/);
    expect(aiMayEnableAutomation()).toBe(false);
    expect(aiMayCreateAutomationSilently()).toBe(false);
    const proposal = parseAutomationPrompt("Me avise se CMV passar de 32%.");
    expect(proposal?.requiresConfirmation).toBe(true);
    expect(proposal?.condition.threshold).toBe(32);
    expect(isAutomationQuestion("Quais alertas tenho hoje?")).toBe(true);
    expect(canAccessCompany("a", "b")).toBe(false);
    expect(canManageAutomations("owner")).toBe(true);
    expect(shouldRetry("VALIDATION")).toBe(false);
    expect(shouldRetry("PROVIDER")).toBe(true);
    expect(AUTOMATION_LIMITS.maxPerOwner).toBeLessThan(100);
  });
});

describe("timezone, cron e health", () => {
  it("usa timezone do projeto e protege o cron", () => {
    expect(DEFAULT_AUTOMATION_TIMEZONE).toBe("America/Sao_Paulo");
    expect(zonedParts(new Date("2026-09-18T14:00:00.000Z")).isoDate).toMatch(/2026-09-18/);
    expect(slotKey(new Date("2026-09-18T14:00:00.000Z"), "DAILY")).toBeTruthy();
    const denied = authorizeCronRequest(new Request("https://a-teia.vercel.app/api/cron/automations"));
    expect(denied).toBe(false);
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-cron-secret";
    expect(isSchedulerConfigured()).toBe(true);
    expect(authorizeCronRequest(new Request("https://x", { headers: { authorization: "Bearer test-cron-secret" } }))).toBe(true);
    expect(authorizeCronRequest(new Request("https://x", { headers: { authorization: "Bearer other" } }))).toBe(false);
    const health = buildHealthPayload();
    expect(health.automationEngine).toBe("ok");
    expect(JSON.stringify(health)).not.toContain("test-cron-secret");
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});

describe("portfólio e templates", () => {
  it("avalia todas as empresas e não inventa valor", () => {
    const hits = evaluatePortfolio(cmv, [facts(), facts({ companyId: "emp-2", companyName: "Oficina", cogsPercent: 22, cogsTarget: 28 })]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.companyName).toBe("J BURGUERS");
    expect(evaluateTemplate(briefing, facts())?.kind).toBe("RESUMO");
    expect(AUTOMATION_TEMPLATES.map((item) => item.key)).toEqual(
      expect.arrayContaining(["cmv_above_target", "daily_briefing", "weekly_summary", "allocation_pending"]),
    );
  });
});
