import { afterAll, describe, expect, it } from "vitest";
import { AllocationStatus, PrismaClient } from "@prisma/client";
import {
  assertOwnedAllocationIds,
  reviewAllocationProposal,
  sendAllocationToDecision,
  simulateAllocation,
} from "@/services/allocationService";
import { approveDecision } from "@/services/decisionService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const proposalIds: string[] = [];

describe("Sprint 10 persistência e isolamento", () => {
  it(
    "isola companyId/opportunityId, protege concorrência e exige aprovação humana",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      await expect(assertOwnedAllocationIds("owner-sprint10-inexistente", { companyId: "cmp_x" })).rejects.toThrow(/não encontrada/i);

      const company = await prisma.company.create({
        data: { ownerId: user.id, name: `Sprint10 ${Date.now()}`, segment: "Restaurante" },
      });
      companyIds.push(company.id);

      const opportunity = await prisma.opportunity.create({
        data: {
          companyId: company.id,
          createdById: user.id,
          title: "Cardápio enxuto",
          investment: 25000,
          estimatedHours: 40,
          expectedReturn: 8000,
          paybackMonths: 4,
          expectedImpact: 4,
          urgency: 4,
          score: 88,
          status: "ACTIVE",
        },
      });

      await expect(assertOwnedAllocationIds("outro-owner", { companyId: company.id })).rejects.toThrow(/não encontrada/i);
      await expect(assertOwnedAllocationIds("outro-owner", { opportunityId: opportunity.id })).rejects.toThrow(/não encontrada/i);
      await expect(assertOwnedAllocationIds(user.id, { companyId: company.id, opportunityId: opportunity.id })).resolves.toBeUndefined();

      const simulated = await simulateAllocation(user.id, {
        capitalAvailable: 100000,
        hoursAvailable: 200,
        capacityLimit: 4,
        reserveMinimum: 30000,
        horizon: "DAYS_90",
        scenario: "BALANCEADO",
      });
      proposalIds.push(simulated.proposalId);
      expect(simulated.result.capitalPreservedCents).not.toBeNull();
      expect(simulated.result.allocated.every((item) => item.companyId === company.id || item.companyId)).toBe(true);

      const stale = new Date(Date.now() - 60_000).toISOString();
      await expect(
        reviewAllocationProposal({ ownerId: user.id, proposalId: simulated.proposalId, expectedUpdatedAt: stale }),
      ).rejects.toThrow(/outra sessão/i);

      const current = await prisma.allocationProposal.findUnique({ where: { id: simulated.proposalId } });
      const reviewed = await reviewAllocationProposal({
        ownerId: user.id,
        proposalId: simulated.proposalId,
        expectedUpdatedAt: current!.updatedAt.toISOString(),
      });
      expect(reviewed.status).toBe(AllocationStatus.PROPOSAL);

      await expect(sendAllocationToDecision({ ownerId: "outro-owner", proposalId: simulated.proposalId })).rejects.toThrow(
        /não encontrada/i,
      );

      const fresh = await prisma.allocationProposal.findUnique({ where: { id: simulated.proposalId } });
      const sent = await sendAllocationToDecision({
        ownerId: user.id,
        proposalId: simulated.proposalId,
        expectedUpdatedAt: fresh!.updatedAt.toISOString(),
      });
      expect(sent.decisionId).toBeTruthy();

      await expect(approveDecision({ actorId: "outro-owner", decisionId: sent.decisionId })).rejects.toThrow(/não encontrada/i);

      const decision = await prisma.decision.findUnique({ where: { id: sent.decisionId } });
      expect(decision?.requiresHumanApproval).toBe(true);
      expect(decision?.status).toBe("PENDING_HUMAN_APPROVAL");

      const second = await simulateAllocation(user.id, {
        capitalAvailable: 70000,
        hoursAvailable: 200,
        horizon: "DAYS_90",
        scenario: "CONSERVADOR",
      });
      proposalIds.push(second.proposalId);
      const approvedStill = await prisma.allocationProposal.findUnique({ where: { id: simulated.proposalId } });
      expect(approvedStill?.status).toBe(AllocationStatus.SENT_TO_DECISION);
      expect(second.version).toBeGreaterThan(simulated.version);
    },
    60_000,
  );

  afterAll(async () => {
    if (proposalIds.length) await prisma.allocationProposal.deleteMany({ where: { id: { in: proposalIds } } });
    if (companyIds.length) await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.$disconnect();
  }, 20_000);
});
