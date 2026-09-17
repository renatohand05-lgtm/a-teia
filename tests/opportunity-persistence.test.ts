import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createDiagnosis } from "@/services/diagnosisService";
import {
  createManualOpportunity,
  createSuggestedOpportunities,
  getOpportunity,
  listOpportunities,
} from "@/services/opportunityService";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";

const prisma = new PrismaClient();

describe("persistência Sprint 2", () => {
  let companyId = "";
  let ownerId = "";

  it(
    "grava oportunidade sugerida e manual no PostgreSQL",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }
      ownerId = user.id;
      const company = await prisma.company.create({
        data: {
          ownerId,
          name: `Empresa Sprint 2 Teste ${Date.now()}`,
          segment: "Testes",
        },
      });
      companyId = company.id;

      const scores = Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 3])) as Record<
        (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"],
        number
      >;
      scores.attraction = 2;
      scores.finance = 4;

      const diagnosis = await createDiagnosis(ownerId, companyId, {
        idempotencyKey: randomUUID(),
        scores,
      });

      const suggested = await createSuggestedOpportunities(ownerId, companyId, {
        diagnosisId: diagnosis.id,
        templateKeys: ["attraction-digital"],
      });
      expect(suggested).toHaveLength(1);
      expect(suggested[0]?.origin).toBe("SUGGESTED");
      expect(suggested[0]?.evidenceLevel).toBe("HYPOTHESIS");
      expect(suggested[0]?.priorityScore).toBeGreaterThanOrEqual(0);
      expect(suggested[0]?.priorityScore).toBeLessThanOrEqual(100);
      expect(suggested[0]?.reasons.length).toBeGreaterThan(0);

      const duplicate = await createSuggestedOpportunities(ownerId, companyId, {
        diagnosisId: diagnosis.id,
        templateKeys: ["attraction-digital"],
      });
      expect(duplicate[0]?.id).toBe(suggested[0]?.id);

      const manual = await createManualOpportunity(ownerId, companyId, {
        title: "Reduzir CMV com revisão de compras",
        problemStatement: "A margem é pressionada e o CMV não é acompanhado semana a semana.",
        hypothesis: "Se o CMV for lido toda semana, desperdício e precificação ruim aparecem mais cedo.",
        sourceDimension: "finance",
        expectedImpact: 5,
        urgency: 4,
        effort: 3,
        confidence: 3,
        estimatedInvestment: 10000,
        expectedMonthlyReturn: 5000,
        diagnosisId: diagnosis.id,
      });
      expect(manual.origin).toBe("MANUAL");
      expect(manual.paybackMonths).toBe(2);
      expect(manual.scorePartial).toBe(false);

      const ranking = await listOpportunities(ownerId, companyId);
      expect(ranking.length).toBe(2);
      expect(ranking[0]?.priorityScore).toBeGreaterThanOrEqual(ranking[1]?.priorityScore ?? 0);

      const isolated = await getOpportunity("outro-owner", companyId, manual.id);
      expect(isolated).toBeNull();
    },
    45_000,
  );

  afterAll(async () => {
    if (companyId) {
      await prisma.company.deleteMany({ where: { id: companyId } });
    }
    await prisma.$disconnect();
  }, 20_000);
});
