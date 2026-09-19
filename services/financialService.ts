import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import { toNumber } from "@/lib/format";
import { previousPeriod, type YearMonth } from "@/lib/period";
import {
  calculateAllScenarios,
  calculateBreakEven,
  calculateDRE,
  calculateFinancialRatios,
  calculateRequiredRevenue,
  compareTargetVsActual,
  emptyDreInput,
  summarizeCashFlow,
  type DreInput,
  type DreResult,
  type FinancialRatios,
  type RequiredRevenueInput,
  type ScenarioResult,
  type TargetComparison,
} from "@/lib/financial-engine";
import { buildFinancialInsights, type KnowledgeStep } from "@/lib/financial-insights";
import type { CashFlowInput, DreFormInput, FinancialGoalInput } from "@/lib/validations";

const dreKeys = [
  "grossRevenue",
  "deductions",
  "cogs",
  "payroll",
  "rent",
  "water",
  "energy",
  "internet",
  "marketing",
  "delivery",
  "accounting",
  "maintenance",
  "otherOpex",
] as const;

export type FinancialGoalDTO = {
  id: string | null;
  periodMonth: number;
  periodYear: number;
  revenueTarget: number | null;
  ebitdaTarget: number | null;
  ebitdaPercentTarget: number | null;
  cogsPercentTarget: number | null;
  payrollPercentTarget: number | null;
};

export type CashEntryDTO = {
  id: string;
  direction: "INFLOW" | "OUTFLOW";
  category: string | null;
  amount: number;
  occurredAt: string;
  periodMonth: number;
  periodYear: number;
  description: string | null;
};

export type HistoryRow = {
  periodMonth: number;
  periodYear: number;
  revenue: number | null;
  cogsPercent: number | null;
  payrollPercent: number | null;
  ebitda: number | null;
  ebitdaPercent: number | null;
};

export type FinancialDashboard = {
  period: YearMonth;
  notes: string | null;
  dre: DreResult;
  ratios: FinancialRatios;
  breakEven: ReturnType<typeof calculateBreakEven>;
  goals: FinancialGoalDTO;
  comparisons: {
    revenue: TargetComparison;
    ebitda: TargetComparison;
    ebitdaPercent: TargetComparison;
    cogsPercent: TargetComparison;
    payrollPercent: TargetComparison;
  };
  cashMonth: {
    inflows: number;
    outflows: number;
    operatingBalance: number;
    accumulatedBalance: number;
    hasMovements: boolean;
  };
  history: HistoryRow[];
  previous: HistoryRow | null;
  availablePeriods: YearMonth[];
  insights: KnowledgeStep[];
  scenarios: ScenarioResult[];
};

async function requireCompany(ownerId: string, companyId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) throw new Error("Empresa não encontrada.");
  return company;
}

function decimal(value: number | null | undefined): Prisma.Decimal | null {
  return value == null ? null : new Prisma.Decimal(value);
}

function dreFromRow(row: {
  grossRevenue: Prisma.Decimal | null;
  deductions: Prisma.Decimal | null;
  cogs: Prisma.Decimal | null;
  payroll: Prisma.Decimal | null;
  rent: Prisma.Decimal | null;
  water: Prisma.Decimal | null;
  energy: Prisma.Decimal | null;
  internet: Prisma.Decimal | null;
  marketing: Prisma.Decimal | null;
  delivery: Prisma.Decimal | null;
  accounting: Prisma.Decimal | null;
  maintenance: Prisma.Decimal | null;
  otherOpex: Prisma.Decimal | null;
  salesCount: number | null;
} | null): DreInput {
  if (!row) return emptyDreInput();
  return {
    grossRevenue: toNumber(row.grossRevenue),
    deductions: toNumber(row.deductions),
    cogs: toNumber(row.cogs),
    payroll: toNumber(row.payroll),
    rent: toNumber(row.rent),
    water: toNumber(row.water),
    energy: toNumber(row.energy),
    internet: toNumber(row.internet),
    marketing: toNumber(row.marketing),
    delivery: toNumber(row.delivery),
    accounting: toNumber(row.accounting),
    maintenance: toNumber(row.maintenance),
    otherOpex: toNumber(row.otherOpex),
    salesCount: row.salesCount,
  };
}

