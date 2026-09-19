import "server-only";

import {
  ExperimentClassification,
  ExperimentStatus,
  MemoryStatus,
  OpportunityStatus,
} from "@prisma/client";
import {
  buildJourney,
  emptyCompanyProgress,
  nextCockpitAction,
  type CompanyProgress,
  type CockpitAction,
  type JourneyStage,
} from "@/lib/cockpit";
import { cockpitPriorityFromCompany } from "@/lib/priority";
import { prisma } from "@/lib/prisma";
import { listCompanies, type CompanyDTO } from "@/services/companyService";
import { getRecentMarketIntel, type MarketIntelSummary } from "@/services/researchService";
import { getAllocationCockpitSummary, type AllocationCockpitSummary } from "@/services/allocationService";
import { getAutomationCockpitSummary, type AutomationCockpitSummary } from "@/services/automationService";
import { loadPortfolioBundle, type PortfolioBundle, type PortfolioFilters } from "@/services/portfolioService";

export type CockpitCounts = {
  companiesActive: number;
  diagnoses: number;
  opportunitiesActive: number;
  opportunitiesPrioritized: number;
  plans: number;
  financialStatements: number;
  experimentsActive: number;
  experimentsCompleted: number;
  evidenceTotal: number;
  evidenceValidated: number;
  memoriesValidated: number;
};

export type CockpitBriefing = {
  companyId: string | null;
  companyName: string | null;
  bottleneck: string | null;
  opportunityTitle: string | null;
  opportunityHref: string | null;
  planTitle: string | null;
  experimentTitle: string | null;
  evidenceTitle: string | null;
  memoryTitle: string | null;
};

export type CockpitSnapshot = {
  companies: CompanyDTO[];
  ranked: Array<{
    company: CompanyDTO;
    score: number;
    zone: "critical" | "growth" | "watch" | "stable";
    reason: string;
  }>;
  counts: CockpitCounts;
  progress: CompanyProgress;
  action: CockpitAction;
  journey: JourneyStage[];
  briefing: CockpitBriefing;
  marketIntel: MarketIntelSummary;
  portfolio: PortfolioBundle;
  allocation: AllocationCockpitSummary;
  automation: AutomationCockpitSummary;
};

const emptyCounts = (): CockpitCounts => ({
  companiesActive: 0,
  diagnoses: 0,
  opportunitiesActive: 0,
  opportunitiesPrioritized: 0,
  plans: 0,
  financialStatements: 0,
  experimentsActive: 0,
  experimentsCompleted: 0,
  evidenceTotal: 0,
  evidenceValidated: 0,
  memoriesValidated: 0,
});

const emptyBriefing = (): CockpitBriefing => ({
  companyId: null,
  companyName: null,
  bottleneck: null,
  opportunityTitle: null,
  opportunityHref: null,
  planTitle: null,
  experimentTitle: null,
  evidenceTitle: null,
  memoryTitle: null,
});

function owned(ownerId: string, companyId?: string) {
  return {
    company: {
      ownerId,
      ...(companyId ? { id: companyId } : {}),
    },
  };
}

async function countPortfolio(ownerId: string, companyId?: string): Promise<CockpitCounts> {
  const where = owned(ownerId, companyId);
  const prioritized = [OpportunityStatus.ACTIVE, OpportunityStatus.IN_PROGRESS];
  const open = [
    OpportunityStatus.DRAFT,
    OpportunityStatus.ACTIVE,
    OpportunityStatus.IN_PROGRESS,
    OpportunityStatus.VALIDATED,
  ];
  const [
    diagnoses,
    opportunitiesActive,
    opportunitiesPrioritized,
    plans,
    financialStatements,
    experimentsActive,
    experimentsCompleted,
    evidenceTotal,
    evidenceValidated,
    memoriesValidated,
  ] = await Promise.all([
    prisma.diagnosis.count({ where }),
    prisma.opportunity.count({ where: { ...where, status: { in: open } } }),
    prisma.opportunity.count({ where: { ...where, status: { in: prioritized } } }),
    prisma.actionPlan.count({ where }),
    prisma.financialStatement.count({ where }),
    prisma.experiment.count({
      where: { ...where, status: { in: [ExperimentStatus.READY, ExperimentStatus.RUNNING] } },
    }),
    prisma.experiment.count({ where: { ...where, status: ExperimentStatus.COMPLETED } }),
    prisma.evidence.count({ where }),
    prisma.evidence.count({
      where: { ...where, classification: ExperimentClassification.VALIDATED },
    }),
    prisma.strategicMemory.count({
      where: { ...where, validated: true, status: MemoryStatus.APPROVED },
    }),
  ]);

  return {
    companiesActive: 0,
    diagnoses,
    opportunitiesActive,
    opportunitiesPrioritized,
    plans,
    financialStatements,
    experimentsActive,
    experimentsCompleted,
    evidenceTotal,
    evidenceValidated,
    memoriesValidated,
  };
}

