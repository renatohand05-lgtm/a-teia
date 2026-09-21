import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import { requireOwnedResource } from "@/lib/security/ownership";
import {
  approvePlaybook,
  confirmPlaybookApplication,
  createPlaybookFromMemory,
  proposePlaybookApplication,
  rejectPlaybookApplication,
  getPlaybook,
} from "@/services/playbookService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const playbookIds: string[] = [];
const opportunityIds: string[] = [];
const memoryIds: string[] = [];
const evidenceIds: string[] = [];

describe("Sprint 15 persistência — playbooks", () => {
  it(
    "isola owner, cria rascunho com evidência, aplica como hipótese e não duplica oportunidade",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const origin = await prisma.company.create({
        data: { ownerId: user.id, name: `Oficina S15 ${Date.now()}`, segment: "Oficina" },
      });
      const dest = await prisma.company.create({
        data: { ownerId: user.id, name: `Burger S15 ${Date.now()}`, segment: "Alimentação" },
      });
      companyIds.push(origin.id, dest.id);

      const evidence = await prisma.evidence.create({
        data: {
          companyId: origin.id,
          kind: "EVIDENCE",
          title: "Resultado medido S15",
          body: "+18 indicações em 30 dias.",
          classification: "VALIDATED",
        },
      });
      evidenceIds.push(evidence.id);

      const memory = await prisma.strategicMemory.create({
        data: {
          companyId: origin.id,
          authorId: user.id,
          title: "Programa de indicação",
          lesson: "Indicação local aumentou aquisição neste contexto.",
          validated: true,
          status: "APPROVED",
          evidenceId: evidence.id,
          measuredResult: 18,
          kpi: "novos clientes",
          segment: "Oficina",
          family: "INDICACAO",
        },
      });
      memoryIds.push(memory.id);

      await expect(createPlaybookFromMemory(user.id, memory.id)).resolves.toMatchObject({ status: "RASCUNHO" });
      const playbook = await createPlaybookFromMemory(user.id, memory.id);
      playbookIds.push(playbook.id);
      expect(playbook.status).toBe("RASCUNHO");
      expect(playbook.evidenceId).toBe(evidence.id);

      await expect(requireOwnedResource("outro-owner", "playbook", playbook.id)).rejects.toBeInstanceOf(AppError);
      await expect(getPlaybook("outro-owner", playbook.id)).rejects.toBeInstanceOf(AppError);

      await expect(approvePlaybook(user.id, playbook.id, true)).resolves.toMatchObject({ status: "VALIDADO" });

      const proposed = await proposePlaybookApplication(user.id, playbook.id, dest.id, { kpi: "novos clientes" });
      expect(proposed.application.classification).toBe("HYPOTHESIS");
      const again = await proposePlaybookApplication(user.id, playbook.id, dest.id, {});
      expect(again.alreadyActive).toBe(true);
      expect(again.message).toMatch(/já está sendo avaliado/i);

      await expect(confirmPlaybookApplication(user.id, proposed.application.id, false)).rejects.toThrow(/Confirme/);
      const confirmed = await confirmPlaybookApplication(user.id, proposed.application.id, true);
      opportunityIds.push(confirmed.opportunity.id);
      expect(confirmed.opportunity.origin).toBe("PLAYBOOK");
      expect(confirmed.opportunity.evidenceLevel).toBe("HYPOTHESIS");
      expect(confirmed.opportunity.companyId).toBe(dest.id);

      const duplicate = await confirmPlaybookApplication(user.id, proposed.application.id, true);
      expect(duplicate.opportunity.id).toBe(confirmed.opportunity.id);

      const rejected = await rejectPlaybookApplication(user.id, proposed.application.id, true);
      expect(rejected.status).toBe("REJEITADA");
    },
    90_000,
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