function goalFromRow(
  row: {
    id: string;
    periodMonth: number;
    periodYear: number;
    revenueTarget: Prisma.Decimal | null;
    ebitdaTarget: Prisma.Decimal | null;
    ebitdaPercentTarget: Prisma.Decimal | null;
    cogsPercentTarget: Prisma.Decimal | null;
    payrollPercentTarget: Prisma.Decimal | null;
  } | null,
  period: YearMonth,
): FinancialGoalDTO {
  if (!row) {
    return {
      id: null,
      ...period,
      revenueTarget: null,
      ebitdaTarget: null,
      ebitdaPercentTarget: null,
      cogsPercentTarget: null,
      payrollPercentTarget: null,
    };
  }
  return {
    id: row.id,
    periodMonth: row.periodMonth,
    periodYear: row.periodYear,
    revenueTarget: toNumber(row.revenueTarget),
    ebitdaTarget: toNumber(row.ebitdaTarget),
    ebitdaPercentTarget: toNumber(row.ebitdaPercentTarget),
    cogsPercentTarget: toNumber(row.cogsPercentTarget),
    payrollPercentTarget: toNumber(row.payrollPercentTarget),
  };
}

export async function upsertDre(ownerId: string, input: DreFormInput) {
  await requireCompany(ownerId, input.companyId);
  const data = {
    grossRevenue: decimal(input.grossRevenue ?? null),
    deductions: decimal(input.deductions ?? null),
    cogs: decimal(input.cogs ?? null),
    payroll: decimal(input.payroll ?? null),
    rent: decimal(input.rent ?? null),
    water: decimal(input.water ?? null),
    energy: decimal(input.energy ?? null),
    internet: decimal(input.internet ?? null),
    marketing: decimal(input.marketing ?? null),
    delivery: decimal(input.delivery ?? null),
    accounting: decimal(input.accounting ?? null),
    maintenance: decimal(input.maintenance ?? null),
    otherOpex: decimal(input.otherOpex ?? null),
    salesCount: input.salesCount ?? null,
    notes: input.notes ?? null,
  };

  const row = await prisma.financialStatement.upsert({
    where: {
      companyId_periodYear_periodMonth: {
        companyId: input.companyId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
      },
    },
    create: {
      companyId: input.companyId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      ...data,
    },
    update: data,
  });

  await writeAudit({
    actorId: ownerId,
    action: "financial.dre.upsert",
    entity: "FinancialStatement",
    entityId: row.id,
    newValue: { periodMonth: row.periodMonth, periodYear: row.periodYear },
    origin: "USER",
  });

  return row.id;
}

export async function upsertFinancialGoal(ownerId: string, input: FinancialGoalInput) {
  await requireCompany(ownerId, input.companyId);
  const data = {
    revenueTarget: decimal(input.revenueTarget ?? null),
    ebitdaTarget: decimal(input.ebitdaTarget ?? null),
    ebitdaPercentTarget: decimal(input.ebitdaPercentTarget ?? null),
    cogsPercentTarget: decimal(input.cogsPercentTarget ?? null),
    payrollPercentTarget: decimal(input.payrollPercentTarget ?? null),
  };
  const row = await prisma.financialGoal.upsert({
    where: {
      companyId_periodYear_periodMonth: {
        companyId: input.companyId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
      },
    },
    create: {
      companyId: input.companyId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      ...data,
    },
    update: data,
  });
  await writeAudit({
    actorId: ownerId,
    action: "financial.goal.upsert",
    entity: "FinancialGoal",
    entityId: row.id,
    newValue: { periodMonth: row.periodMonth, periodYear: row.periodYear },
    origin: "USER",
  });
  return row.id;
}

export async function createCashEntry(ownerId: string, input: CashFlowInput) {
  await requireCompany(ownerId, input.companyId);
  const occurredAt = input.occurredAt;
  const row = await prisma.financialRecord.create({
    data: {
      companyId: input.companyId,
      kind: input.direction,
      category: input.category,
      amount: new Prisma.Decimal(input.amount),
      occurredAt,
      periodMonth: occurredAt.getMonth() + 1,
      periodYear: occurredAt.getFullYear(),
      description: input.description ?? null,
      sourceKind: "INTERNAL_DATA",
    },
  });
  await writeAudit({
    actorId: ownerId,
    action: "financial.cash.create",
    entity: "FinancialRecord",
    entityId: row.id,
    newValue: { kind: row.kind, amount: Number(row.amount) },
    origin: "USER",
  });
  return row.id;
}

