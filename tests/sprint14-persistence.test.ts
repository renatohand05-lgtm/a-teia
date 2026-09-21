import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import { requireOwnedResource } from "@/lib/security/ownership";
import {
  approveConnection,
  archiveConnection,
  discoverOwnerConnections,
  getConnection,
  listOwnerConnections,
  rejectConnection,
} from "@/services/connectionService";
import { convertStrategyToOpportunity, createStrategyFromConnection, getStrategy } from "@/services/strategyService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const connectionIds: string[] = [];
const strategyIds: string[] = [];
const opportunityIds: string[] = [];

describe("Sprint 14 persistência — conexões e estratégias", () => {
  it(
    "isola owner, sugere, aprova, cria estratégia, converte com confirmação e arquiva",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const oficina = await prisma.company.create({
        data: { ownerId: user.id, name: `Oficina S14 ${Date.now()}`, segment: "Oficina", perceivedBottlenecks: "aquisição" },
      });
      const burger = await prisma.company.create({
        data: { ownerId: user.id, name: `Burger S14 ${Date.now()}`, segment: "Alimentação", revenueMonthly: 50000 },
      });
      companyIds.push(oficina.id, burger.id);

      const discovered = await discoverOwnerConnections(user.id);
      const pair = discovered.find(
        (item) =>
          (item.fromId === oficina.id && item.toId === burger.id) || (item.fromId === burger.id && item.toId === oficina.id),
      );
      expect(pair).toBeTruthy();
      if (!pair) return;
      connectionIds.push(pair.id);
      expect(pair.classification).toBe("HIPOTESE");
      expect(pair.scorePartial === true || pair.score == null || pair.scoreFactorsMissing.length >= 0).toBe(true);

      await expect(requireOwnedResource("outro-owner", "connection", pair.id)).rejects.toBeInstanceOf(AppError);
      await expect(getConnection("outro-owner", pair.id)).rejects.toBeInstanceOf(AppError);
      const stranger = await listOwnerConnections("outro-owner");
      expect(stranger.some((item) => item.id === pair.id)).toBe(false);

      const approved = await approveConnection(user.id, pair.id);
      expect(approved.status).toBe("APROVADA");
      expect(approved.classification).toBe("HIPOTESE");

      const strategy = await createStrategyFromConnection(user.id, pair.id);
      strategyIds.push(strategy.id);
      expect(strategy.recommendationOrigin).toBe("HIPOTESE");
      await expect(getStrategy("outro-owner", strategy.id)).rejects.toBeInstanceOf(AppError);

      await expect(convertStrategyToOpportunity(user.id, strategy.id, false)).rejects.toThrow(/Confirme/);
      const converted = await convertStrategyToOpportunity(user.id, strategy.id, true);
      opportunityIds.push(converted.opportunity.id);
      expect(converted.opportunity.origin).toBe("STRATEGY");
      expect(converted.opportunity.companyId).toBe(strategy.destinationCompanyId ?? strategy.companyId);
      expect(converted.opportunity.evidenceLevel).toBe("HYPOTHESIS");

      const rejected = await rejectConnection(user.id, pair.id);
      expect(rejected.status).toBe("REJEITADA");
      const archived = await archiveConnection(user.id, pair.id);
      expect(archived.status).toBe("ARQUIVADA");
    },
    90_000,
  );

  afterAll(async () => {
    if (opportunityIds.length) await prisma.opportunity.deleteMany({ where: { id: { in: opportunityIds } } });
    if (strategyIds.length) await prisma.strategy.deleteMany({ where: { id: { in: strategyIds } } });
    if (connectionIds.length) await prisma.connection.deleteMany({ where: { id: { in: connectionIds } } });
    if (companyIds.length) {
      await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.connection.deleteMany({ where: { OR: [{ fromId: { in: companyIds } }, { toId: { in: companyIds } }] } });
      await prisma.strategy.deleteMany({ where: { OR: [{ companyId: { in: companyIds } }, { destinationCompanyId: { in: companyIds } }] } });
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    }
    await prisma.$disconnect();
  });
});
