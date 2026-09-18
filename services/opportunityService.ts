import "server-only";

import {
  EvidenceLevel,
  OpportunityOrigin,
  OpportunityStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import { toNumber } from "@/lib/format";
import { dimensionByKey, type DiagnosticDimensionKey } from "@/lib/diagnostic";
import {
  calculatePaybackMonths,
  calculatePriorityScore,
  classifyPriority,
  rankOpportunities,
  type PriorityResult,
} from "@/lib/opportunity-score";
import {
  isLowDimensionScore,
  templateByKey,
  templatesForDimension,
  type OpportunityTemplate,
} from "@/lib/opportunity-templates";
import type { GenerateOpportunitiesInput, OpportunityInput } from "@/lib/validations";
import type { DiagnosisDTO } from "@/services/diagnosisService";

export type OpportunityDTO = {
  id: string;
  companyId: string;
  diagnosisId: string | null;
  createdById: string | null;
  sourceDimension: string | null;
  sourceDimensionLabel: string;
  templateKey: string | null;
  origin: OpportunityOrigin;
  title: string;
  description: string | null;
  problemStatement: string | null;
  hypothesis: string | null;
  expectedImpact: number | null;
  urgency: number | null;
  confidence: number | null;
  effort: number | null;
  estimatedInvestment: number | null;
  estimatedHours: number | null;
  expectedMonthlyReturn: number | null;
  paybackMonths: number | null;
  priorityScore: number;
  scorePartial: boolean;
  reasons: string[];
  band: string;
  bandKey: "high" | "medium" | "low";
  status: OpportunityStatus;
  evidenceLevel: EvidenceLevel;
  queuedForPlan: boolean;
  experimentCount: number;
  validatedExperimentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityFilters = {
  status?: OpportunityStatus | "ALL";
  dimension?: string | "ALL";
  origin?: OpportunityOrigin | "ALL";
  financial?: "ALL" | "with" | "without";
  minScore?: number;
};

export type OpportunitySummary = {
  activeCount: number;
  totalCount: number;
  top: OpportunityDTO | null;
  topDimension: string | null;
  estimatedInvestmentTotal: number;
  expectedMonthlyReturnTotal: number;
};

export type SuggestionGroup = {
  dimension: DiagnosticDimensionKey;
  label: string;
  score: number;
  bottleneck: boolean;
  templates: OpportunityTemplate[];
  alreadyCreated: string[];
};

function asReasons(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function scoreFromRow(row: {
  sourceDimension: string | null;
  expectedImpact: number | null;
  urgency: number | null;
  confidence: number | null;
  effort: number | null;
  investment: Prisma.Decimal | null;
  expectedReturn: Prisma.Decimal | null;
  paybackMonths: Prisma.Decimal | null;
  dimensionScore?: number | null;
}): PriorityResult {
  return calculatePriorityScore({
    dimensionScore: row.dimensionScore,
    expectedImpact: row.expectedImpact ?? 3,
    urgency: row.urgency ?? 3,
    confidence: row.confidence ?? 3,
    effort: row.effort ?? 3,
    estimatedInvestment: toNumber(row.investment),
    expectedMonthlyReturn: toNumber(row.expectedReturn),
    paybackMonths: toNumber(row.paybackMonths),
    dimensionLabel: dimensionByKey(row.sourceDimension ?? "")?.label ?? row.sourceDimension,
  });
}

export function toOpportunityDTO(
  row: {
    id: string;
    companyId: string;
    diagnosisId: string | null;
    createdById: string | null;
    sourceDimension: string | null;
    templateKey: string | null;
    origin: OpportunityOrigin;
    title: string;
    description: string | null;
    problemStatement: string | null;
    hypothesis: string | null;
    expectedImpact: number | null;
    urgency: number | null;
    confidence: number | null;
    effort: number | null;
    investment: Prisma.Decimal | null;
    estimatedHours: Prisma.Decimal | null;
    expectedReturn: Prisma.Decimal | null;
    paybackMonths: Prisma.Decimal | null;
    score: number | null;
    scorePartial: boolean;
    scoreReasons: Prisma.JsonValue | null;
    status: OpportunityStatus;
    evidenceLevel: EvidenceLevel;
    queuedForPlan: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  dimensionScore?: number | null,
): OpportunityDTO {
  const computed = scoreFromRow({ ...row, dimensionScore });
  const storedReasons = asReasons(row.scoreReasons);
  const score = row.score ?? computed.score;
  const band = classifyPriority(score);
  return {
    id: row.id,
    companyId: row.companyId,
    diagnosisId: row.diagnosisId,
    createdById: row.createdById,
    sourceDimension: row.sourceDimension,
    sourceDimensionLabel: dimensionByKey(row.sourceDimension ?? "")?.label ?? row.sourceDimension ?? "—",
    templateKey: row.templateKey,
    origin: row.origin,
    title: row.title,
    description: row.description,
    problemStatement: row.problemStatement,
    hypothesis: row.hypothesis,
    expectedImpact: row.expectedImpact,
    urgency: row.urgency,
    confidence: row.confidence,
    effort: row.effort,
    estimatedInvestment: toNumber(row.investment),
    estimatedHours: toNumber(row.estimatedHours),
    expectedMonthlyReturn: toNumber(row.expectedReturn),
    paybackMonths: toNumber(row.paybackMonths) ?? computed.paybackMonths,
    priorityScore: score,
    scorePartial: row.scorePartial || computed.partial,
    reasons: storedReasons.length ? storedReasons : computed.reasons,
    band: band.label,
    bandKey: band.key,
    status: row.status,
    evidenceLevel: row.evidenceLevel,
    queuedForPlan: row.queuedForPlan,
    experimentCount: 0,
    validatedExperimentCount: 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireCompany(ownerId: string, companyId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) throw new Error("Empresa não encontrada.");
  return company;
}

async function dimensionScoreFor(
  companyId: string,
  sourceDimension: string,
  diagnosisId?: string | null,
): Promise<number | null> {
  const diagnosis = diagnosisId
    ? await prisma.diagnosis.findFirst({
        where: { id: diagnosisId, companyId },
        include: { dimensions: true },
      })
    : await prisma.diagnosis.findFirst({
        where: { companyId, isDemo: false },
        include: { dimensions: true },
        orderBy: { createdAt: "desc" },
      });
  const match = diagnosis?.dimensions.find((item) => item.key === sourceDimension);
  return match?.score ?? null;
}

function scoredData(input: OpportunityInput, dimensionScore: number | null) {
  const paybackMonths = calculatePaybackMonths(input.estimatedInvestment, input.expectedMonthlyReturn);
  const priority = calculatePriorityScore({
    dimensionScore,
    expectedImpact: input.expectedImpact,
    urgency: input.urgency,
    confidence: input.confidence ?? 3,
    effort: input.effort,
    estimatedInvestment: input.estimatedInvestment,
    expectedMonthlyReturn: input.expectedMonthlyReturn,
    paybackMonths,
    dimensionLabel: dimensionByKey(input.sourceDimension)?.label,
  });
  return { paybackMonths, priority };
}

export async function listOpportunities(
  ownerId: string,
  companyId: string,
  filters: OpportunityFilters = {},
): Promise<OpportunityDTO[]> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return [];

  const rows = await prisma.opportunity.findMany({
    where: {
      companyId,
      isDemo: false,
      ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(filters.dimension && filters.dimension !== "ALL" ? { sourceDimension: filters.dimension } : {}),
      ...(filters.origin && filters.origin !== "ALL" ? { origin: filters.origin } : {}),
    },
    orderBy: [{ score: "desc" }, { title: "asc" }],
  });

  let list = rows.map((row) => toOpportunityDTO(row));
  list = await attachExperimentStats(ownerId, companyId, list);
  if (filters.financial === "with") {
    list = list.filter((item) => item.estimatedInvestment != null && item.expectedMonthlyReturn != null);
  }
  if (filters.financial === "without") {
    list = list.filter((item) => item.estimatedInvestment == null || item.expectedMonthlyReturn == null);
  }
  if (typeof filters.minScore === "number") {
    list = list.filter((item) => item.priorityScore >= filters.minScore!);
  }
  return rankOpportunities(
    list.map((item) => ({ ...item, score: item.priorityScore })),
  );
}

export async function getOpportunity(
  ownerId: string,
  companyId: string,
  opportunityId: string,
): Promise<OpportunityDTO | null> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return null;
  const row = await prisma.opportunity.findFirst({
    where: { id: opportunityId, companyId },
  });
  if (!row) return null;
  const dimensionScore = await dimensionScoreFor(companyId, row.sourceDimension ?? "", row.diagnosisId);
  const [dto] = await attachExperimentStats(ownerId, companyId, [toOpportunityDTO(row, dimensionScore)]);
  return dto ?? null;
}

async function attachExperimentStats(ownerId: string, companyId: string, list: OpportunityDTO[]): Promise<OpportunityDTO[]> {
  if (!list.length) return list;
  const stats = await prisma.experiment.groupBy({
    by: ["opportunityId", "classification"],
    where: { companyId, company: { ownerId }, opportunityId: { in: list.map((item) => item.id) } },
    _count: { _all: true },
  });
  return list.map((item) => {
    const related = stats.filter((stat) => stat.opportunityId === item.id);
    return {
      ...item,
      experimentCount: related.reduce((sum, stat) => sum + stat._count._all, 0),
      validatedExperimentCount: related
        .filter((stat) => stat.classification === "VALIDATED")
        .reduce((sum, stat) => sum + stat._count._all, 0),
    };
  });
}

export async function createManualOpportunity(
  ownerId: string,
  companyId: string,
  input: OpportunityInput,
): Promise<OpportunityDTO> {
  await requireCompany(ownerId, companyId);
  const dimensionScore = await dimensionScoreFor(companyId, input.sourceDimension, input.diagnosisId);
  const { paybackMonths, priority } = scoredData(input, dimensionScore);

  const row = await prisma.opportunity.create({
    data: {
      companyId,
      createdById: ownerId,
      diagnosisId: input.diagnosisId ?? null,
      sourceDimension: input.sourceDimension,
      origin: OpportunityOrigin.MANUAL,
      title: input.title.trim(),
      description: input.description ?? null,
      problemStatement: input.problemStatement.trim(),
      hypothesis: input.hypothesis.trim(),
      expectedImpact: input.expectedImpact,
      urgency: input.urgency,
      confidence: input.confidence ?? 3,
      effort: input.effort,
      investment: input.estimatedInvestment ?? null,
      estimatedHours: input.estimatedHours ?? null,
      expectedReturn: input.expectedMonthlyReturn ?? null,
      paybackMonths,
      score: priority.score,
      scorePartial: priority.partial,
      scoreReasons: priority.reasons,
      status: OpportunityStatus.DRAFT,
      evidenceLevel: EvidenceLevel.HYPOTHESIS,
      isDemo: false,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "opportunity.create",
    entity: "Opportunity",
    entityId: row.id,
    newValue: { title: row.title, score: row.score, origin: row.origin },
    origin: "USER",
  });

  return toOpportunityDTO(row, dimensionScore);
}

export async function updateOpportunity(
  ownerId: string,
  companyId: string,
  opportunityId: string,
  input: OpportunityInput,
): Promise<OpportunityDTO> {
  const existing = await prisma.opportunity.findFirst({
    where: { id: opportunityId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Oportunidade não encontrada.");

  const dimensionScore = await dimensionScoreFor(companyId, input.sourceDimension, input.diagnosisId ?? existing.diagnosisId);
  const { paybackMonths, priority } = scoredData(input, dimensionScore);

  const row = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      diagnosisId: input.diagnosisId ?? existing.diagnosisId,
      sourceDimension: input.sourceDimension,
      title: input.title.trim(),
      description: input.description ?? null,
      problemStatement: input.problemStatement.trim(),
      hypothesis: input.hypothesis.trim(),
      expectedImpact: input.expectedImpact,
      urgency: input.urgency,
      confidence: input.confidence ?? 3,
      effort: input.effort,
      investment: input.estimatedInvestment ?? null,
      estimatedHours: input.estimatedHours ?? null,
      expectedReturn: input.expectedMonthlyReturn ?? null,
      paybackMonths,
      score: priority.score,
      scorePartial: priority.partial,
      scoreReasons: priority.reasons,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "opportunity.update",
    entity: "Opportunity",
    entityId: row.id,
    previousValue: { title: existing.title, score: existing.score },
    newValue: { title: row.title, score: row.score },
    origin: "USER",
  });

  return toOpportunityDTO(row, dimensionScore);
}

export async function updateOpportunityStatus(
  ownerId: string,
  companyId: string,
  opportunityId: string,
  status: OpportunityStatus,
): Promise<OpportunityDTO> {
  const existing = await prisma.opportunity.findFirst({
    where: { id: opportunityId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Oportunidade não encontrada.");

  const row = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { status },
  });

  await writeAudit({
    actorId: ownerId,
    action: "opportunity.status",
    entity: "Opportunity",
    entityId: row.id,
    previousValue: { status: existing.status },
    newValue: { status: row.status },
    origin: "USER",
  });

  return toOpportunityDTO(row);
}

export async function queueOpportunityForPlan(
  ownerId: string,
  companyId: string,
  opportunityId: string,
): Promise<OpportunityDTO> {
  const existing = await prisma.opportunity.findFirst({
    where: { id: opportunityId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Oportunidade não encontrada.");

  const nextStatus =
    existing.status === OpportunityStatus.ARCHIVED || existing.status === OpportunityStatus.REJECTED
      ? OpportunityStatus.ACTIVE
      : existing.status === OpportunityStatus.DRAFT
        ? OpportunityStatus.ACTIVE
        : existing.status;

  const row = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { queuedForPlan: true, status: nextStatus },
  });

  return toOpportunityDTO(row);
}

export function buildSuggestions(diagnosis: DiagnosisDTO, existingTemplateKeys: string[] = []): SuggestionGroup[] {
  const bottleneckKeys = new Set(diagnosis.bottlenecks.map((item) => item.key));
  return diagnosis.dimensions
    .filter((item) => isLowDimensionScore(item.score))
    .map((item) => ({
      dimension: item.key as DiagnosticDimensionKey,
      label: item.name,
      score: item.score,
      bottleneck: bottleneckKeys.has(item.key),
      templates: templatesForDimension(item.key as DiagnosticDimensionKey),
      alreadyCreated: existingTemplateKeys.filter((key) => key.startsWith(`${item.key}-`)),
    }))
    .filter((group) => group.templates.length > 0);
}

export async function listSuggestionGroups(
  ownerId: string,
  companyId: string,
  diagnosisId: string,
): Promise<SuggestionGroup[]> {
  await requireCompany(ownerId, companyId);
  const diagnosis = await prisma.diagnosis.findFirst({
    where: { id: diagnosisId, companyId },
    include: { dimensions: true },
  });
  if (!diagnosis) throw new Error("Diagnóstico não encontrado.");

  const existing = await prisma.opportunity.findMany({
    where: { companyId, diagnosisId, templateKey: { not: null } },
    select: { templateKey: true },
  });
  const keys = existing.map((item) => item.templateKey).filter((item): item is string => Boolean(item));

  const { toDiagnosisDTO } = await import("@/services/diagnosisService");
  return buildSuggestions(toDiagnosisDTO(diagnosis), keys);
}

export async function createSuggestedOpportunities(
  ownerId: string,
  companyId: string,
  input: GenerateOpportunitiesInput,
): Promise<OpportunityDTO[]> {
  await requireCompany(ownerId, companyId);
  const diagnosis = await prisma.diagnosis.findFirst({
    where: { id: input.diagnosisId, companyId },
    include: { dimensions: true },
  });
  if (!diagnosis) throw new Error("Diagnóstico não encontrado.");

  const created: OpportunityDTO[] = [];
  for (const key of input.templateKeys) {
    const template = templateByKey(key);
    if (!template) continue;

    const already = await prisma.opportunity.findFirst({
      where: { companyId, diagnosisId: diagnosis.id, templateKey: template.key },
    });
    if (already) {
      created.push(toOpportunityDTO(already));
      continue;
    }

    const dimension = diagnosis.dimensions.find((item) => item.key === template.dimension);
    const dimensionScore = dimension?.score ?? null;
    const urgency = dimensionScore != null ? Math.min(5, Math.max(1, 6 - dimensionScore)) : 3;
    const payload: OpportunityInput = {
      title: template.title,
      problemStatement: template.problemStatement,
      hypothesis: template.hypothesis,
      sourceDimension: template.dimension,
      expectedImpact: template.expectedImpact,
      urgency,
      effort: template.effort,
      confidence: template.confidence,
      description: template.description,
      diagnosisId: diagnosis.id,
    };
    const { paybackMonths, priority } = scoredData(payload, dimensionScore);

    const row = await prisma.opportunity.create({
      data: {
        companyId,
        createdById: ownerId,
        diagnosisId: diagnosis.id,
        sourceDimension: template.dimension,
        templateKey: template.key,
        origin: OpportunityOrigin.SUGGESTED,
        title: template.title,
        description: template.description,
        problemStatement: template.problemStatement,
        hypothesis: template.hypothesis,
        expectedImpact: template.expectedImpact,
        urgency,
        confidence: template.confidence,
        effort: template.effort,
        paybackMonths,
        score: priority.score,
        scorePartial: priority.partial,
        scoreReasons: priority.reasons,
        status: OpportunityStatus.DRAFT,
        evidenceLevel: EvidenceLevel.HYPOTHESIS,
        isDemo: false,
      },
    });
    created.push(toOpportunityDTO(row, dimensionScore));
  }

  if (!created.length) {
    throw new Error("Nenhuma sugestão válida foi selecionada.");
  }

  await writeAudit({
    actorId: ownerId,
    action: "opportunity.generate",
    entity: "Opportunity",
    entityId: companyId,
    newValue: { diagnosisId: input.diagnosisId, count: created.length },
    origin: "USER",
  });

  return created;
}

export async function getOpportunitySummary(ownerId: string, companyId: string): Promise<OpportunitySummary> {
  const all = await listOpportunities(ownerId, companyId);
  const open = all.filter(
    (item) => item.status !== "ARCHIVED" && item.status !== "REJECTED",
  );
  const active = open.filter((item) => item.status === "ACTIVE" || item.status === "IN_PROGRESS");
  const ranked = rankOpportunities(open.map((item) => ({ ...item, score: item.priorityScore })));
  const dimensionCount = new Map<string, number>();
  for (const item of active.length ? active : open) {
    if (!item.sourceDimensionLabel || item.sourceDimensionLabel === "—") continue;
    dimensionCount.set(item.sourceDimensionLabel, (dimensionCount.get(item.sourceDimensionLabel) ?? 0) + 1);
  }
  const topDimension =
    [...dimensionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const basis = active.length ? active : open;
  return {
    activeCount: active.length,
    totalCount: open.length,
    top: ranked[0] ?? null,
    topDimension,
    estimatedInvestmentTotal: basis.reduce((sum, item) => sum + (item.estimatedInvestment ?? 0), 0),
    expectedMonthlyReturnTotal: basis.reduce((sum, item) => sum + (item.expectedMonthlyReturn ?? 0), 0),
  };
}

export async function getTopOpportunities(ownerId: string, companyId: string, take = 3): Promise<OpportunityDTO[]> {
  const all = await listOpportunities(ownerId, companyId, { status: "ALL" });
  const open = all.filter((item) => item.status !== "ARCHIVED" && item.status !== "REJECTED");
  return rankOpportunities(open.map((item) => ({ ...item, score: item.priorityScore }))).slice(0, take);
}
