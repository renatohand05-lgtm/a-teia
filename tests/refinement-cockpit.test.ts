import { describe, expect, it } from "vitest";
import { formatBRL } from "@/lib/format";
import {
  SIDEBAR_HREFS,
  coverageLabel,
  displayPriorityScore,
  priorityLevelLabel,
  showCountBadge,
  signalKindLabel,
} from "@/lib/cockpit-ui";
import { CENTRAL_NAV, FUTURE_NAV, INTELLIGENCE_NAV, PRIMARY_NAV } from "@/types";

describe("Refinamento 1 — Cockpit e navegação", () => {
  it("sidebar publica rotas reais e em breve só o que não existe", () => {
    expect(PRIMARY_NAV.map((item) => item.href)).toEqual(["/cockpit", "/empresas"]);
    expect(INTELLIGENCE_NAV.map((item) => item.href)).toEqual(["/memoria", "/conexoes", "/estrategias", "/playbooks", "/assistente"]);
    expect(CENTRAL_NAV.map((item) => item.href)).toEqual([
      "/cockpit#cockpit-prioridades",
      "/cockpit#cockpit-decisoes",
      "/alocacao",
      "/automacoes",
      "/alertas",
      "/auditoria",
    ]);
    expect(FUTURE_NAV).toEqual([]);
    expect(SIDEBAR_HREFS).toEqual(expect.arrayContaining(["/cockpit", "/empresas", "/alocacao", "/automacoes"]));
  });

  it("badge some quando a quantidade é zero", () => {
    expect(showCountBadge(0)).toBe(false);
    expect(showCountBadge(3)).toBe(true);
    expect(showCountBadge(undefined)).toBe(false);
  });

  it("score ausente não vira zero", () => {
    expect(displayPriorityScore(undefined, false)).toEqual({ value: null, caption: "Sem dados" });
    expect(displayPriorityScore(40, true)).toEqual({ value: 40, caption: "Score de prioridade" });
  });

  it("labels de prioridade e cobertura ficam em português", () => {
    expect(priorityLevelLabel("CRITICA")).toBe("Crítica");
    expect(priorityLevelLabel("ALTA")).toBe("Alta");
    expect(signalKindLabel("FINANCIAL")).toBe("Financeiro");
    expect(coverageLabel(1, 1, "receita")).toBe("1/1 empresas com receita");
    expect(coverageLabel(0, 0, "receita")).toBe("Sem empresas");
  });

  it("zero real não é tratado como ausência de dado", () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
    expect(formatBRL(null)).toBe("—");
    expect(formatBRL(undefined)).toBe("—");
  });

  it("âncoras do Cockpit e rotas centrais existem", () => {
    expect(CENTRAL_NAV.map((item) => item.href)).toEqual(
      expect.arrayContaining(["/cockpit#cockpit-prioridades", "/cockpit#cockpit-decisoes", "/auditoria"]),
    );
    expect(SIDEBAR_HREFS).not.toContain("#");
  });
});
