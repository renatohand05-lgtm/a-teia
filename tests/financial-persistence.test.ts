import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createCashEntry,
  getFinancialDashboard,
  getFinancialStatement,
  listCashEntries,
  upsertDre,
  upsertFinancialGoal,
} from "@/services/financialService";
import { updateExecutionRealizedFinance } from "@/services/executionService";

const prisma = new PrismaClient();

describe("persistência Sprint 4", () => {
  let companyId = "";
  let ownerId = "";

  it(
    "persiste DRE, metas, caixa e isola por owner",
    async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        expect(user).toBeTruthy();
        return;
      }
      ownerId = user.id;
      const company = await prisma.company.create({
        data: { ownerId, name: `Empresa Sprint 4 Teste ${Date.now()}`, segment: "Testes" },
      });
      companyId = company.id;
      const period = { periodMonth: 9, periodYear: 2026 };

      await upsertDre(ownerId, {
        companyId,
        ...period,
        grossRevenue: 80_000,
        deductions: 8_000,
        cogs: 24_000,
        payroll: 16_000,
        rent: 5_000,
        water: 200,
        energy: 800,
        internet: 200,
        marketing: 3_000,
        delivery: 2_000,
        accounting: 600,
        maintenance: 400,
        otherOpex: 800,
        salesCount: 400,
      });

      await upsertFinancialGoal(ownerId, {
        companyId,
        ...period,
        revenueTarget: 90_000,
        ebitdaTarget: 15_000,
        ebitdaPercentTarget: 20,
        cogsPercentTarget: 32,
        payrollPercentTarget: 20,
      });

      await createCashEntry(ownerId, {
        companyId,
        direction: "INFLOW",
        category: "Vendas",
        amount: 12_000,
        occurredAt: new Date(2026, 8, 10),
        description: "Entrada operacional",
      });
      await createCashEntry(ownerId, {
        companyId,
        direction: "OUTFLOW",
        category: "Folha",
        amount: 4_000,
        occurredAt: new Date(2026, 8, 12),
        description: "Saída operacional",
      });

      const dash = await getFinancialDashboard(ownerId, companyId, period);
      expect(dash).not.toBeNull();
      expect(dash?.dre.netRevenue).toBe(72_000);
      expect(dash?.ratios.cogsPercent).toBeCloseTo(33.33, 1);
      expect(dash?.cashMonth.inflows).toBe(12_000);
      expect(dash?.cashMonth.outflows).toBe(4_000);
      expect(dash?.cashMonth.operatingBalance).toBe(8_000);
      expect(dash?.comparisons.cogsPercent.status).toBe("Acima da meta");

      const entries = await listCashEntries(ownerId, companyId, period);
      expect(entries).toHaveLength(2);

      const isolatedDash = await getFinancialDashboard("outro-owner", companyId, period);
      expect(isolatedDash).toBeNull();
      const isolatedStatement = await getFinancialStatement("outro-owner", companyId, period);
      expect(isolatedStatement).toBeNull();
      const isolatedCash = await listCashEntries("outro-owner", companyId, period);
      expect(isolatedCash).toHaveLength(0);

      await expect(
        upsertDre("outro-owner", { companyId, ...period, grossRevenue: 1 }),
      ).rejects.toThrow("Empresa não encontrada.");

      await expect(
        updateExecutionRealizedFinance("outro-owner", {
          companyId,
          planId: "clxxxxxxxxxxxxxxxxxxxx",
          realizedCost: 10,
          realizedReturn: 20,
        }),
      ).rejects.toThrow();
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
