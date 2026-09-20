import { afterAll, describe, expect, it } from "vitest";
import { AlertStatus, AuditSource, CompanyStatus, PrismaClient } from "@prisma/client";
import { listOwnerAudit } from "@/services/auditService";
import { acknowledgeAlert } from "@/services/automationService";
import { archiveCompany, restoreCompany } from "@/services/companyService";
import { approveDecision, proposeDecision, rejectDecision } from "@/services/decisionService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const decisionIds: string[] = [];
const alertIds: string[] = [];

describe("Refinamento 10 — persistência e isolamento", () => {
  it(
    "restaura arquivamento, grava justificativa e isola owners",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const company = await prisma.company.create({
        data: { ownerId: user.id, name: `Ref10 ${Date.now()}`, segment: "Alimentação" },
      });
      companyIds.push(company.id);

      await archiveCompany(user.id, company.id);
      const archived = await prisma.company.findUnique({ where: { id: company.id } });
      expect(archived?.status).toBe(CompanyStatus.ARCHIVED);

      await expect(restoreCompany("outro-owner", company.id)).rejects.toThrow(/não encontrada/i);

      const restored = await restoreCompany(user.id, company.id);
      expect(restored.status).toBe("ACTIVE");
      expect(restored.archivedAt).toBeNull();

      const decision = await proposeDecision({
        createdById: user.id,
        companyId: company.id,
        title: "Aprovar piloto",
        rationale: "Proposta do motor.",
        origin: AuditSource.AI,
      });
      decisionIds.push(decision.id);

      await expect(approveDecision({ actorId: "outro-owner", decisionId: decision.id, humanReason: "não" })).rejects.toThrow(
        /não encontrada/i,
      );

      const approved = await approveDecision({
        actorId: user.id,
        decisionId: decision.id,
        humanReason: "Payback inferior a 3 meses e risco controlado.",
      });
      expect(approved.status).toBe("APPROVED");
      expect(approved.humanReason).toBe("Payback inferior a 3 meses e risco controlado.");

      const rejected = await proposeDecision({
        createdById: user.id,
        companyId: company.id,
        title: "Rejeitar expansão",
        rationale: "Proposta do motor.",
        origin: AuditSource.USER,
      });
      decisionIds.push(rejected.id);
      const afterReject = await rejectDecision({
        actorId: user.id,
        decisionId: rejected.id,
        humanReason: "Capital necessário excede o limite deste trimestre.",
      });
      expect(afterReject.status).toBe("REJECTED");
      expect(afterReject.humanReason).toContain("Capital necessário");

      const alert = await prisma.automationAlert.create({
        data: {
          ownerId: user.id,
          companyId: company.id,
          title: "CMV acima da meta",
          message: "Condição detectada no teste.",
          priority: "ALTO",
          status: AlertStatus.OPEN,
          ruleKey: "cmv_above_target",
          idempotencyKey: `ref10-${Date.now()}`,
          facts: {},
        },
      });
      alertIds.push(alert.id);
      await expect(acknowledgeAlert({ ownerId: "outro-owner", alertId: alert.id })).rejects.toThrow(/não encontrado/i);
      const acknowledged = await acknowledgeAlert({ ownerId: user.id, alertId: alert.id });
      expect(acknowledged.status).toBe(AlertStatus.ACKNOWLEDGED);

      const ownAudit = await listOwnerAudit(user.id, { limit: 40 });
      expect(ownAudit.some((item) => item.action === "company.restore" && item.entityId === company.id)).toBe(true);
      expect(
        ownAudit.some(
          (item) => item.action === "decision.approved" && JSON.stringify(item.metadata ?? {}).includes("Payback"),
        ),
      ).toBe(true);

      const foreignAudit = await listOwnerAudit("outro-owner", { limit: 20 });
      expect(foreignAudit.some((item) => item.entityId === company.id || item.entityId === decision.id)).toBe(false);
    },
    60_000,
  );

  afterAll(async () => {
    if (alertIds.length) await prisma.automationAlert.deleteMany({ where: { id: { in: alertIds } } });
    if (decisionIds.length) await prisma.decision.deleteMany({ where: { id: { in: decisionIds } } });
    if (companyIds.length) await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.$disconnect();
  }, 20_000);
});