async function loadBriefing(ownerId: string, company: CompanyDTO): Promise<CockpitBriefing> {
  const where = owned(ownerId, company.id);
  const [diagnosis, opportunity, plan, experiment, evidence, memory] = await Promise.all([
    prisma.diagnosis.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { bottleneck: true },
    }),
    prisma.opportunity.findFirst({
      where: { ...where, status: { in: [OpportunityStatus.ACTIVE, OpportunityStatus.IN_PROGRESS] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.actionPlan.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { title: true },
    }),
    prisma.experiment.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { title: true },
    }),
    prisma.evidence.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { title: true },
    }),
    prisma.strategicMemory.findFirst({
      where: { ...where, validated: true, status: MemoryStatus.APPROVED },
      orderBy: { updatedAt: "desc" },
      select: { title: true },
    }),
  ]);

  return {
    companyId: company.id,
    companyName: company.name,
    bottleneck: diagnosis?.bottleneck ?? company.perceivedBottlenecks,
    opportunityTitle: opportunity?.title ?? null,
    opportunityHref: opportunity ? `/empresas/${company.id}/oportunidades/${opportunity.id}` : null,
    planTitle: plan?.title ?? null,
    experimentTitle: experiment?.title ?? null,
    evidenceTitle: evidence?.title ?? null,
    memoryTitle: memory?.title ?? null,
  };
}

function progressFromCounts(
  company: CompanyDTO | null,
  counts: CockpitCounts,
  attention: boolean,
): CompanyProgress {
  if (!company) return emptyCompanyProgress();
  return {
    companyId: company.id,
    companyName: company.name,
    hasCompany: true,
    hasDiagnosis: counts.diagnoses > 0,
    opportunityCount: counts.opportunitiesActive,
    prioritizedOpportunityCount: counts.opportunitiesPrioritized,
    planCount: counts.plans,
    financialCount: counts.financialStatements,
    experimentActiveCount: counts.experimentsActive,
    experimentCompletedCount: counts.experimentsCompleted,
    evidenceCount: counts.evidenceTotal,
    evidenceValidatedCount: counts.evidenceValidated,
    memoryValidatedCount: counts.memoriesValidated,
    attention,
  };
}

export async function getCockpitSnapshot(ownerId: string, filters: PortfolioFilters = {}): Promise<CockpitSnapshot> {
  const companies = await listCompanies(ownerId, true);
  const active = companies.filter((company) => company.status === "ACTIVE");
  const ranked = [...active]
    .map((company) => ({ company, ...cockpitPriorityFromCompany(company) }))
    .sort((a, b) => b.score - a.score);
  const focus = ranked[0]?.company ?? null;

  if (!focus) {
    const progress = emptyCompanyProgress();
    const [marketIntel, portfolioBundle, allocation, automation] = await Promise.all([
      getRecentMarketIntel(ownerId),
      loadPortfolioBundle(ownerId, filters),
      getAllocationCockpitSummary(ownerId),
      getAutomationCockpitSummary(ownerId),
    ]);
    return {
      companies,
      ranked,
      counts: emptyCounts(),
      progress,
      action: nextCockpitAction(progress),
      journey: buildJourney(progress),
      briefing: emptyBriefing(),
      marketIntel,
      portfolio: portfolioBundle,
      allocation,
      automation,
    };
  }

  const [portfolio, focusCounts, briefing, marketIntel, portfolioBundle, allocation, automation] = await Promise.all([
    countPortfolio(ownerId),
    countPortfolio(ownerId, focus.id),
    loadBriefing(ownerId, focus),
    getRecentMarketIntel(ownerId),
    loadPortfolioBundle(ownerId, filters),
    getAllocationCockpitSummary(ownerId),
    getAutomationCockpitSummary(ownerId),
  ]);

  const progress = progressFromCounts(focus, focusCounts, ranked[0]?.zone === "critical");
  return {
    companies,
    ranked,
    counts: { ...portfolio, companiesActive: active.length },
    progress,
    action: nextCockpitAction(progress),
    journey: buildJourney(progress),
    briefing,
    marketIntel,
    portfolio: portfolioBundle,
    allocation,
    automation,
  };
}
