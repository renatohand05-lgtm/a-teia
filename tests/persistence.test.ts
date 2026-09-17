import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createDiagnosis, getLatestDiagnosis, listDiagnoses } from "@/services/diagnosisService";
import { upsertOnboarding, getOnboarding } from "@/services/onboardingService";
import { getCompany } from "@/services/companyService";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";

const prisma = new PrismaClient();

describe("persistência Sprint 1", () => {
  let companyId = "";
  let ownerId = "";

  it(
    "grava onboarding e diagnóstico no PostgreSQL",
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
        name: `Empresa Sprint 1 Teste ${Date.now()}`,
        segment: "Testes",
      },
    });
    companyId = company.id;

    await upsertOnboarding(ownerId, companyId, {
      name: "Empresa Sprint 1 Teste",
      segment: "Testes",
      city: "Curitiba",
      state: "PR",
      revenueMonthly: 80000,
      averageTicket: 250,
      clientsPerMonth: 320,
      teamSize: 8,
      channels: "loja, WhatsApp",
      estimatedRecurrence: "35%",
      primaryObjective: "Aumentar recorrência",
      perceivedBottleneck: "Atração irregular",
      notes: "Persistência Sprint 1",
    });

    const onboarding = await getOnboarding(ownerId, companyId);
    expect(onboarding?.status).toBe("COMPLETE");
    expect(onboarding?.city).toBe("Curitiba");

    const scores = Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 3])) as Record<
      (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"],
      number
    >;
    scores.attraction = 2;
    scores.finance = 4;

    const idempotencyKey = randomUUID();
    const created = await createDiagnosis(ownerId, companyId, {
      idempotencyKey,
      scores,
    });
    expect(created.overallScore).toBe(60);
    expect(created.bottleneck).toContain("Atração");

    const duplicate = await createDiagnosis(ownerId, companyId, {
      idempotencyKey,
      scores,
    });
    expect(duplicate.id).toBe(created.id);

    const latest = await getLatestDiagnosis(ownerId, companyId);
    expect(latest?.id).toBe(created.id);
    expect((await listDiagnoses(ownerId, companyId)).length).toBe(1);

    const isolated = await getCompany("outro-owner", companyId);
    expect(isolated).toBeNull();
  },
  30_000,
);

  afterAll(async () => {
    if (companyId) {
      await prisma.company.deleteMany({ where: { id: companyId } });
    }
    await prisma.$disconnect();
  }, 20_000);
});
