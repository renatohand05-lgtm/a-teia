import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createDiagnosis } from "@/services/diagnosisService";
import { createManualOpportunity } from "@/services/opportunityService";
import { createExecutionPlanFromOpportunity } from "@/services/executionService";
import {
  addMeasurement,
  completeExperiment,
  createExperiment,
  getExperiment,
  listExperiments,
  startExperiment,
} from "@/services/experimentService";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";

const prisma = new PrismaClient();

describe("persistência Sprint 5", () => {
  let companyId = "";
  let ownerId = "";

  it(
    "cria experimento, mede, encerra, gera evidência e isola por owner",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }
      ownerId = user.id;
      const company = await prisma.company.create({
        data: { ownerId, name: `Empresa Sprint 5 Teste ${Date.now()}`, segment: "Testes" },
      });
      companyId = company.id;

      const scores = Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 3])) as Record<
        (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"],
        number
      >;
      scores.referral = 2;
      const diagnosis = await createDiagnosis(ownerId, companyId, {
        idempotencyKey: randomUUID(),
        scores,
      });
      const opportunity = await createManualOpportunity(ownerId, companyId, {
        title: "Programa de indicação",
        problemStatement: "Poucos clientes novos chegam por indicação.",
        hypothesis: "Se houver recompensa, as indicações sobem.",
        sourceDimension: "referral",
        expectedImpact: 4,
        urgency: 4,
        effort: 2,
        confidence: 3,
        diagnosisId: diagnosis.id,
      });
      expect(opportunity.evidenceLevel).toBe("HYPOTHESIS");

      const plan = await createExecutionPlanFromOpportunity(ownerId, companyId, {
        companyId,
        opportunityId: opportunity.id,
        title: "Plano 90 dias — indicação",
        goal30: "Definir mecânica e baseline de indicações.",
        goal60: "Rodar o teste com clientes reais.",
        goal90: "Escalar só com evidência medida.",
      });

      const created = await createExperiment(ownerId, {
        companyId,
        opportunityId: opportunity.id,
        actionPlanId: plan.id,
        title: "Testar programa por 30 dias",
        hypothesis: "O programa de indicação aumenta clientes novos.",
        kpi: "Número de indicações",
        kpiUnit: "clientes",
        direction: "HIGHER_IS_BETTER",
        baseline: 0,
        target: 10,
        investment: 500,
      });
      expect(created.status).toBe("READY");
      expect(created.plannedInvestment).toBe(500);

      const started = await startExperiment(ownerId, companyId, created.id);
      expect(started.status).toBe("RUNNING");

      const first = await addMeasurement(ownerId, {
        companyId,
        experimentId: created.id,
        measuredValue: 6,
        notes: "Primeira leitura",
      });
      const second = await addMeasurement(ownerId, {
        companyId,
        experimentId: created.id,
        measuredValue: 14,
        notes: "Segunda leitura",
      });
      expect(second.measurements.filter((item) => item.outcome === "MEASUREMENT")).toHaveLength(2);
      expect(first.measurements[0]?.id).toBe(second.measurements[0]?.id);

      const completed = await completeExperiment(ownerId, {
        companyId,
        experimentId: created.id,
        finalValue: 14,
        realizedInvestment: 400,
        realizedReturn: 1200,
      });
      expect(completed.status).toBe("COMPLETED");
      expect(completed.classification).toBe("VALIDATED");
      expect(completed.evidence.length).toBeGreaterThan(0);
      expect(completed.roi).toBe(200);
      expect(completed.realizedReturn).toBe(1200);
      expect(completed.plannedInvestment).toBe(500);

      const persistedOpportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } });
      expect(persistedOpportunity.evidenceLevel).toBe("VALIDATED_EVIDENCE");

      const isolated = await getExperiment("outro-owner", companyId, created.id);
      expect(isolated).toBeNull();
      const isolatedList = await listExperiments("outro-owner", companyId);
      expect(isolatedList).toHaveLength(0);
      await expect(startExperiment("outro-owner", companyId, created.id)).rejects.toThrow();
      await expect(
        addMeasurement("outro-owner", { companyId, experimentId: created.id, measuredValue: 99 }),
      ).rejects.toThrow();
    },
    60_000,
  );

  afterAll(async () => {
    if (companyId) {
      await prisma.company.deleteMany({ where: { id: companyId } });
    }
    await prisma.$disconnect();
  }, 20_000);
});
