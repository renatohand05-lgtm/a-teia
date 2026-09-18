import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { createDiagnosis } from "@/services/diagnosisService";
import { createManualOpportunity } from "@/services/opportunityService";
import {
  createExecutionPlanFromOpportunity,
  getExecutionPlan,
  updateExecutionTaskStatus,
} from "@/services/executionService";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";

const prisma = new PrismaClient();

describe("persistência Sprint 3", () => {
  let companyId = "";
  let ownerId = "";

  it(
    "cria plano 30/60/90, atualiza tarefa e isola por owner",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }
      ownerId = user.id;
      const company = await prisma.company.create({
        data: { ownerId, name: `Empresa Sprint 3 Teste ${Date.now()}`, segment: "Testes" },
      });
      companyId = company.id;

      const scores = Object.fromEntries(DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, 3])) as Record<
        (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"],
        number
      >;
      scores.conversion = 2;
      const diagnosis = await createDiagnosis(ownerId, companyId, {
        idempotencyKey: randomUUID(),
        scores,
      });

      const opportunity = await createManualOpportunity(ownerId, companyId, {
        title: "Melhorar conversão comercial",
        problemStatement: "Orçamentos esfriam sem follow-up padronizado.",
        hypothesis: "Se o follow-up ocorrer em 48h, a conversão sobe.",
        sourceDimension: "conversion",
        expectedImpact: 4,
        urgency: 4,
        effort: 2,
        confidence: 3,
        diagnosisId: diagnosis.id,
      });
      expect(opportunity.evidenceLevel).toBe("HYPOTHESIS");

      const payload = {
        companyId,
        opportunityId: opportunity.id,
        title: "Plano 90 dias — conversão",
        summary: "Executar hipótese de follow-up.",
        goal30: "Definir dono, KPI e roteiro de follow-up.",
        goal60: "Medir taxa de resposta com dados reais.",
        goal90: "Escalar só se houver evidência de conversão.",
      };

      const created = await createExecutionPlanFromOpportunity(ownerId, companyId, payload);
      expect(created.tasks).toHaveLength(3);
      expect(created.progress).toBe(0);
      expect(created.decisionId).toBeTruthy();
      expect(created.opportunityId).toBe(opportunity.id);
      expect(created.decisionStatus).toBe("APPROVED");

      const duplicate = await createExecutionPlanFromOpportunity(ownerId, companyId, payload);
      expect(duplicate.id).toBe(created.id);

      const first = created.tasks[0];
      if (!first) throw new Error("Tarefa inicial ausente.");
      const afterOne = await updateExecutionTaskStatus(ownerId, companyId, first.id, TaskStatus.DONE);
      expect(afterOne.progress).toBe(33);

      await updateExecutionTaskStatus(ownerId, companyId, created.tasks[1]!.id, TaskStatus.DONE);
      const finished = await updateExecutionTaskStatus(ownerId, companyId, created.tasks[2]!.id, TaskStatus.DONE);
      expect(finished.progress).toBe(100);
      expect(finished.decisionStatus).toBe("EXECUTED");

      const persistedOpportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } });
      expect(persistedOpportunity.evidenceLevel).toBe("HYPOTHESIS");
      expect(persistedOpportunity.status).toBe("IN_PROGRESS");

      const isolated = await getExecutionPlan("outro-owner", companyId, created.id);
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
