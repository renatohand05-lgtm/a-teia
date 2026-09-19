import { describe, expect, it } from "vitest";
import {
  calculatePaybackMonths,
  calculatePriorityScore,
  EVIDENCE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  PRIORITY_WEIGHTS,
} from "@/lib/opportunity-score";
import {
  DISPLAY_ORIGIN_LABELS,
  displayEvidence,
  displayOpportunityStatus,
  displayOrigin,
  displayPaybackMonths,
  isHypothesis,
  opportunityNextAction,
  SCORE_FACTORS,
  scoreBadgeLabel,
  scorePartialNote,
  whyThisScore,
} from "@/lib/opportunity-ui";
import { displayAverageProgress, displayPlanProgress, groupExecutionTasks, HORIZON_PHASES } from "@/lib/execution-ui";
import { decisionStatusLabel, executionProgress } from "@/lib/execution";
import { DECISION_STATUS_LABELS, statusLabel } from "@/lib/status-labels";
import { formatBRL } from "@/lib/format";
import { canAccessCompany } from "@/lib/access-policy";
import { aiMayExecute } from "@/lib/security/critical-actions";
import { isAllowedProposedAction } from "@/lib/ai-executive-engine";

describe("Refinamento 4 — Score e oportunidades", () => {
  it("preserva pesos e fatores oficiais do motor", () => {
    expect(PRIORITY_WEIGHTS).toEqual({
      severity: 0.25,
      impact: 0.2,
      urgency: 0.2,
      confidence: 0.15,
      speed: 0.1,
      ease: 0.1,
    });
    expect(SCORE_FACTORS.map((item) => item.label)).toEqual([
      "Severidade",
      "Impacto",
      "Urgência",
      "Confiança",
      "Velocidade",
      "Facilidade",
    ]);
  });

  it("identifica score parcial sem inventar payback", () => {
    const result = calculatePriorityScore({
      dimensionScore: 2,
      expectedImpact: 4,
      urgency: 4,
      confidence: 3,
      effort: 2,
    });
    expect(result.partial).toBe(true);
    expect(result.paybackMonths).toBeNull();
    expect(scoreBadgeLabel(true)).toBe("Score parcial");
    expect(scorePartialNote(true)).toBe("Alguns dados ainda não estão disponíveis.");
    expect(displayPaybackMonths(null)).toBe("Não calculado");
    expect(whyThisScore(82)).toBe("Por que esta oportunidade tem score 82?");
  });

  it("mostra payback real e nunca transforma ausência em zero", () => {
    expect(calculatePaybackMonths(10_000, 5_000)).toBe(2);
    expect(displayPaybackMonths(2)).toBe("2 meses");
    expect(displayPaybackMonths(1)).toBe("1 mês");
    expect(calculatePaybackMonths(null, 1000)).toBeNull();
    expect(formatBRL(null)).toBe("—");
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
  });

  it("traduz origem, status e evidência sem enum técnico", () => {
    expect(displayOrigin("SUGGESTED")).toBe("Diagnóstico 360°");
    expect(displayOrigin("MANUAL")).toBe("Manual");
    expect(DISPLAY_ORIGIN_LABELS.SUGGESTED).toBe("Diagnóstico 360°");
    expect(displayOpportunityStatus("ACTIVE")).toBe("Ativa");
    expect(displayOpportunityStatus("IN_PROGRESS")).toBe("Em execução");
    expect(displayOpportunityStatus("ARCHIVED")).toBe("Arquivada");
    expect(displayEvidence("HYPOTHESIS")).toBe("Hipótese");
    expect(displayEvidence("TESTING")).toBe("Em teste");
    expect(displayEvidence("VALIDATED_EVIDENCE")).toBe("Evidência validada");
    expect(Object.values(OPPORTUNITY_STATUS_LABELS).join(" ")).not.toMatch(/OpportunityStatus/);
    expect(Object.values(EVIDENCE_LABELS).join(" ")).not.toMatch(/EvidenceLevel/);
  });

  it("mantém oportunidade como hipótese até validação e aponta próximo passo único", () => {
    expect(isHypothesis("HYPOTHESIS")).toBe(true);
    expect(isHypothesis("VALIDATED_EVIDENCE")).toBe(false);
    expect(
      opportunityNextAction(
        { id: "op-1", status: "ACTIVE", evidenceLevel: "HYPOTHESIS", queuedForPlan: false, experimentCount: 0 },
        "emp-1",
      ),
    ).toMatchObject({ kind: "experiment", label: "Criar experimento" });
    expect(
      opportunityNextAction(
        { id: "op-1", status: "ACTIVE", evidenceLevel: "HYPOTHESIS", queuedForPlan: true, experimentCount: 0 },
        "emp-1",
      ).kind,
    ).toBe("plan");
    expect(
      opportunityNextAction(
        { id: "op-1", status: "IN_PROGRESS", evidenceLevel: "TESTING", queuedForPlan: false, experimentCount: 1 },
        "emp-1",
      ).kind,
    ).toBe("execution");
    expect(
      opportunityNextAction(
        { id: "op-1", status: "DRAFT", evidenceLevel: "HYPOTHESIS", queuedForPlan: false, experimentCount: 0 },
        "emp-1",
      ).kind,
    ).toBe("activate");
  });
});

describe("Refinamento 4 — Decisões", () => {
  it("preserva aprovação humana e estados existentes", () => {
    expect(statusLabel("PENDING_HUMAN_APPROVAL", DECISION_STATUS_LABELS)).toBe("Pendente");
    expect(statusLabel("DEFERRED", DECISION_STATUS_LABELS)).toBe("Adiada");
    expect(decisionStatusLabel("DEFERRED")).toBe("Adiada");
    expect(decisionStatusLabel("REJECTED")).toBe("Rejeitada");
    expect(aiMayExecute("decision.approve")).toBe(false);
    expect(aiMayExecute("decision.reject")).toBe(false);
    expect(isAllowedProposedAction("CREATE_PLAN")).toBe(true);
    expect(isAllowedProposedAction("APPROVE_DECISION")).toBe(false);
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
  });
});

describe("Refinamento 4 — Execução 30/60/90", () => {
  it("não mostra 0% quando o plano ainda não tem tarefas", () => {
    const empty = displayPlanProgress([]);
    expect(empty.percent).toBeNull();
    expect(empty.label).toBe("Plano ainda sem tarefas.");
    expect(executionProgress([])).toBe(0);
    expect(displayAverageProgress(0, 0)).toBe("—");
  });

  it("deriva progresso das tarefas reais e marca atraso", () => {
    const started = displayPlanProgress(["DONE", "TODO", "TODO"]);
    expect(started.percent).toBe(33);
    expect(started.label).toBe("1 de 3 concluídas");
    const now = new Date("2026-09-19T12:00:00.000Z");
    const groups = groupExecutionTasks(
      [
        { status: "IN_PROGRESS", dueAt: "2026-09-20T12:00:00.000Z" },
        { status: "TODO", dueAt: "2026-09-18T12:00:00.000Z", overdue: true },
        { status: "TODO", dueAt: "2026-09-21T12:00:00.000Z" },
        { status: "DONE", dueAt: "2026-09-10T12:00:00.000Z" },
      ],
      now,
    );
    expect(groups.overdue).toHaveLength(1);
    expect(groups.inProgress).toHaveLength(1);
    expect(groups.upcoming).toHaveLength(1);
    expect(groups.done).toHaveLength(1);
    expect(HORIZON_PHASES.map((item) => item.days)).toEqual([30, 60, 90]);
  });
});
