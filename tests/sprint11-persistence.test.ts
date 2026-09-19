import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  acknowledgeAlert,
  createAutomationFromTemplate,
  runAutomation,
  setAutomationEnabled,
} from "@/services/automationService";

const prisma = new PrismaClient();
const companyIds: string[] = [];
const automationIds: string[] = [];

describe("Sprint 11 persistência e isolamento", () => {
  it(
    "cria automação, isola owner, executa com idempotência e exige humano para reconhecer",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }

      const company = await prisma.company.create({
        data: { ownerId: user.id, name: `Sprint11 ${Date.now()}`, segment: "Restaurante" },
      });
      companyIds.push(company.id);

      await expect(
        createAutomationFromTemplate({ ownerId: "outro-owner", templateKey: "cmv_above_target", companyId: company.id }),
      ).rejects.toThrow(/não encontrad/i);

      const created = await createAutomationFromTemplate({
        ownerId: user.id,
        templateKey: "cmv_above_target",
        companyId: company.id,
      });
      automationIds.push(created.id);
      expect(created.enabled).toBe(false);

      await expect(setAutomationEnabled({ ownerId: "outro-owner", automationId: created.id, enabled: true })).rejects.toThrow(
        /não encontrad/i,
      );

      await setAutomationEnabled({ ownerId: user.id, automationId: created.id, enabled: true });
      const first = await runAutomation({ ownerId: user.id, automationId: created.id, mode: "manual" });
      const second = await runAutomation({ ownerId: user.id, automationId: created.id, mode: "manual" });
      expect(second.idempotent || second.skipped).toBe(true);
      expect(first.alertsCreated + (second.alertsCreated ?? 0)).toBeLessThanOrEqual(1);

      const alert = await prisma.automationAlert.findFirst({ where: { ownerId: user.id, automationId: created.id } });
      if (alert) {
        await expect(acknowledgeAlert({ ownerId: "outro-owner", alertId: alert.id })).rejects.toThrow(/não encontrad/i);
        const ack = await acknowledgeAlert({ ownerId: user.id, alertId: alert.id });
        expect(ack.status).toBe("ACKNOWLEDGED");
      }
    },
    60_000,
  );

  afterAll(async () => {
    if (automationIds.length) {
      await prisma.automationAlert.deleteMany({ where: { automationId: { in: automationIds } } });
      await prisma.automationExecution.deleteMany({ where: { automationId: { in: automationIds } } });
      await prisma.automation.deleteMany({ where: { id: { in: automationIds } } });
    }
    if (companyIds.length) await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.$disconnect();
  }, 20_000);
});