export async function listCashEntries(
  ownerId: string,
  companyId: string,
  period: YearMonth,
): Promise<CashEntryDTO[]> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return [];
  const rows = await prisma.financialRecord.findMany({
    where: {
      companyId,
      company: { ownerId },
      periodMonth: period.periodMonth,
      periodYear: period.periodYear,
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows
    .filter((row) => row.kind === "INFLOW" || row.kind === "OUTFLOW")
    .map((row) => ({
      id: row.id,
      direction: row.kind as "INFLOW" | "OUTFLOW",
      category: row.category,
      amount: toNumber(row.amount) ?? 0,
      occurredAt: row.occurredAt.toISOString(),
      periodMonth: row.periodMonth,
      periodYear: row.periodYear,
      description: row.description,
    }));
}

export async function getFinancialStatement(ownerId: string, companyId: string, period: YearMonth) {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return null;
  return prisma.financialStatement.findFirst({
    where: { companyId, company: { ownerId }, periodMonth: period.periodMonth, periodYear: period.periodYear },
  });
}

export async function getFinancialDashboard(
  ownerId: string,
  companyId: string,
  period: YearMonth,
): Promise<FinancialDashboard | null> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return null;

  const [statement, goalRow, cashRows, historyRows] = await Promise.all([
    prisma.financialStatement.findFirst({
      where: { companyId, company: { ownerId }, periodMonth: period.periodMonth, periodYear: period.periodYear },
    }),
    prisma.financialGoal.findFirst({
      where: { companyId, company: { ownerId }, periodMonth: period.periodMonth, periodYear: period.periodYear },
    }),
    prisma.financialRecord.findMany({
      where: { companyId, company: { ownerId } },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.financialStatement.findMany({
      where: { companyId, company: { ownerId } },
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
    }),
  ]);

  const dre = calculateDRE(dreFromRow(statement));
  const ratios = calculateFinancialRatios(dre);
  const breakEven = calculateBreakEven(dre);
  const goals = goalFromRow(goalRow, period);
  const comparisons = {
    revenue: compareTargetVsActual(dre.grossRevenue, goals.revenueTarget, "higher_is_better"),
    ebitda: compareTargetVsActual(dre.ebitda, goals.ebitdaTarget, "higher_is_better"),
    ebitdaPercent: compareTargetVsActual(ratios.ebitdaPercent, goals.ebitdaPercentTarget, "higher_is_better"),
    cogsPercent: compareTargetVsActual(ratios.cogsPercent, goals.cogsPercentTarget, "lower_is_better"),
    payrollPercent: compareTargetVsActual(ratios.payrollPercent, goals.payrollPercentTarget, "lower_is_better"),
  };
  const cashMonths = summarizeCashFlow(
    cashRows
      .filter((row) => row.kind === "INFLOW" || row.kind === "OUTFLOW")
      .map((row) => ({
        direction: row.kind as "INFLOW" | "OUTFLOW",
        amount: toNumber(row.amount) ?? 0,
        occurredAt: new Date(row.periodYear, row.periodMonth - 1, 1),
      })),
  );
  const foundCash = cashMonths.find(
    (item) => item.periodMonth === period.periodMonth && item.periodYear === period.periodYear,
  );
  const hasCashMovements = cashRows.some(
    (row) =>
      (row.kind === "INFLOW" || row.kind === "OUTFLOW") &&
      row.periodMonth === period.periodMonth &&
      row.periodYear === period.periodYear,
  );
  const cashMonth = {
    inflows: foundCash?.inflows ?? 0,
    outflows: foundCash?.outflows ?? 0,
    operatingBalance: foundCash?.operatingBalance ?? 0,
    accumulatedBalance: foundCash?.accumulatedBalance ?? cashMonths.at(-1)?.accumulatedBalance ?? 0,
    hasMovements: hasCashMovements,
  };

  const history: HistoryRow[] = historyRows.map((row) => {
    const item = calculateDRE(dreFromRow(row));
    const itemRatios = calculateFinancialRatios(item);
    return {
      periodMonth: row.periodMonth,
      periodYear: row.periodYear,
      revenue: item.grossRevenue,
      cogsPercent: itemRatios.cogsPercent,
      payrollPercent: itemRatios.payrollPercent,
      ebitda: item.ebitda,
      ebitdaPercent: itemRatios.ebitdaPercent,
    };
  });
  const prev = previousPeriod(period);
  const previous = history.find((item) => item.periodMonth === prev.periodMonth && item.periodYear === prev.periodYear) ?? null;

  return {
    period,
    notes: statement?.notes ?? null,
    dre,
    ratios,
    breakEven,
    goals,
    comparisons,
    cashMonth,
    history,
    previous,
    availablePeriods: history.map((item) => ({ periodMonth: item.periodMonth, periodYear: item.periodYear })),
    insights: buildFinancialInsights({ ratios, dre, comparisons }),
    scenarios: calculateAllScenarios(dre.input),
  };
}

function periodNow(): YearMonth {
  const now = new Date();
  return { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() };
}

export async function getFinancialMiniSummary(ownerId: string, companyId: string, period = periodNow()) {
  return getFinancialDashboard(ownerId, companyId, period);
}

export async function simulateRequiredRevenue(input: RequiredRevenueInput) {
  return calculateRequiredRevenue(input);
}

export function emptyStatementForm(period: YearMonth, companyId: string): DreFormInput {
  return {
    companyId,
    ...period,
    ...Object.fromEntries(dreKeys.map((key) => [key, undefined])),
  } as DreFormInput;
}
