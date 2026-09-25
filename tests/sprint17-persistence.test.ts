import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import {
  completePlaybookApplication,
  confirmPlaybookApplication,
  createPlaybookApplicationExperiment,
  createPlaybookApplicationPlan,
  createPlaybookFromMemory,
  decidePlaybookApplication,
  getPlaybookApplicationWorkspace,
  listPlaybookApplications,
  proposePlaybookApplication,
  proposePlaybookApplicationMemory,
  recordPlaybookApplicationResult,
  requestPlaybookApplicationDecision,
} from "@/services/playbookService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const playbookIds: string[] = [];
const memoryIds: string[] = [];
const evidenceIds: string[] = [];
const opportunityIds: string[] = [];

describe("Sprint 17 persistência — central de aplicações", () => {
  it(
    "lista applications do owner, isola ID manipulado e não move evidência",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const origin = await prisma.company.create({
        data: { ownerId: user.id, name: `Oficina S17 ${Date.now()}`, segment: "Oficina" },
      });
      const dest = await prisma.company.create({
        data: { ownerId: user.id, name: `Burger S17 ${Date.now()}`, segment: "Alimentação" },
      });
      companyIds.push(origin.id, dest.id);

      const originEvidence = await prisma.evidence.create({
        data: {
          companyId: origin.id,
          kind: "EVIDENCE",
          title: "Evidência A S17",
          body: "Resultado medido na origem.",
          classification: "VALIDATED",
        },
      });
      evidenceIds.push(originEvidence.id);

      const memory = await prisma.strategicMemory.create({
        data: {
          companyId: origin.id,
          authorId: user.id,
          title: "Indicação S17",
          lesson: "Aprendizado local da origem.",
          validated: true,
          status: "APPROVED",
          evidenceId: originEvidence.id,
          measuredResult: 18,
          kpi: "novos clientes",
          segment: "Oficina",
          family: "INDICACAO",
        },
      });
      memoryIds.push(memory.id);

      const playbook = await createPlaybookFromMemory(user.id, memory.id);
      playbookIds.push(playbook.id);
      const proposed = await proposePlaybookApplication(user.id, playbook.id, dest.id, { kpi: "novos clientes" });

      const listed = await listPlaybookApplications(user.id, { q: "Indicação", destinationId: dest.id });
      expect(listed.filtered).toHaveLength(1);
      expect(listed.filtered[0]?.id).toBe(proposed.application.id);
      expect(listed.filtered[0]?.originCompanyName).toContain("Oficina");
      expect(listed.filtered[0]?.hasLocalEvidence).toBe(false);

      const other = await listPlaybookApplications("outro-owner", {});
      expect(other.all).toHaveLength(0);

      await expect(getPlaybookApplicationWorkspace("outro-owner", proposed.application.id)).rejects.toBeInstanceOf(AppError);
      await expect(confirmPlaybookApplication("outro-owner", proposed.application.id, true)).rejects.toBeInstanceOf(AppError);

      const stillOrigin = await prisma.evidence.findFirst({ where: { id: originEvidence.id } });
      expect(stillOrigin?.companyId).toBe(origin.id);
      expect(proposed.application.resultingEvidenceId).toBeNull();

      const confirmed = await confirmPlaybookApplication(user.id, proposed.application.id, true);
      if (confirmed.opportunity.id) opportunityIds.push(confirmed.opportunity.id);
      await requestPlaybookApplicationDecision(user.id, proposed.application.id);
      await decidePlaybookApplication(user.id, proposed.application.id, "approve", "Autorização humana.");
      const plan = await createPlaybookApplicationPlan(user.id, proposed.application.id);
      const planAgain = await createPlaybookApplicationPlan(user.id, proposed.application.id);
      expect(plan.application.actionPlanId).toBe(planAgain.application.actionPlanId);

      const experiment = await createPlaybookApplicationExperiment(user.id, proposed.application.id);
      const experimentAgain = await createPlaybookApplicationExperiment(user.id, proposed.application.id);
      expect(experiment.application.experimentId).toBe(experimentAgain.application.experimentId);

      expect(proposed.application.resultingEvidenceId).toBeNull();
      const measured = await recordPlaybookApplicationResult(user.id, proposed.application.id, { finalValue: 11, realizedInvestment: 900 });
      expect(measured.application.resultingEvidenceId).toBeTruthy();
      evidenceIds.push(measured.application.resultingEvidenceId!);

      const evidenceB = await prisma.evidence.findFirst({ where: { id: measured.application.resultingEvidenceId! } });
      expect(stillOrigin?.companyId).toBe(origin.id);
      expect(evidenceB?.companyId).toBe(dest.id);
      expect(evidenceB?.id).not.toBe(originEvidence.id);

      const destMemory = await proposePlaybookApplicationMemory(user.id, proposed.application.id);
      const destMemoryAgain = await proposePlaybookApplicationMemory(user.id, proposed.application.id);
      expect(destMemory.application.resultingMemoryId).toBe(destMemoryAgain.application.resultingMemoryId);
      memoryIds.push(destMemory.application.resultingMemoryId!);

      const memoryRow = await prisma.strategicMemory.findFirst({ where: { id: destMemory.application.resultingMemoryId! } });
      expect(memoryRow?.evidenceId).toBe(evidenceB?.id);
      expect(memoryRow?.companyId).toBe(dest.id);

      const workspace = await getPlaybookApplicationWorkspace(user.id, proposed.application.id);
      expect(workspace.destEvidence?.companyId).toBe(dest.id);
      expect(workspace.originEvidence?.companyId).toBe(origin.id);
      expect(workspace.evidenceStaysLocal).toBe(true);

      await completePlaybookApplication(user.id, proposed.application.id);
      const done = await getPlaybookApplicationWorkspace(user.id, proposed.application.id);
      expect(done.application.status).toBe("CONCLUIDA");
      expect(done.nextAction.label).toBe("Concluído");
    },
    120_000,
  );

  afterAll(async () => {
    if (opportunityIds.length) await prisma.opportunity.deleteMany({ where: { id: { in: opportunityIds } } });
    if (playbookIds.length) await prisma.playbook.deleteMany({ where: { id: { in: playbookIds } } });
    if (memoryIds.length) await prisma.strategicMemory.deleteMany({ where: { id: { in: memoryIds } } });
    if (evidenceIds.length) await prisma.evidence.deleteMany({ where: { id: { in: evidenceIds } } });
    if (companyIds.length) await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.$disconnect();
  });
});
