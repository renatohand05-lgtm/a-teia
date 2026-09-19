import { describe, expect, it } from "vitest";
import { COMPANY_NAV, GESTAO_NAV, companyIdFromPath, gestaoHref } from "@/lib/company-nav";
import { APP_NAME, APP_RELEASE, APP_VERSION, buildHealthPayload } from "@/lib/release";
import { FUTURE_NAV, INTELLIGENCE_NAV } from "@/types";

describe("release e health", () => {
  it("expõe versão e release sem sprint hardcoded", () => {
    const payload = buildHealthPayload();
    expect(payload.status).toBe("ok");
    expect(payload.app).toBe(APP_NAME);
    expect(payload.release).toBe(APP_RELEASE);
    expect(payload.version).toBe(APP_VERSION);
    expect(payload.version).toBe("0.8.0");
    expect(payload).not.toHaveProperty("sprint");
    expect(payload.openaiExposed).toBe(false);
  });
});

describe("navegação da empresa", () => {
  it("expõe os módulos publicados no menu da empresa", () => {
    const labels = COMPANY_NAV.flatMap((item) => [item.label, ...(item.children?.map((child) => child.label) ?? [])]);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Diagnóstico",
        "Oportunidades",
        "Execução 30/60/90",
        "Financeiro",
        "DRE",
        "Fluxo de caixa",
        "Metas",
        "Cenários",
        "Experimentos",
        "Evidências",
        "Memória estratégica",
        "Assistente IA",
      ]),
    );
  });

  it("não trata execução e financeiro como módulo futuro", () => {
    const future = FUTURE_NAV.map((item) => item.label);
    expect(future).not.toContain("Execução");
    expect(future).not.toContain("Financeiro & Cenários");
    expect(INTELLIGENCE_NAV.map((item) => item.label)).toContain("Memória Estratégica");
    expect(INTELLIGENCE_NAV.map((item) => item.href)).toContain("/memoria");
    expect(GESTAO_NAV.map((item) => item.key)).toEqual(
      expect.arrayContaining(["diagnostico", "oportunidades", "execucao", "financeiro", "experimentos"]),
    );
    expect(gestaoHref(null, "diagnostico")).toBe("/empresas?modulo=diagnostico");
  });

  it("extrai o id da empresa e ignora /empresas/nova", () => {
    expect(companyIdFromPath("/empresas/cmh123/financeiro/dre")).toBe("cmh123");
    expect(companyIdFromPath("/empresas/nova")).toBeNull();
    expect(companyIdFromPath("/cockpit")).toBeNull();
  });
});
