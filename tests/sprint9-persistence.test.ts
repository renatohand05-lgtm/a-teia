import { afterAll, describe, expect, it } from "vitest";
import { AuditSource, PrismaClient } from "@prisma/client";
import { approveDecision, proposeDecision } from "@/services/decisionService";
import { getCockpitSnapshot } from "@/services/cockpitService";

const prisma = new PrismaClient();
const ids: string[] = [];

describe("Sprint 9 persistência e isolamento", () => {
  it(
    "isola cockpit e bloqueia decisão de outro owner",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const foreign = await getCockpitSnapshot("owner-sprint9-inexistente");
      expect(foreign.portfolio.portfolio).toHaveLength(0);
      expect(foreign.portfolio.priorities).toHaveLength(0);
      expect(foreign.portfolio.consolidation.revenue).toBeNull();

      const company = await prisma.company.create({
        data: { ownerId: user.id, name: `Sprint9 ${Date.now()}`, segment: "Restaurante" },
      });
      ids.push(company.id);

      const snapshot = await getCockpitSnapshot(user.id);
      expect(snapshot.companies.some((item) => item.id === company.id)).toBe(true);
      expect(snapshot.portfolio.inputs.some((item) => item.id === company.id)).toBe(true);
      expect(snapshot.portfolio.inputs.filter((item) => item.id === company.id).every((item) => item.name === company.name)).toBe(true);

      const decision = await proposeDecision({
        createdById: user.id,
        companyId: company.id,
        title: "Aprovar plano-piloto",
        rationale: "Exige confirmação humana.",
        origin: AuditSource.AI,
      });
      expect(decision.requiresHumanApproval).toBe(true);
      expect(decision.status).toBe("PENDING_HUMAN_APPROVAL");

      await expect(approveDecision({ actorId: "outro-owner", decisionId: decision.id })).rejects.toThrow(/não encontrada/i);

      const isolated = await getCockpitSnapshot("outro-owner");
      expect(isolated.companies.some((item) => item.id === company.id)).toBe(false);
      expect(isolated.portfolio.decisions.some((item) => item.id === decision.id)).toBe(false);
    },
    60_000,
  );

  afterAll(async () => {
    if (ids.length) await prisma.company.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }, 20_000);
});
