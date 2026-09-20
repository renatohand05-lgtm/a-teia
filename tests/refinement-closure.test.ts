import { describe, expect, it } from "vitest";
import {
  ALERT_STATUS_FILTERS,
  alertActionFeedback,
  filterAlertInbox,
  matchesAlertSeverity,
  matchesAlertStatus,
} from "@/lib/alert-inbox";
import { auditOriginLabel, presentAuditMetadata } from "@/lib/audit-detail";
import {
  competenceMonthsForPeriod,
  inPeriodWindow,
  matchesCompetence,
  parseCockpitPeriod,
  periodAffectsMetric,
  periodWindow,
} from "@/lib/cockpit-period";
import { humanReasonRequired, normalizeHumanReason } from "@/lib/decision-reason";
import { nextFocusIndex, shouldCloseOnEscape, shouldTrapTab, trapTabKey } from "@/lib/focus-trap";
import { formatBRL } from "@/lib/format";
import { sanitizeAuditValue } from "@/lib/security/sanitize";
import { alertStatusLabel } from "@/lib/automation-ui";
import { COMPANY_STATUS_LABELS, DECISION_STATUS_LABELS } from "@/lib/status-labels";

describe("Refinamento 10 — fechamento funcional", () => {
  it("focus trap cicla TAB e reconhece ESC", () => {
    expect(shouldTrapTab("Tab")).toBe(true);
    expect(shouldTrapTab("Enter")).toBe(false);
    expect(shouldCloseOnEscape("Escape")).toBe(true);
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
    const first = { focus: () => undefined };
    const last = { focus: () => undefined };
    const root = { querySelectorAll: () => [first, last] };
    const event = { key: "Tab", shiftKey: false, preventDefault() {} };
    expect(trapTabKey(event, root, last)).toBe(true);
  });

  it("filtro de período usa competência mensal sem misturar métricas estruturais", () => {
    expect(parseCockpitPeriod(undefined)).toBe("atual");
    expect(parseCockpitPeriod("90d")).toBe("90d");
    const now = new Date(2026, 8, 19);
    expect(competenceMonthsForPeriod("atual", now)).toEqual([{ periodMonth: 9, periodYear: 2026 }]);
    expect(competenceMonthsForPeriod("anterior", now)).toEqual([{ periodMonth: 8, periodYear: 2026 }]);
    expect(matchesCompetence({ periodMonth: 9, periodYear: 2026 }, "atual", now)).toBe(true);
    expect(matchesCompetence({ periodMonth: 8, periodYear: 2026 }, "atual", now)).toBe(false);
    expect(competenceMonthsForPeriod("30d", now).some((item) => item.periodMonth === 8)).toBe(true);
    expect(periodAffectsMetric("finance")).toBe(true);
    expect(periodAffectsMetric("companies")).toBe(false);
    expect(periodAffectsMetric("memories")).toBe(false);
    const window = periodWindow("anterior", now);
    expect(inPeriodWindow(new Date(2026, 7, 10), "anterior", now)).toBe(true);
    expect(inPeriodWindow(new Date(2026, 8, 10), "anterior", now)).toBe(false);
    expect(window.from.getMonth()).toBe(7);
  });

  it("zero real continua distinto de ausência de dados", () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
    expect(formatBRL(null)).toBe("—");
    expect(formatBRL(undefined)).toBe("—");
  });

  it("justificativa é opcional, limitada e nunca inventada", () => {
    expect(humanReasonRequired()).toBe(false);
    expect(normalizeHumanReason("  Payback inferior a 3 meses  ")).toBe("Payback inferior a 3 meses");
    expect(normalizeHumanReason("")).toBeNull();
    expect(normalizeHumanReason("x".repeat(400))?.length).toBe(280);
  });

  it("inbox filtra status e severidade com labels consistentes", () => {
    const items = [
      { status: "OPEN", priority: "CRITICO" },
      { status: "ACKNOWLEDGED", priority: "MEDIO" },
      { status: "RESOLVED", priority: "BAIXO" },
      { status: "DISMISSED", priority: "ALTO" },
    ];
    expect(filterAlertInbox(items, "novos", "todos")).toHaveLength(1);
    expect(filterAlertInbox(items, "atencao", "todos")).toHaveLength(1);
    expect(filterAlertInbox(items, "resolvidos", "todos")).toHaveLength(2);
    expect(filterAlertInbox(items, "todos", "critico")).toHaveLength(1);
    expect(matchesAlertStatus("OPEN", "novos")).toBe(true);
    expect(matchesAlertSeverity("BAIXO", "informativo")).toBe(true);
    expect(ALERT_STATUS_FILTERS.map((item) => item.label)).toEqual(["Todos", "Novos", "Atenção", "Resolvidos"]);
    expect(alertStatusLabel("OPEN")).toBe("Aberto");
    expect(alertStatusLabel("ACKNOWLEDGED")).toBe("Reconhecido");
    expect(alertActionFeedback("acknowledged")).toBe("Alerta reconhecido.");
    expect(COMPANY_STATUS_LABELS.ARCHIVED).toBe("Arquivada");
    expect(DECISION_STATUS_LABELS.APPROVED).toBe("Aprovado");
  });

  it("auditoria apresenta metadata sanitizada sem secrets", () => {
    const rows = presentAuditMetadata({
      status: "APPROVED",
      humanReason: "Risco controlado",
      password: "secret",
      token: "abc",
      apiKey: "sk-abcdefghijk",
      nested: { cookie: "x", ok: true },
    });
    expect(rows.some((item) => item.key === "humanReason")).toBe(true);
    expect(rows.some((item) => /password|token|apiKey/i.test(item.key))).toBe(false);
    expect(sanitizeAuditValue({ openai_api_key: "sk-abcdefghijk", title: "ok" })).toEqual({ title: "ok" });
    expect(auditOriginLabel("USER")).toBe("Usuário");
  });
});
