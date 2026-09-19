import { describe, expect, it } from "vitest";
import { JOURNEY_STAGES, nextCockpitAction, emptyCompanyProgress } from "@/lib/cockpit";
import { buildHealthPayload } from "@/lib/release";
import { ALLOCATION_STATUS_LABELS, DECISION_STATUS_LABELS, statusLabel } from "@/lib/status-labels";
import { CENTRAL_NAV, FUTURE_NAV, INTELLIGENCE_NAV, PRIMARY_NAV } from "@/types";

describe("Release 1.0 — jornada e health", () => {
  it("jornada principal tem entrada clara em cada etapa", () => {
    expect(JOURNEY_STAGES.map((item) => item.key)).toEqual([
      "empresa",
      "diagnostico",
      "oportunidade",
      "execucao",
      "financeiro",
      "experimento",
      "evidencia",
      "memoria",
    ]);
    const empty = nextCockpitAction(emptyCompanyProgress());
    expect(empty.cta).toBeTruthy();
    expect(empty.href).toBe("/empresas/nova");
  });

  it("health é 1.0 sem secrets e sem linguagem de sprint", () => {
    const payload = buildHealthPayload();
    expect(payload.release).toBe("1.0");
    expect(payload.version).toBe("1.0.0");
    expect(payload.app).toBe("A TEIA");
    expect(payload.openaiExposed).toBe(false);
    expect(JSON.stringify(payload)).not.toMatch(/Sprint |sk-|tvly-|CRON_SECRET=|DATABASE_URL/);
  });

  it("navegação publicada não esconde módulo operacional em breve", () => {
    expect(PRIMARY_NAV.every((item) => item.enabled)).toBe(true);
    expect(INTELLIGENCE_NAV.every((item) => item.enabled)).toBe(true);
    expect(CENTRAL_NAV.every((item) => item.enabled)).toBe(true);
    expect(FUTURE_NAV.map((item) => item.label)).toEqual(["Conexões", "Estratégia"]);
  });

  it("status de alocação e decisão aparecem em português", () => {
    expect(statusLabel("SIMULATION", ALLOCATION_STATUS_LABELS)).toBe("Simulação");
    expect(statusLabel("PROPOSAL", ALLOCATION_STATUS_LABELS)).toBe("Proposta");
    expect(statusLabel("APPROVED", ALLOCATION_STATUS_LABELS)).toBe("Aprovado");
    expect(statusLabel("PENDING_HUMAN_APPROVAL", DECISION_STATUS_LABELS)).toBe("Pendente");
    expect(statusLabel("REJECTED", DECISION_STATUS_LABELS)).toBe("Rejeitado");
  });
});
