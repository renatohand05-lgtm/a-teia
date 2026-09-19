import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { requireOwnedResource } from "@/lib/security/ownership";
import { AppError } from "@/lib/security/errors";
import { writeAudit, listOwnerAudit } from "@/services/auditService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const conversationIds: string[] = [];
const researchIds: string[] = [];
const auditIds: string[] = [];

describe("Sprint 12 persistência — isolamento e auditoria", () => {
  it(
    "nega company, conversation e research de outro owner sem vazar conteúdo",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const company = await prisma.company.create({
        data: { ownerId: user.id, name: `Sprint12 ${Date.now()}`, segment: "Testes" },
      });
      companyIds.push(company.id);

      const conversation = await prisma.aIConversation.create({
        data: { userId: user.id, companyId: company.id, title: "Conversa isolada" },
      });
      conversationIds.push(conversation.id);

      const research = await prisma.researchSession.create({
        data: {
          userId: user.id,
          companyId: company.id,
          conversationId: conversation.id,
          question: "Consulta isolada",
        },
      });
      researchIds.push(research.id);

      await expect(requireOwnedResource("outro-owner", "company", company.id)).rejects.toBeInstanceOf(AppError);
      await expect(requireOwnedResource("outro-owner", "conversation", conversation.id)).rejects.toBeInstanceOf(AppError);
      await expect(requireOwnedResource("outro-owner", "research", research.id)).rejects.toBeInstanceOf(AppError);

      const owned = await requireOwnedResource(user.id, "company", company.id);
      expect(owned.ownerId).toBe(user.id);

      await writeAudit({
        actorId: user.id,
        companyId: company.id,
        action: "security.validation_failed",
        entity: "Company",
        entityId: company.id,
        success: false,
        newValue: { password: "nao-gravar", openai_api_key: "sk-should-redact" },
      });

      const events = await listOwnerAudit(user.id, { companyId: company.id, limit: 20 });
      const created = events.find((item) => item.action === "security.validation_failed");
      expect(created).toBeTruthy();
      if (created) auditIds.push(created.id);
      expect(JSON.stringify(created?.metadata ?? {})).not.toMatch(/sk-should-redact|nao-gravar|openai_api_key|password/);

      const stranger = await listOwnerAudit("outro-owner", { limit: 20 });
      expect(stranger.some((item) => item.companyId === company.id)).toBe(false);
    },
    60_000,
  );

  afterAll(async () => {
    if (auditIds.length) await prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } });
    if (researchIds.length) await prisma.researchSession.deleteMany({ where: { id: { in: researchIds } } });
    if (conversationIds.length) await prisma.aIConversation.deleteMany({ where: { id: { in: conversationIds } } });
    if (companyIds.length) {
      await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    }
    await prisma.$disconnect();
  }, 20_000);
});
