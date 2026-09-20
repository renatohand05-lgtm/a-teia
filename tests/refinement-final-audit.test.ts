import { describe, expect, it } from "vitest";
import { buildAuditSearch, parseAuditUrlFilters } from "@/lib/audit-ui";
import { companyBreadcrumbTrail } from "@/lib/company-nav";
import { MEMORY_POLARITY_LABELS } from "@/lib/memory-engine";
import { friendlyIntegrationMessage } from "@/lib/integrations";

describe("Refinamento 11 — auditoria final", () => {
  it("breadcrumb de DRE não mostra ID técnico", () => {
    const crumbs = companyBreadcrumbTrail("/empresas/emp-1/financeiro/dre", "emp-1", "J BURGUERS", "DRE gerencial");
    expect(crumbs.map((item) => item.label)).toEqual(["Empresas", "J BURGUERS", "Financeiro", "DRE"]);
    expect(crumbs.every((item) => !item.label.includes("emp-1"))).toBe(true);
  });

  it("filtros da auditoria persistem na URL", () => {
    expect(buildAuditSearch({ empresa: "c1", categoria: "alert" })).toBe("/auditoria?empresa=c1&categoria=alert");
    expect(parseAuditUrlFilters({ empresa: "c1", categoria: " " }).empresa).toBe("c1");
    expect(parseAuditUrlFilters({ empresa: "c1", categoria: " " }).categoria).toBeUndefined();
  });

  it("memória não diz que funcionou sem evidência", () => {
    expect(MEMORY_POLARITY_LABELS.POSITIVE).toBe("Resultado positivo");
    expect(MEMORY_POLARITY_LABELS.NEGATIVE).toBe("Resultado negativo");
    expect(Object.values(MEMORY_POLARITY_LABELS).join(" ")).not.toMatch(/Funcionou|Sucesso/);
  });

  it("erro de integração não cita provedor técnico", () => {
    expect(friendlyIntegrationMessage("TAVILY_MISSING")).not.toMatch(/Tavily|OpenAI|Prisma|PostgreSQL/i);
    expect(friendlyIntegrationMessage("OPENAI_PROVIDER_ERROR")).not.toMatch(/OpenAI|Tavily/i);
  });
});
