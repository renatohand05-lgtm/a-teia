import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import { requireOwnedResource } from "@/lib/security/ownership";
import {
  completePlaybookApplication,
  confirmPlaybookApplication,
  createPlaybookApplicationExperiment,
  createPlaybookApplicationPlan,
  createPlaybookFromMemory,
  decidePlaybookApplication,
  getPlaybook,
  getPlaybookApplicationWorkspace,
  proposePlaybookApplication,
  recordPlaybookApplicationResult,
  requestPlaybookApplicationDecision,
} from "@/services/playbookService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const playbookIds: string[] = [];
const opportunityIds: string[] = [];
const memoryIds: string[] = [];
const evidenceIds: string[] = [];

describe("Sprint 16 persistência — ciclo de transferência", () => {
  it(
    "isola owner, não transfere evidência e não duplica ciclo",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const origin = await prisma.company.create({
        data: { ownerId: user.id, name: `Oficina S16 ${Date.now()}`, segment: "Oficina" },
      });
      const dest = await prisma.company.create({
        data: { ownerId: user.id, name: `Burger S16 ${Date.now()}`, segment: "Alimentação" },
      });
      companyIds.push(origin.id, dest.id);

      const originEvidence = await prisma.evidence.create({
        data: {
          companyId: origin.id,
          kind: "EVIDENCE",
          title: "Evidência da Empresa A",
          body: "+18 indicações em 30 dias na origem.",
          classification: "VALIDATED",
        },
      });
      evidenceIds.push(originEvidence.id);

      const memory = await prisma.strategicMemory.create({
        data: {
          companyId: origin.id,
          authorId: user.id,
          title: "Programa de indicação",
          lesson: "Indicação local aumentou aquisição neste contexto.",
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

      await expect(requireOwnedResource("outro-owner", "playbook", playbook.id)).rejects.toBeInstanceOf(AppError);
      await expect(getPlaybook("outro-owner", playbook.id)).rejects.toBeInstanceOf(AppError);

      const [first, second] = await Promise.all([
        proposePlaybookApplication(user.id, playbook.id, dest.id, { kpi: "novos clientes", horizonDays: 30, investment: 1200, target: 12 }),
        proposePlaybookApplication(user.id, playbook.id, dest.id, { kpi: "novos clientes" }),
      ]);
      expect(first.application.id).toBe(second.application.id);
      expect(first.application.classification).toBe("HYPOTHESIS");
      expect([first.alreadyActive, second.alreadyActive].filter(Boolean).length).toBeGreaterThanOrEqual(1);

      const count = await prisma.playbookApplication.count({
        where: { playbookId: playbook.id, destinationCompanyId: dest.id },
      });
      expect(count).toBe(1);

      const confirmed = await confirmPlaybookApplication(user.id, first.application.id, true);
      opportunityIds.push(confirmed.opportunity.id);
      expect(confirmed.opportunity.companyId).toBe(dest.id);
      expect(confirmed.opportunity.evidenceLevel).toBe("HYPOTHESIS");
      const again = await confirmPlaybookApplication(user.id, first.application.id, true);
      expect(again.opportunity.id).toBe(confirmed.opportunity.id);

      await requestPlaybookApplicationDecision(user.id, first.application.id);
      const approved = await decidePlaybookApplication(user.id, first.application.id, "approve", "Teste humano autorizado.");
      expect(["APROVADA", "CONFIRMADA", "AGUARDANDO_APROVACAO", "PLANEJADA"].includes(approved.status)).toBe(true);

      const plan = await createPlaybookApplicationPlan(user.id, first.application.id);
      const planAgain = await createPlaybookApplicationPlan(user.id, first.application.id);
      expect(plan.application.actionPlanId).toBe(planAgain.application.actionPlanId);

      const experiment = await createPlaybookApplicationExperiment(user.id, first.application.id);
      const experimentAgain = await createPlaybookApplicationExperiment(user.id, first.application.id);
      expect(experiment.application.experimentId).toBe(experimentAgain.application.experimentId);

      const measured = await recordPlaybookApplicationResult(user.id, first.application.id, { finalValue: 17, realizedInvestment: 1200 });
      expect(measured.application.resultingEvidenceId).toBeTruthy();
      evidenceIds.push(measured.application.resultingEvidenceId!);

      const local = await prisma.evidence.findFirst({ where: { id: measured.application.resultingEvidenceId! } });
      expect(local?.companyId).toBe(dest.id);
      expect(local?.companyId).not.toBe(origin.id);
      expect(local?.id).not.toBe(originEvidence.id);

      const workspace = await getPlaybookApplicationWorkspace(user.id, first.application.id);
      expect(workspace.evidenceStaysLocal).toBe(true);
      expect(workspace.destEvidence?.companyId).toBe(dest.id);

      await expect(completePlaybookApplication(user.id, first.application.id)).resolves.toMatchObject({ status: "CONCLUIDA" });

      await expect(getPlaybookApplicationWorkspace("outro-owner", first.application.id)).rejects.toBeInstanceOf(AppError);
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
