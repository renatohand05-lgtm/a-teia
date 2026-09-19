import "server-only";

import {
  ExperimentClassification,
  MemoryStatus,
  OpportunityStatus,
  TaskStatus,
} from "@prisma/client";
import { calculateDRE, calculateFinancialRatios, summarizeCashFlow } from "@/lib/financial-engine";
import { toNumber } from "@/lib/format";
import { isClosedTaskStatus } from "@/lib/execution";
import { periodLabel } from "@/lib/period";
import {
  assessDataHealth,
  buildAlerts,
  buildPortfolioAIContext,
  composePortfolioSummary,
  consolidateFinance,
  executionSummary,
  experimentSummary,
  filterPortfolio,
  filterPriorities,
  mapRecentChanges,
  opportunitySummary,
  rankGlobalPriorities,
  separateMemories,
  trendFromHistory,
  type PortfolioCompanyInput,
  type PriorityItem,
} from "@/lib/global-priority-engine";
import { prisma } from "@/lib/prisma";
import { listOwnerDecisions, type DecisionDTO } from "@/services/decisionService";
import { listCompanies, type CompanyDTO } from "@/services/companyService";

export type PortfolioFilters = {
  companyId?: string;
  segment?: string;
  level?: string;
  kind?: string;
};

export type PortfolioRow = {
  company: CompanyDTO;
  health: ReturnType<typeof assessDataHealth>;
  diagnosisScore: number | null;
  revenue: number | null;
  ebitda: number | null;
  opportunityCount: number;
  planCount: number;
  experimentCount: number;
  topPriority: PriorityItem | null;
  updatedAt: string;
};

export type PortfolioBundle = {
  inputs: PortfolioCompanyInput[];
  portfolio: PortfolioRow[];
  priorities: PriorityItem[];
  alerts: ReturnType<typeof buildAlerts>;
  consolidation: ReturnType<typeof consolidateFinance>;
  execution: ReturnType<typeof executionSummary>;
  experiments: ReturnType<typeof experimentSummary>;
  opportunities: ReturnType<typeof opportunitySummary>;
  memories: ReturnType<typeof separateMemories>;
  changes: ReturnType<typeof mapRecentChanges>;
  decisions: DecisionDTO[];
  trends: Array<{ companyId: string; companyName: string; metric: string; direction: string; period: string }>;
  aiSummary: string;
  aiContext: ReturnType<typeof buildPortfolioAIContext>;
};

const openOpportunity = [
  OpportunityStatus.DRAFT,
  OpportunityStatus.ACTIVE,
  OpportunityStatus.IN_PROGRESS,
  OpportunityStatus.VALIDATED,
];

function latestByCompany<T extends { companyId: string | null }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!row.companyId || map.has(row.companyId)) continue;
    map.set(row.companyId, row);
  }
  return map;
}

