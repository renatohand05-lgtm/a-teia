import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import { getCockpitSnapshot } from "@/services/cockpitService";
import { createDiagnosis } from "@/services/diagnosisService";
import { createManualOpportunity } from "@/services/opportunityService";

const prisma = new PrismaClient();
const ids: string[] = [];

describe("Cockpit persistido e isolamento", () => {
  it(
    "isola por owner e avança a prioridade com dados reais",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const foreign = await getCockpitSnapshot("owner-inexistente");
      expect(foreign.counts.companiesActive).toBe(0);
      expect(foreign.companies).toHaveLength(0);
      expect(foreign.action.code).toBe("CREATE_COMPANY");
      expect(foreign.journey.every((stage) => stage.status === "SEM_DADOS")).toBe(true);

      const company = await prisma.company.create({
        data: {
          ownerId: user.id,
          name: `Cockpit UX ${Date.now()}`,
          segment: "Testes",
        },
      });
      ids.push(company.id);

      const withCompany = await getCockpitSnapshot(user.id);
      expect(withCompany.companies.some((item) => item.id === company.id)).toBe(true);
      const focusIsNew = withCompany.progress.companyId === company.id;
      if (focusIsNew) {
        expect(withCompany.action.code).toBe("DIAGNOSIS");
        expect(withCompany.action.href).toBe(`/empresas/${company.id}/diagnostico`);
      }

      const scores = Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 3])) as Record<
        (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"],
        number
      >;
      await createDiagnosis(user.id, company.id, { idempotencyKey: randomUUID(), scores });
      await createManualOpportunity(user.id, company.id, {
        title: "Reduzir CMV de peças",
        problemStatement: "Margem pressionada no balcão.",
        hypothesis: "Se renegociar fornecedor, a margem sobe.",
        sourceDimension: "finance",
        expectedImpact: 4,
        urgency: 4,
        effort: 2,
        confidence: 3,
      });

      const after = await getCockpitSnapshot(user.id);
      expect(after.counts.diagnoses).toBeGreaterThan(0);
      const mine = after.companies.find((item) => item.id === company.id);
      expect(mine).toBeTruthy();
      expect(after.journey.every((stage) => stage.href.length > 1 && !stage.href.startsWith("#"))).toBe(true);

      const isolated = await getCockpitSnapshot("outro-owner");
      expect(isolated.companies.some((item) => item.id === company.id)).toBe(false);
      expect(isolated.counts.companiesActive).toBe(0);
    },
    60_000,
  );

  afterAll(async () => {
    if (ids.length) {
      await prisma.company.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }, 20_000);
});
