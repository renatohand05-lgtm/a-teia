import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createDiagnosis } from "@/services/diagnosisService";
import { createManualOpportunity } from "@/services/opportunityService";
import {
  completeExperiment,
  createExperiment,
  startExperiment,
} from "@/services/experimentService";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import {
  approveMemory,
  createObservation,
  getMemory,
  getOpportunityMemoryPreview,
  listCompanyMemories,
  listOwnerMemories,
  proposeMemoryFromEvidence,
  rejectMemory,
} from "@/services/memoryService";

const prisma = new PrismaClient();
const ids: string[] = [];

async function seedCompany(ownerId: string, name: string, segment: string) {
  const company = await prisma.company.create({
    data: { ownerId, name: `${name} ${Date.now()}`, segment, teamSize: 8, units: 1 },
  });
  ids.push(company.id);
  return company;
}

async function seedCompletedExperiment(ownerId: string, companyId: string, title: string, finalValue: number) {
  const scores = Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 3])) as Record<
    (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"],
    number
  >;
  scores.referral = 2;
  const diagnosis = await createDiagnosis(ownerId, companyId, { idempotencyKey: randomUUID(), scores });
  const opportunity = await createManualOpportunity(ownerId, companyId, {
    title,
    problemStatement: "Poucos clientes novos chegam por indicação.",
    hypothesis: "Se houver recompensa, as indicações sobem.",
    sourceDimension: "referral",
    expectedImpact: 4,
    urgency: 4,
    effort: 2,
    confidence: 3,
    diagnosisId: diagnosis.id,
  });
  const created = await createExperiment(ownerId, {
    companyId,
    opportunityId: opportunity.id,
    title,
    hypothesis: "O programa de indicação aumenta clientes novos.",
    kpi: "Número de indicações",
    kpiUnit: "clientes",
    direction: "HIGHER_IS_BETTER",
    baseline: 0,
    target: 10,
    investment: 500,
  });
  await startExperiment(ownerId, companyId, created.id);
  const completed = await completeExperiment(ownerId, {
    companyId,
    experimentId: created.id,
    finalValue,
    realizedInvestment: 400,
    realizedReturn: 900,
  });
  return { opportunity, experiment: completed };
}

describe("persistência Sprint 6", () => {
  it(
    "cria memória a partir de evidência, exige aprovação humana e isola por owner",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }
      const company = await seedCompany(user.id, "Empresa Sprint 6", "Academia");
      const { opportunity, experiment } = await seedCompletedExperiment(
        user.id,
        company.id,
        "Testar programa de indicação",
        14,
      );

      const autoMemories = await prisma.strategicMemory.findMany({ where: { experimentId: experiment.id } });
      expect(autoMemories).toHaveLength(0);
      expect(experiment.evidence.length).toBeGreaterThan(0);

      await expect(
        proposeMemoryFromEvidence(user.id, {
          companyId: company.id,
          evidenceId: "cmh000000000000000000000",
          title: "Não deve existir",
          lesson: "Sem evidência real persistida neste ID.",
        }),
      ).rejects.toThrow();

      const proposed = await proposeMemoryFromEvidence(user.id, {
        companyId: company.id,
        evidenceId: experiment.evidence[0]!.id,
        title: "Aprendizado · indicação",
        lesson: "O programa de indicação aumentou novos clientes.",
        limitations: "Uma única loja.",
      });
      expect(proposed.origin).toBe("EXPERIMENT_EVIDENCE");
      expect(proposed.status).toBe("PROPOSED");
      expect(proposed.validated).toBe(false);
      expect(proposed.evidenceId).toBe(experiment.evidence[0]!.id);
      expect(proposed.experimentId).toBe(experiment.id);
      expect(proposed.opportunityId).toBe(opportunity.id);

      const observation = await createObservation(user.id, {
        companyId: company.id,
        origin: "OBSERVATION",
        title: "Observação de balcão",
        lesson: "Clientes pedem plano mensal com mais frequência às segundas.",
      });
      expect(observation.validated).toBe(false);
      expect(observation.origin).toBe("OBSERVATION");

      const approved = await approveMemory(user.id, company.id, proposed.id);
      expect(approved.status).toBe("APPROVED");
      expect(approved.validated).toBe(true);
      expect(approved.approvedById).toBe(user.id);
      expect(approved.approvedAt).toBeTruthy();

      const preview = await getOpportunityMemoryPreview(user.id, company.id, {
        id: opportunity.id,
        sourceDimension: "referral",
        priorityScore: 70,
      });
      expect(preview.related.length).toBeGreaterThan(0);
      expect(preview.preview.rankingChanged).toBe(false);
      expect(preview.related.some((item) => item.experimentId === experiment.id)).toBe(true);

      const listed = await listCompanyMemories("outro-owner", company.id).catch((error: Error) => error);
      expect(listed).toBeInstanceOf(Error);
      expect(await getMemory("outro-owner", proposed.id)).toBeNull();
      expect(await listOwnerMemories("outro-owner")).toHaveLength(0);
      await expect(
        approveMemory("outro-owner", company.id, proposed.id),
      ).rejects.toThrow();
      await expect(
        createObservation("outro-owner", {
          companyId: company.id,
          origin: "MANUAL_LESSON",
          title: "Tentativa indevida",
          lesson: "Não deveria persistir neste owner.",
        }),
      ).rejects.toThrow();

      const rejected = await rejectMemory(user.id, company.id, observation.id);
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.validated).toBe(false);
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