export async function loadPortfolioBundle(ownerId: string, filters: PortfolioFilters = {}): Promise<PortfolioBundle> {
  const companies = (await listCompanies(ownerId, true)).filter((item) => item.status === "ACTIVE");
  const ids = companies.map((item) => item.id);
  if (!ids.length) {
    return emptyBundle(ownerId);
  }

  const now = new Date();
  const [
    diagnoses,
    statements,
    goals,
    opportunities,
    plans,
    experiments,
    memories,
    records,
    audits,
    decisions,
  ] = await Promise.all([
    prisma.diagnosis.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      orderBy: { createdAt: "desc" },
      select: { companyId: true, overallScore: true, bottleneck: true, createdAt: true },
    }),
    prisma.financialStatement.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    }),
    prisma.financialGoal.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    }),
    prisma.opportunity.findMany({
      where: { companyId: { in: ids }, company: { ownerId }, status: { in: openOpportunity } },
      select: {
        id: true,
        companyId: true,
        title: true,
        score: true,
        status: true,
        expectedImpact: true,
        urgency: true,
        evidenceLevel: true,
      },
    }),
    prisma.actionPlan.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      include: {
        decision: { select: { opportunityId: true } },
        tasks: { select: { status: true, dueAt: true } },
      },
    }),
    prisma.experiment.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      select: {
        id: true,
        companyId: true,
        title: true,
        status: true,
        classification: true,
        _count: { select: { results: true, evidence: true } },
        evidence: { select: { classification: true }, take: 4 },
      },
    }),
    prisma.strategicMemory.findMany({
      where: {
        validated: true,
        status: MemoryStatus.APPROVED,
        OR: [{ companyId: { in: ids }, company: { ownerId } }, { authorId: ownerId, companyId: null }],
      },
      select: { id: true, title: true, companyId: true, validated: true },
      take: 20,
    }),
    prisma.financialRecord.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      select: { companyId: true, kind: true, amount: true, occurredAt: true },
    }),
    prisma.auditLog.findMany({
      where: { actorId: ownerId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, action: true, createdAt: true, entityId: true },
    }),
    listOwnerDecisions(ownerId),
  ]);

  const diagnosisByCompany = latestByCompany(diagnoses);
  const statementByCompany = latestByCompany(statements);
  const goalByCompany = latestByCompany(goals);
  const historyByCompany = new Map<string, typeof statements>();
  for (const row of statements) {
    const list = historyByCompany.get(row.companyId) ?? [];
    if (list.length < 4) list.push(row);
    historyByCompany.set(row.companyId, list);
  }
  const plannedOpportunityIds = new Set(plans.map((item) => item.decision?.opportunityId).filter(Boolean));
  const cashByCompany = new Map<string, number | null>();
  for (const id of ids) {
    const movements = records
      .filter((item) => item.companyId === id)
      .map((item) => ({
        direction: item.kind === "OUTFLOW" ? ("OUTFLOW" as const) : ("INFLOW" as const),
        amount: Number(item.amount),
        occurredAt: item.occurredAt,
      }));
    if (!movements.length) {
      cashByCompany.set(id, null);
      continue;
    }
    const months = summarizeCashFlow(movements);
    cashByCompany.set(id, months.at(-1)?.accumulatedBalance ?? null);
  }

  const inputs: PortfolioCompanyInput[] = companies.map((company) => {
    const statement = statementByCompany.get(company.id);
    const goal = goalByCompany.get(company.id);
    const dre = statement
      ? calculateDRE({
          grossRevenue: toNumber(statement.grossRevenue),
          deductions: toNumber(statement.deductions),
          cogs: toNumber(statement.cogs),
          payroll: toNumber(statement.payroll),
          rent: toNumber(statement.rent),
          water: toNumber(statement.water),
          energy: toNumber(statement.energy),
          internet: toNumber(statement.internet),
          marketing: toNumber(statement.marketing),
          delivery: toNumber(statement.delivery),
          accounting: toNumber(statement.accounting),
          maintenance: toNumber(statement.maintenance),
          otherOpex: toNumber(statement.otherOpex),
          salesCount: statement.salesCount,
        })
      : null;
    const ratios = dre ? calculateFinancialRatios(dre) : null;
    const history = (historyByCompany.get(company.id) ?? []).map((row) => {
      const item = calculateDRE({
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
      });
      return {
        periodLabel: periodLabel({ periodMonth: row.periodMonth, periodYear: row.periodYear }),
        revenue: item.grossRevenue,
        ebitda: item.ebitda,
        cogsPercent: calculateFinancialRatios(item).cogsPercent,
      };
    });
    const diagnosis = diagnosisByCompany.get(company.id);
    return {
      id: company.id,
      name: company.name,
      segment: company.segment,
      status: "ACTIVE",
      updatedAt: company.updatedAt,
      diagnosis: diagnosis
        ? { overallScore: diagnosis.overallScore, bottleneck: diagnosis.bottleneck, createdAt: diagnosis.createdAt.toISOString() }
        : null,
      finance: {
        periodLabel: statement ? periodLabel({ periodMonth: statement.periodMonth, periodYear: statement.periodYear }) : null,
        revenue: dre?.grossRevenue ?? null,
        ebitda: dre?.ebitda ?? null,
        ebitdaPercent: ratios?.ebitdaPercent ?? null,
        ebitdaTarget: toNumber(goal?.ebitdaTarget ?? null),
        cogsPercent: ratios?.cogsPercent ?? null,
        cogsTarget: toNumber(goal?.cogsPercentTarget ?? null),
        cash: cashByCompany.get(company.id) ?? null,
        history,
      },
      opportunities: opportunities
        .filter((item) => item.companyId === company.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          score: item.score,
          status: item.status,
          expectedImpact: item.expectedImpact,
          urgency: item.urgency,
          evidenceLevel: item.evidenceLevel,
          hasPlan: plannedOpportunityIds.has(item.id),
        })),
      plans: plans
        .filter((item) => item.companyId === company.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          overdueTaskCount: item.tasks.filter((task) => task.dueAt && task.dueAt < now && !isClosedTaskStatus(task.status)).length,
          pendingTaskCount: item.tasks.filter((task) => task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS).length,
          doneTaskCount: item.tasks.filter((task) => task.status === TaskStatus.DONE).length,
          updatedAt: item.updatedAt.toISOString(),
        })),
      experiments: experiments
        .filter((item) => item.companyId === company.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          hasResult: item._count.results > 0,
          evidenceCount: item._count.evidence,
          validatedEvidence: item.evidence.some((entry) => entry.classification === ExperimentClassification.VALIDATED),
        })),
      memories: memories.filter((item) => item.companyId === company.id).map((item) => ({ id: item.id, title: item.title, validated: item.validated })),
      evidence: [],
    };
  });

  const scoped = filterPortfolio(inputs, { companyId: filters.companyId, segment: filters.segment });
  const ranked = filterPriorities(rankGlobalPriorities(scoped, 8), { level: filters.level, kind: filters.kind });
  const consolidation = consolidateFinance(scoped);
  const companyById = new Map(companies.map((item) => [item.id, item]));

  return {
    inputs: scoped,
    portfolio: scoped.map((item) => ({
      company: companyById.get(item.id)!,
      health: assessDataHealth(item),
      diagnosisScore: item.diagnosis?.overallScore ?? null,
      revenue: item.finance.revenue,
      ebitda: item.finance.ebitda,
      opportunityCount: item.opportunities.length,
      planCount: item.plans.length,
      experimentCount: item.experiments.length,
      topPriority: ranked.find((priority) => priority.companyId === item.id) ?? collectTop(item),
      updatedAt: item.updatedAt,
    })),
    priorities: ranked.slice(0, 5),
    alerts: buildAlerts(ranked),
    consolidation,
    execution: executionSummary(scoped),
    experiments: experimentSummary(scoped),
    opportunities: opportunitySummary(scoped),
    memories: separateMemories(
      memories.filter((item) => item.companyId).map((item) => ({ title: item.title, companyId: item.companyId! })),
      memories.filter((item) => !item.companyId).map((item) => ({ title: item.title })),
    ),
    changes: mapRecentChanges(audits.map((item) => ({ id: item.id, action: item.action, createdAt: item.createdAt.toISOString() }))),
    decisions: decisions.filter((item) => item.status === "PENDING_HUMAN_APPROVAL" || item.status === "DEFERRED"),
    trends: scoped
      .map((item) => {
        const trend = trendFromHistory(
          item.finance.history.map((row) => row.revenue).reverse(),
          item.finance.history.map((row) => row.periodLabel).join(" → ") || "histórico insuficiente",
        );
        return {
          companyId: item.id,
          companyName: item.name,
          metric: "Receita",
          direction: "insufficient" in trend ? "insufficient" : trend.direction,
          period: "period" in trend ? trend.period : "histórico insuficiente",
        };
      })
      .filter((item) => item.direction !== "insufficient"),
    aiSummary: composePortfolioSummary(ranked),
    aiContext: buildPortfolioAIContext({ ownerId, companies: scoped, priorities: ranked, consolidation }),
  };
}

function collectTop(item: PortfolioCompanyInput): PriorityItem | null {
  return rankGlobalPriorities([item], 1)[0] ?? null;
}

function emptyBundle(ownerId: string): PortfolioBundle {
  const consolidation = consolidateFinance([]);
  return {
    inputs: [],
    portfolio: [],
    priorities: [],
    alerts: [],
    consolidation,
    execution: executionSummary([]),
    experiments: experimentSummary([]),
    opportunities: [],
    memories: separateMemories([], []),
    changes: [],
    decisions: [],
    trends: [],
    aiSummary: composePortfolioSummary([]),
    aiContext: buildPortfolioAIContext({ ownerId, companies: [], priorities: [], consolidation }),
  };
}
