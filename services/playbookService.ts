import "server-only";

import {
  AuditSource,
  EvidenceLevel,
  KnowledgeKind,
  OpportunityOrigin,
  OpportunityStatus,
  PlaybookApplicationStatus,
  PlaybookOriginKind,
  PlaybookStatus,
  Prisma,
} from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import {
  PLAYBOOK_EMPTY,
  PLAYBOOK_PAGE_SIZE,
  alreadyEvaluatingCopy,
  calculatePlaybookCompatibility,
  draftPlaybookFromLearning,
  isActiveApplicationStatus,
  paginateItems,
  playbookEligibilityFromMemory,
  playbookEligibilityFromStrategy,
  playbookNeverBornValidated,
  relatedPlaybooksForConnection,
  transferClassification,
  type CompatibilityCompany,
} from "@/lib/playbook-engine";
import {
  PLAYBOOK_TRANSFER_VERSION,
  alreadyTestingCopy,
  assertTransition,
  buildAdaptation,
  buildTransferTimeline,
  buildTransversalLearning,
  calculatePlaybookCoverage,
  canTransitionApplication,
  compareOriginDestination,
  evidenceStaysLocal,
  knowledgeConnectionType,
  localHypothesis,
  mapResultPolarity,
  mapTransferSignals,
  strategyMultiContextCopy,
} from "@/lib/playbook-transfer-engine";
import { prisma } from "@/lib/prisma";
import { requireOwnedResource } from "@/lib/security/ownership";
import { writeAudit } from "@/services/auditService";
import { approveDecision, deferDecision, proposeDecision, rejectDecision } from "@/services/decisionService";
import { createExperiment, startExperiment, completeExperiment } from "@/services/experimentService";
import { createExecutionPlanFromOpportunity } from "@/services/executionService";
import { proposeMemoryFromEvidence } from "@/services/memoryService";
import { toOpportunityDTO, type OpportunityDTO } from "@/services/opportunityService";

export { PLAYBOOK_EMPTY };

export type PlaybookDTO = {
  id: string;
  ownerId: string;
  originCompanyId: string;
  originCompanyName: string;
  originSegment: string | null;
  strategyId: string | null;
  opportunityId: string | null;
  experimentId: string | null;
  evidenceId: string | null;
  memoryId: string | null;
  connectionId: string | null;
  title: string;
  family: string | null;
  description: string | null;
  problem: string | null;
  scenario: string | null;
  preconditions: string | null;
  audience: string | null;
  limitations: string | null;
  risks: string | null;
  steps: string[];
  durationDays: number | null;
  resources: string | null;
  observedInvestment: number | null;
  suggestedOwner: string | null;
  dependencies: string | null;
  primaryKpi: string | null;
  secondaryKpis: string[];
  baseline: number | null;
  target: number | null;
  observedResult: number | null;
  observedResultText: string | null;
  confidence: number | null;
  originKind: PlaybookOriginKind;
  status: PlaybookStatus;
  compatibleSegments: string[];
  requiredConditions: string | null;
  recommendedAdaptations: string | null;
  contrarySignals: string | null;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
};

export type PlaybookApplicationDTO = {
  id: string;
  playbookId: string;
  destinationCompanyId: string;
  destinationName: string;
  destinationSegment: string | null;
  opportunityId: string | null;
  decisionId: string | null;
  actionPlanId: string | null;
  experimentId: string | null;
  resultingEvidenceId: string | null;
  resultingMemoryId: string | null;
  status: PlaybookApplicationStatus;
  compatibilityScore: number | null;
  scorePartial: boolean;
  classification: KnowledgeKind;
  adaptedHypothesis: string | null;
  kpi: string | null;
  horizonDays: number | null;
  investment: number | null;
  proposedTarget: number | null;
  limitations: string | null;
  factorsUsed: string[];
  factorsMissing: string[];
  favorable: string[];
  contrary: string[];
  adaptations: Record<string, unknown> | null;
  differences: string[];
  reviewedAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  proposedAt: string | null;
};

function asStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function num(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

const includePlaybook = {
  originCompany: { select: { name: true, segment: true } },
  _count: { select: { applications: true } },
} as const;

function toPlaybookDTO(row: {
  id: string;
  ownerId: string;
  originCompanyId: string;
  strategyId: string | null;
  opportunityId: string | null;
  experimentId: string | null;
  evidenceId: string | null;
  memoryId: string | null;
  connectionId: string | null;
  title: string;
  family: string | null;
  description: string | null;
  problem: string | null;
  originSegment: string | null;
  scenario: string | null;
  preconditions: string | null;
  audience: string | null;
  limitations: string | null;
  risks: string | null;
  steps: Prisma.JsonValue | null;
  durationDays: number | null;
  resources: string | null;
  observedInvestment: Prisma.Decimal | null;
  suggestedOwner: string | null;
  dependencies: string | null;
  primaryKpi: string | null;
  secondaryKpis: Prisma.JsonValue | null;
  baseline: Prisma.Decimal | null;
  target: Prisma.Decimal | null;
  observedResult: Prisma.Decimal | null;
  observedResultText: string | null;
  confidence: number | null;
  originKind: PlaybookOriginKind;
  status: PlaybookStatus;
  compatibleSegments: Prisma.JsonValue | null;
  requiredConditions: string | null;
  recommendedAdaptations: string | null;
  contrarySignals: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  originCompany: { name: string; segment: string | null };
  _count: { applications: number };
}): PlaybookDTO {
  return {
    id: row.id,
    ownerId: row.ownerId,
    originCompanyId: row.originCompanyId,
    originCompanyName: row.originCompany.name,
    originSegment: row.originSegment ?? row.originCompany.segment,
    strategyId: row.strategyId,
    opportunityId: row.opportunityId,
    experimentId: row.experimentId,
    evidenceId: row.evidenceId,
    memoryId: row.memoryId,
    connectionId: row.connectionId,
    title: row.title,
    family: row.family,
    description: row.description,
    problem: row.problem,
    scenario: row.scenario,
    preconditions: row.preconditions,
    audience: row.audience,
    limitations: row.limitations,
    risks: row.risks,
    steps: asStringArray(row.steps),
    durationDays: row.durationDays,
    resources: row.resources,
    observedInvestment: num(row.observedInvestment),
    suggestedOwner: row.suggestedOwner,
    dependencies: row.dependencies,
    primaryKpi: row.primaryKpi,
    secondaryKpis: asStringArray(row.secondaryKpis),
    baseline: num(row.baseline),
    target: num(row.target),
    observedResult: num(row.observedResult),
    observedResultText: row.observedResultText,
    confidence: row.confidence,
    originKind: row.originKind,
    status: row.status,
    compatibleSegments: asStringArray(row.compatibleSegments),
    requiredConditions: row.requiredConditions,
    recommendedAdaptations: row.recommendedAdaptations,
    contrarySignals: row.contrarySignals,
    applicationCount: row._count.applications,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
  };
}

const includeApplication = {
  destination: { select: { name: true, segment: true } },
} as const;

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toApplicationDTO(row: {
  id: string;
  playbookId: string;
  destinationCompanyId: string;
  opportunityId: string | null;
  decisionId?: string | null;
  actionPlanId?: string | null;
  experimentId?: string | null;
  resultingEvidenceId?: string | null;
  resultingMemoryId?: string | null;
  status: PlaybookApplicationStatus;
  compatibilityScore: number | null;
  scorePartial: boolean;
  classification: KnowledgeKind;
  adaptedHypothesis: string | null;
  kpi: string | null;
  horizonDays: number | null;
  investment: Prisma.Decimal | null;
  proposedTarget?: Prisma.Decimal | null;
  limitations: string | null;
  factorsUsed: Prisma.JsonValue | null;
  factorsMissing: Prisma.JsonValue | null;
  favorable: Prisma.JsonValue | null;
  contrary: Prisma.JsonValue | null;
  adaptations?: Prisma.JsonValue | null;
  differences?: Prisma.JsonValue | null;
  reviewedAt?: Date | null;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  proposedAt?: Date | null;
  destination: { name: string; segment?: string | null };
}): PlaybookApplicationDTO {
  return {
    id: row.id,
    playbookId: row.playbookId,
    destinationCompanyId: row.destinationCompanyId,
    destinationName: row.destination.name,
    destinationSegment: row.destination.segment ?? null,
    opportunityId: row.opportunityId,
    decisionId: row.decisionId ?? null,
    actionPlanId: row.actionPlanId ?? null,
    experimentId: row.experimentId ?? null,
    resultingEvidenceId: row.resultingEvidenceId ?? null,
    resultingMemoryId: row.resultingMemoryId ?? null,
    status: row.status,
    compatibilityScore: row.compatibilityScore,
    scorePartial: row.scorePartial,
    classification: row.classification,
    adaptedHypothesis: row.adaptedHypothesis,
    kpi: row.kpi,
    horizonDays: row.horizonDays,
    investment: num(row.investment),
    proposedTarget: num(row.proposedTarget),
    limitations: row.limitations,
    factorsUsed: asStringArray(row.factorsUsed),
    factorsMissing: asStringArray(row.factorsMissing),
    favorable: asStringArray(row.favorable),
    contrary: asStringArray(row.contrary),
    adaptations: asRecord(row.adaptations ?? null),
    differences: asStringArray(row.differences),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    proposedAt: row.proposedAt?.toISOString() ?? null,
  };
}

export async function listPlaybooks(
  ownerId: string,
  filters: {
    companyId?: string;
    segment?: string;
    family?: string;
    kpi?: string;
    status?: string;
    page?: number;
  } = {},
) {
  const rows = await prisma.playbook.findMany({
    where: { ownerId },
    include: includePlaybook,
    orderBy: { updatedAt: "desc" },
    take: 400,
  });
  const mapped = rows.map(toPlaybookDTO);
  const visible = mapped.filter((item) => {
    if (filters.companyId && filters.companyId !== "ALL" && item.originCompanyId !== filters.companyId) return false;
    if (filters.segment && filters.segment !== "ALL" && item.originSegment !== filters.segment) return false;
    if (filters.family && filters.family !== "ALL" && item.family !== filters.family) return false;
    if (filters.kpi && filters.kpi !== "ALL" && item.primaryKpi !== filters.kpi) return false;
    if (filters.status && filters.status !== "ALL" && item.status !== filters.status) return false;
    return true;
  });
  const page = paginateItems(visible, filters.page ?? 1, PLAYBOOK_PAGE_SIZE);
  const companies = [...new Set(mapped.map((item) => item.originCompanyId))];
  const families = [...new Set(mapped.map((item) => item.family).filter(Boolean))];
  const testing = await prisma.playbookApplication.count({
    where: { ownerId, status: { in: [PlaybookApplicationStatus.CONFIRMADA, PlaybookApplicationStatus.EM_TESTE] } },
  });
  return {
    ...page,
    kpis: {
      playbooks: mapped.length,
      validated: mapped.filter((item) => item.status === "VALIDADO").length,
      review: mapped.filter((item) => item.status === "EM_REVISAO").length,
      originCompanies: companies.length,
      families: families.length,
      testing,
    },
    companies: mapped.map((item) => ({ id: item.originCompanyId, name: item.originCompanyName, segment: item.originSegment })),
  };
}

export async function getPlaybook(ownerId: string, id: string): Promise<PlaybookDTO> {
  await requireOwnedResource(ownerId, "playbook", id);
  const row = await prisma.playbook.findFirst({ where: { id, ownerId }, include: includePlaybook });
  if (!row) throw new AppError("NOT_FOUND");
  return toPlaybookDTO(row);
}

export async function getPlaybookDetail(ownerId: string, id: string, page = 1) {
  const playbook = await getPlaybook(ownerId, id);
  const [applicationRows, evidence, memory, companies] = await Promise.all([
    prisma.playbookApplication.findMany({
      where: { playbookId: id, ownerId },
      include: {
        destination: { select: { name: true, segment: true } },
        experiment: { select: { classification: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    playbook.evidenceId
      ? prisma.evidence.findFirst({
          where: { id: playbook.evidenceId, company: { ownerId } },
          select: { id: true, title: true, body: true, companyId: true, kind: true, classification: true },
        })
      : Promise.resolve(null),
    playbook.memoryId
      ? prisma.strategicMemory.findFirst({
          where: { id: playbook.memoryId, OR: [{ company: { ownerId } }, { authorId: ownerId }] },
          select: { id: true, title: true, lesson: true, companyId: true, validated: true, limitations: true },
        })
      : Promise.resolve(null),
    prisma.company.findMany({
      where: { ownerId, status: "ACTIVE" },
      select: { id: true, name: true, segment: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const applications = applicationRows.map(toApplicationDTO);
  const paged = paginateItems(applications, page, PLAYBOOK_PAGE_SIZE);
  const coverage = calculatePlaybookCoverage(
    applicationRows.map((item) => ({
      destinationCompanyId: item.destinationCompanyId,
      destinationSegment: item.destination.segment,
      status: item.status,
      classification: item.experiment?.classification ?? item.classification,
      resultingEvidenceId: item.resultingEvidenceId,
    })),
  );
  return {
    playbook,
    applications: paged.items,
    applicationTotal: applications.length,
    applicationPages: paged.pages,
    coverage,
    evidence,
    memory,
    companies,
    multiContextNote: playbook.strategyId ? strategyMultiContextCopy(coverage.segments) : null,
  };
}

async function destinationSignal(ownerId: string, companyId: string): Promise<CompatibilityCompany & {
  opportunityCount: number;
  experimentCount: number;
  memoryCount: number;
}> {
  await requireOwnedResource(ownerId, "company", companyId);
  const company = await prisma.company.findFirst({
    where: { id: companyId, ownerId },
    select: {
      id: true,
      name: true,
      segment: true,
      perceivedBottlenecks: true,
      teamSize: true,
      revenueMonthly: true,
      objectives: true,
      diagnoses: { orderBy: { createdAt: "desc" }, take: 1, select: { bottleneck: true } },
      _count: { select: { evidence: true, opportunities: true, experiments: true, memories: true } },
    },
  });
  if (!company) throw new AppError("FORBIDDEN");
  return {
    id: company.id,
    name: company.name,
    segment: company.segment,
    bottleneck: company.diagnoses[0]?.bottleneck ?? company.perceivedBottlenecks,
    hasDiagnosis: Boolean(company.diagnoses[0]),
    teamSize: company.teamSize,
    revenueMonthly: company.revenueMonthly != null ? Number(company.revenueMonthly) : null,
    objectives: company.objectives,
    evidenceCount: company._count.evidence,
    opportunityCount: company._count.opportunities,
    experimentCount: company._count.experiments,
    memoryCount: company._count.memories,
  };
}

export async function analyzePlaybookFit(ownerId: string, playbookId: string, companyId: string) {
  const playbook = await getPlaybook(ownerId, playbookId);
  if (playbook.originCompanyId === companyId) {
    throw new Error("A empresa destino precisa ser diferente da origem.");
  }
  const company = await destinationSignal(ownerId, companyId);
  const score = calculatePlaybookCompatibility({
    playbook: {
      originCompanyId: playbook.originCompanyId,
      originSegment: playbook.originSegment,
      family: playbook.family,
      problem: playbook.problem,
      audience: playbook.audience,
      primaryKpi: playbook.primaryKpi,
      observedInvestment: playbook.observedInvestment,
      requiredConditions: playbook.requiredConditions,
      contrarySignals: playbook.contrarySignals,
    },
    company,
  });
  const transferScore = mapTransferSignals({
    originProblem: playbook.problem,
    destBottleneck: company.bottleneck,
    destHasDiagnosis: company.hasDiagnosis,
    originSegment: playbook.originSegment,
    destSegment: company.segment,
    playbookKpi: playbook.primaryKpi,
    destTeamSize: company.teamSize,
    playbookInvestment: playbook.observedInvestment,
    destRevenue: company.revenueMonthly,
    destHasResources: company.teamSize == null && company.revenueMonthly == null ? null : Boolean(company.teamSize || company.revenueMonthly),
    destRelatedHistory: company.evidenceCount + company.opportunityCount + company.experimentCount + company.memoryCount > 0,
  });
  const adaptation = buildAdaptation({
    originalDuration: playbook.durationDays,
    originalInvestment: playbook.observedInvestment,
    originalTarget: playbook.target,
    originalChannel: playbook.audience,
    proposedDuration: playbook.durationDays,
    proposedInvestment: playbook.observedInvestment,
    proposedTarget: playbook.target,
    proposedChannel: playbook.audience,
  });
  return {
    company,
    score,
    transferScore,
    adaptation,
    comparison: compareOriginDestination({
      origin: {
        segmento: playbook.originSegment,
        kpi: playbook.primaryKpi,
        baseline: playbook.baseline,
        meta: playbook.target,
        resultado: playbook.observedResult,
        investimento: playbook.observedInvestment,
        duracao: playbook.durationDays,
      },
      destination: {
        segmento: company.segment,
        kpi: playbook.primaryKpi,
        baseline: null,
        meta: playbook.target,
        resultado: null,
        investimento: playbook.observedInvestment,
        duracao: playbook.durationDays,
      },
    }),
    transfer: transferClassification(),
    warning: "Na empresa destino isto permanece HIPÓTESE até um experimento medido.",
    evidenceRule: "Evidência da origem não é transferida.",
  };
}

export async function createPlaybookFromMemory(ownerId: string, memoryId: string) {
  await requireOwnedResource(ownerId, "memory", memoryId);
  const memory = await prisma.strategicMemory.findFirst({
    where: { id: memoryId },
    include: { company: { select: { id: true, ownerId: true, name: true, segment: true } } },
  });
  if (!memory?.company || memory.company.ownerId !== ownerId) throw new AppError("FORBIDDEN");
  const eligibility = playbookEligibilityFromMemory({
    status: memory.status,
    validated: memory.validated,
    evidenceId: memory.evidenceId,
    measuredResult: memory.measuredResult != null ? Number(memory.measuredResult) : null,
  });
  if (!eligibility.eligible) {
    throw new Error(`Não é possível criar playbook: ${eligibility.reasons.join(", ")}.`);
  }
  const existing = await prisma.playbook.findFirst({ where: { ownerId, memoryId } });
  if (existing) return toPlaybookDTO(await prisma.playbook.findFirstOrThrow({ where: { id: existing.id }, include: includePlaybook }));
  const draft = draftPlaybookFromLearning({
    title: memory.title,
    family: memory.family,
    problem: memory.context,
    lesson: memory.lesson,
    originCompanyName: memory.company.name,
    originSegment: memory.segment ?? memory.company.segment,
    kpi: memory.kpi,
    baseline: memory.baseline != null ? Number(memory.baseline) : null,
    target: memory.target != null ? Number(memory.target) : null,
    measuredResult: memory.measuredResult != null ? Number(memory.measuredResult) : null,
    investment: memory.investment != null ? Number(memory.investment) : null,
    limitations: memory.limitations,
    conditions: memory.conditions,
    audience: memory.context,
    durationDays: null,
  });
  const row = await prisma.playbook.create({
    data: {
      ownerId,
      originCompanyId: memory.company.id,
      createdById: ownerId,
      memoryId: memory.id,
      evidenceId: memory.evidenceId,
      experimentId: memory.experimentId,
      opportunityId: memory.opportunityId,
      strategyId: memory.strategyId,
      originKind: PlaybookOriginKind.MEMORY,
      status: PlaybookStatus.RASCUNHO,
      title: draft.title,
      family: draft.family,
      description: draft.description,
      problem: draft.problem,
      originSegment: memory.segment ?? memory.company.segment,
      scenario: draft.scenario,
      preconditions: memory.conditions,
      audience: memory.context,
      limitations: draft.limitations,
      steps: ["Revisar evidência da origem", "Adaptar ao contexto destino", "Definir KPI e prazo", "Testar com confirmação humana"],
      observedInvestment: memory.investment,
      primaryKpi: memory.kpi,
      baseline: memory.baseline,
      target: memory.target,
      observedResult: memory.measuredResult,
      confidence: memory.confidence === "HIGH" ? 80 : memory.confidence === "MEDIUM" ? 55 : 30,
      requiredConditions: memory.conditions,
      recommendedAdaptations: draft.recommendedAdaptations,
      contrarySignals: "Diferenças de segmento, público e capacidade invalidam cópia automática.",
    },
    include: includePlaybook,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.originCompanyId,
    action: "playbook.created",
    entity: "Playbook",
    entityId: row.id,
    newValue: { origin: "MEMORY", status: playbookNeverBornValidated() },
  });
  return toPlaybookDTO(row);
}

export async function createPlaybookFromStrategy(ownerId: string, strategyId: string) {
  await requireOwnedResource(ownerId, "strategy", strategyId);
  const strategy = await prisma.strategy.findFirst({
    where: { id: strategyId, ownerId },
    include: { company: { select: { name: true, segment: true } } },
  });
  if (!strategy) throw new AppError("NOT_FOUND");
  const evidenceCount = asStringArray(strategy.evidenceIds).length;
  const experiment = await prisma.experiment.findFirst({
    where: { strategyId: strategy.id, company: { ownerId }, finalValue: { not: null } },
    select: { id: true, finalValue: true, baseline: true, target: true, kpi: true, investment: true },
  });
  const eligibility = playbookEligibilityFromStrategy({
    status: strategy.status,
    evidenceCount,
    measuredResult: experiment?.finalValue != null ? Number(experiment.finalValue) : null,
  });
  if (!eligibility.eligible) {
    throw new Error(`Não é possível criar playbook: ${eligibility.reasons.join(", ")}.`);
  }
  const existing = await prisma.playbook.findFirst({ where: { ownerId, strategyId } });
  if (existing) return toPlaybookDTO(await prisma.playbook.findFirstOrThrow({ where: { id: existing.id }, include: includePlaybook }));
  const draft = draftPlaybookFromLearning({
    title: strategy.title,
    family: strategy.mechanism,
    problem: strategy.problem,
    lesson: strategy.hypothesis,
    originCompanyName: strategy.company.name,
    originSegment: strategy.company.segment,
    kpi: strategy.primaryKpi,
    baseline: experiment?.baseline != null ? Number(experiment.baseline) : null,
    target: experiment?.target != null ? Number(experiment.target) : null,
    measuredResult: experiment?.finalValue != null ? Number(experiment.finalValue) : null,
    investment: strategy.estimatedInvestment != null ? Number(strategy.estimatedInvestment) : null,
    limitations: "Estratégia validada na origem. No destino continua hipótese.",
    conditions: null,
    audience: strategy.audience,
    durationDays: strategy.testHorizonDays,
  });
  const row = await prisma.playbook.create({
    data: {
      ownerId,
      originCompanyId: strategy.companyId,
      createdById: ownerId,
      strategyId: strategy.id,
      opportunityId: strategy.opportunityId,
      experimentId: experiment?.id,
      connectionId: strategy.connectionId,
      originKind: PlaybookOriginKind.STRATEGY,
      status: PlaybookStatus.RASCUNHO,
      title: draft.title,
      family: draft.family,
      description: draft.description,
      problem: draft.problem,
      originSegment: strategy.company.segment,
      scenario: draft.scenario,
      audience: strategy.audience,
      limitations: draft.limitations,
      steps: ["Revisar resultado medido", "Mapear diferenças do destino", "Confirmar teste humano"],
      durationDays: strategy.testHorizonDays,
      observedInvestment: strategy.estimatedInvestment,
      primaryKpi: strategy.primaryKpi,
      secondaryKpis: strategy.secondaryKpi ? [strategy.secondaryKpi] : [],
      baseline: experiment?.baseline,
      target: experiment?.target,
      observedResult: experiment?.finalValue,
      recommendedAdaptations: draft.recommendedAdaptations,
    },
    include: includePlaybook,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.originCompanyId,
    action: "playbook.created",
    entity: "Playbook",
    entityId: row.id,
    newValue: { origin: "STRATEGY", status: "RASCUNHO" },
  });
  return toPlaybookDTO(row);
}

export async function submitPlaybook(ownerId: string, id: string) {
  const current = await getPlaybook(ownerId, id);
  if (current.status === "ARQUIVADO" || current.status === "VALIDADO") return current;
  const row = await prisma.playbook.update({
    where: { id },
    data: { status: PlaybookStatus.EM_REVISAO, reviewedAt: new Date(), reviewedById: ownerId },
    include: includePlaybook,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.originCompanyId,
    action: "playbook.submitted",
    entity: "Playbook",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toPlaybookDTO(row);
}

export async function approvePlaybook(ownerId: string, id: string, confirmed: boolean) {
  if (!confirmed) throw new Error("Confirme a revisão humana.");
  const current = await getPlaybook(ownerId, id);
  if (!current.evidenceId) {
    throw new Error("Evidência é obrigatória para validar o registro do playbook.");
  }
  const row = await prisma.playbook.update({
    where: { id },
    data: { status: PlaybookStatus.VALIDADO, approvedAt: new Date(), approvedById: ownerId },
    include: includePlaybook,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.originCompanyId,
    action: "playbook.approved",
    entity: "Playbook",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status, note: "Registro suportado por evidência — não é garantia universal." },
  });
  return toPlaybookDTO(row);
}

export async function archivePlaybook(ownerId: string, id: string) {
  await getPlaybook(ownerId, id);
  const row = await prisma.playbook.update({
    where: { id },
    data: { status: PlaybookStatus.ARQUIVADO, archivedAt: new Date() },
    include: includePlaybook,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.originCompanyId,
    action: "playbook.archived",
    entity: "Playbook",
    entityId: row.id,
    newValue: { status: row.status },
  });
  return toPlaybookDTO(row);
}

export async function proposePlaybookApplication(
  ownerId: string,
  playbookId: string,
  destinationCompanyId: string,
  input: { kpi?: string; horizonDays?: number; investment?: number; hypothesis?: string; target?: number; channel?: string },
) {
  const playbook = await getPlaybook(ownerId, playbookId);
  const fit = await analyzePlaybookFit(ownerId, playbookId, destinationCompanyId);
  const existing = await prisma.playbookApplication.findUnique({
    where: { playbookId_destinationCompanyId: { playbookId, destinationCompanyId } },
    include: includeApplication,
  });
  if (existing && isActiveApplicationStatus(existing.status)) {
    return {
      application: toApplicationDTO(existing),
      alreadyActive: true as const,
      message: existing.status === "PROPOSTA" ? alreadyEvaluatingCopy() : alreadyTestingCopy(),
    };
  }
  const adaptation = buildAdaptation({
    originalDuration: playbook.durationDays,
    originalInvestment: playbook.observedInvestment,
    originalTarget: playbook.target,
    originalChannel: playbook.audience,
    proposedDuration: input.horizonDays ?? playbook.durationDays,
    proposedInvestment: input.investment ?? playbook.observedInvestment,
    proposedTarget: input.target ?? playbook.target,
    proposedChannel: input.channel ?? playbook.audience,
  });
  const data = {
    ownerId,
    playbookId,
    destinationCompanyId,
    status: PlaybookApplicationStatus.PROPOSTA,
    compatibilityScore: fit.transferScore.score,
    scorePartial: fit.transferScore.partial,
    scoreVersion: PLAYBOOK_TRANSFER_VERSION,
    scoredAt: new Date(),
    factorsUsed: fit.transferScore.favorable,
    factorsMissing: fit.transferScore.missing,
    favorable: fit.transferScore.favorable,
    contrary: fit.transferScore.differences,
    differences: fit.transferScore.differences,
    adaptations: adaptation,
    limitations: fit.transferScore.caption,
    adaptedHypothesis:
      input.hypothesis?.trim() || localHypothesis(playbook.title, fit.company.name, input.horizonDays ?? playbook.durationDays),
    kpi: input.kpi?.trim() || playbook.primaryKpi,
    horizonDays: input.horizonDays ?? playbook.durationDays,
    investment: input.investment ?? playbook.observedInvestment,
    proposedTarget: input.target ?? playbook.target,
    classification: KnowledgeKind.HYPOTHESIS,
    rejectedAt: null,
    completedAt: null,
  };
  let row;
  try {
    row = existing
      ? await prisma.playbookApplication.update({
          where: { id: existing.id },
          data,
          include: includeApplication,
        })
      : await prisma.playbookApplication.create({
          data,
          include: includeApplication,
        });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code !== "P2002") throw error;
    const raced = await prisma.playbookApplication.findUniqueOrThrow({
      where: { playbookId_destinationCompanyId: { playbookId, destinationCompanyId } },
      include: includeApplication,
    });
    return { application: toApplicationDTO(raced), alreadyActive: true as const, message: alreadyEvaluatingCopy() };
  }
  await writeAudit({
    actorId: ownerId,
    companyId: destinationCompanyId,
    action: "playbook.application.created",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { playbookId, destinationCompanyId, classification: "HIPOTESE", origin: "PLAYBOOK_APPLICATION" },
  });
  await writeAudit({
    actorId: ownerId,
    companyId: destinationCompanyId,
    action: "playbook.application.compatibility.calculated",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { score: fit.transferScore.score, partial: fit.transferScore.partial, version: PLAYBOOK_TRANSFER_VERSION },
  });
  return { application: toApplicationDTO(row), alreadyActive: false as const, message: null };
}

export async function confirmPlaybookApplication(ownerId: string, applicationId: string, confirmed: boolean): Promise<{
  application: PlaybookApplicationDTO;
  opportunity: OpportunityDTO;
  alreadyActive?: boolean;
  message?: string;
}> {
  if (!confirmed) throw new Error("Confirme a criação da oportunidade.");
  const current = await prisma.playbookApplication.findFirst({
    where: { id: applicationId, ownerId },
    include: { ...includeApplication, playbook: true },
  });
  if (!current) throw new AppError("NOT_FOUND");
  await requireOwnedResource(ownerId, "company", current.destinationCompanyId);
  if (current.opportunityId) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: current.opportunityId, company: { ownerId } },
    });
    if (opportunity) {
      return {
        application: toApplicationDTO(current),
        opportunity: toOpportunityDTO(opportunity, null),
        alreadyActive: true,
        message: alreadyEvaluatingCopy(),
      };
    }
  }
  if (!canTransitionApplication(current.status, PlaybookApplicationStatus.CONFIRMADA) && current.status !== PlaybookApplicationStatus.CONFIRMADA) {
    assertTransition(current.status, PlaybookApplicationStatus.CONFIRMADA);
  }
  const playbook = current.playbook;
  const opportunity = await prisma.opportunity.create({
    data: {
      companyId: current.destinationCompanyId,
      createdById: ownerId,
      origin: OpportunityOrigin.PLAYBOOK,
      title: playbook.title,
      description: playbook.description,
      problemStatement: playbook.problem,
      hypothesis: current.adaptedHypothesis,
      expectedImpact: 3,
      urgency: 3,
      confidence: 2,
      effort: 3,
      investment: current.investment,
      status: OpportunityStatus.DRAFT,
      evidenceLevel: EvidenceLevel.HYPOTHESIS,
    },
  });
  const claimed = await prisma.playbookApplication.updateMany({
    where: { id: current.id, opportunityId: null },
    data: {
      status: PlaybookApplicationStatus.CONFIRMADA,
      opportunityId: opportunity.id,
      confirmedAt: new Date(),
      classification: KnowledgeKind.HYPOTHESIS,
    },
  });
  if (claimed.count === 0) {
    await prisma.opportunity.delete({ where: { id: opportunity.id } }).catch(() => undefined);
    const raced = await prisma.playbookApplication.findFirstOrThrow({
      where: { id: current.id, ownerId },
      include: includeApplication,
    });
    const existingOpp = raced.opportunityId
      ? await prisma.opportunity.findFirst({ where: { id: raced.opportunityId, company: { ownerId } } })
      : null;
    if (!existingOpp) throw new AppError("NOT_FOUND");
    return {
      application: toApplicationDTO(raced),
      opportunity: toOpportunityDTO(existingOpp, null),
      alreadyActive: true,
      message: alreadyEvaluatingCopy(),
    };
  }
  const row = await prisma.playbookApplication.findFirstOrThrow({
    where: { id: current.id },
    include: includeApplication,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: current.destinationCompanyId,
    action: "playbook.application.confirmed",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { opportunityId: opportunity.id, evidenceLevel: "HYPOTHESIS", transferredEvidence: false },
  });
  return { application: toApplicationDTO(row), opportunity: toOpportunityDTO(opportunity, null) };
}

export async function rejectPlaybookApplication(ownerId: string, applicationId: string, confirmed: boolean) {
  if (!confirmed) throw new Error("Confirme a rejeição.");
  const current = await prisma.playbookApplication.findFirst({ where: { id: applicationId, ownerId } });
  if (!current) throw new AppError("NOT_FOUND");
  const row = await prisma.playbookApplication.update({
    where: { id: applicationId },
    data: { status: PlaybookApplicationStatus.REJEITADA, rejectedAt: new Date() },
    include: includeApplication,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: current.destinationCompanyId,
    action: "playbook.application.rejected",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { status: row.status },
  });
  return toApplicationDTO(row);
}

export async function listRelatedPlaybooksForConnection(
  ownerId: string,
  input: { fromId: string; toId: string; fromSegment: string | null; toSegment: string | null; type: string },
) {
  const playbooks = await prisma.playbook.findMany({
    where: { ownerId, status: { not: PlaybookStatus.ARQUIVADO } },
    select: {
      id: true,
      title: true,
      family: true,
      originSegment: true,
      applications: { select: { destinationCompanyId: true, status: true } },
    },
    take: 40,
  });
  return relatedPlaybooksForConnection({
    fromSegment: input.fromSegment,
    toSegment: input.toSegment,
    type: input.type,
    playbooks: playbooks.map((item) => ({
      id: item.id,
      title: item.title,
      family: item.family,
      originSegment: item.originSegment,
      testedCompanyIds: item.applications.filter((app) => isActiveApplicationStatus(app.status)).map((app) => app.destinationCompanyId),
      destinationId: input.toId,
    })),
  });
}

export async function getPlaybookForStrategy(ownerId: string, strategyId: string) {
  const playbook = await prisma.playbook.findFirst({
    where: { ownerId, strategyId },
    select: {
      id: true,
      title: true,
      status: true,
      applications: {
        select: {
          destinationCompanyId: true,
          status: true,
          classification: true,
          resultingEvidenceId: true,
          destination: { select: { segment: true } },
          experiment: { select: { classification: true } },
        },
      },
    },
  });
  if (!playbook) return null;
  const coverage = calculatePlaybookCoverage(
    playbook.applications.map((item) => ({
      destinationCompanyId: item.destinationCompanyId,
      destinationSegment: item.destination.segment,
      status: item.status,
      classification: item.experiment?.classification ?? item.classification,
      resultingEvidenceId: item.resultingEvidenceId,
    })),
  );
  return {
    id: playbook.id,
    title: playbook.title,
    status: playbook.status,
    multiContextNote: strategyMultiContextCopy(coverage.segments),
  };
}

export async function getCockpitPlaybookSummary(ownerId: string) {
  const [validated, testing, awaitingDecision, pendingResults, companies] = await Promise.all([
    prisma.playbook.count({ where: { ownerId, status: PlaybookStatus.VALIDADO } }),
    prisma.playbookApplication.count({
      where: {
        ownerId,
        status: {
          in: [
            PlaybookApplicationStatus.CONFIRMADA,
            PlaybookApplicationStatus.APROVADA,
            PlaybookApplicationStatus.PLANEJADA,
            PlaybookApplicationStatus.EM_TESTE,
          ],
        },
      },
    }),
    prisma.playbookApplication.count({
      where: { ownerId, status: PlaybookApplicationStatus.AGUARDANDO_APROVACAO },
    }),
    prisma.playbookApplication.count({
      where: { ownerId, status: { in: [PlaybookApplicationStatus.EM_TESTE, PlaybookApplicationStatus.PLANEJADA] } },
    }),
    prisma.company.count({ where: { ownerId, status: "ACTIVE" } }),
  ]);
  return { validated, testing, awaitingDecision, pendingResults, companies };
}

export async function listOwnerPlaybooksForAi(ownerId: string, companyId?: string) {
  return prisma.playbook.findMany({
    where: {
      ownerId,
      status: { not: PlaybookStatus.ARQUIVADO },
      ...(companyId ? { OR: [{ originCompanyId: companyId }, { applications: { some: { destinationCompanyId: companyId } } }] } : {}),
    },
    select: {
      title: true,
      family: true,
      status: true,
      originSegment: true,
      problem: true,
      primaryKpi: true,
      originCompany: { select: { name: true } },
      applications: {
        select: {
          status: true,
          classification: true,
          resultingEvidenceId: true,
          destination: { select: { name: true, segment: true } },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
      },
    },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });
}

async function ownedApplication(ownerId: string, applicationId: string) {
  await requireOwnedResource(ownerId, "playbookApplication", applicationId);
  const row = await prisma.playbookApplication.findFirst({
    where: { id: applicationId, ownerId },
    include: { ...includeApplication, playbook: true },
  });
  if (!row) throw new AppError("NOT_FOUND");
  return row;
}

async function persistApplicationStatus(
  ownerId: string,
  applicationId: string,
  from: string,
  to: PlaybookApplicationStatus,
  data: Prisma.PlaybookApplicationUpdateInput,
  action: string,
  extra?: Record<string, unknown>,
) {
  assertTransition(from, to);
  const claimed = await prisma.playbookApplication.updateMany({
    where: { id: applicationId, ownerId, status: from as PlaybookApplicationStatus },
    data: { ...data, status: to } as Prisma.PlaybookApplicationUpdateManyMutationInput,
  });
  if (claimed.count === 0) {
    const current = await ownedApplication(ownerId, applicationId);
    return toApplicationDTO(current);
  }
  const row = await prisma.playbookApplication.findFirstOrThrow({
    where: { id: applicationId, ownerId },
    include: includeApplication,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.destinationCompanyId,
    action,
    entity: "PlaybookApplication",
    entityId: row.id,
    previousValue: { status: from },
    newValue: { status: to, ...extra },
  });
  return toApplicationDTO(row);
}

export async function reviewPlaybookApplication(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  const next =
    current.status === PlaybookApplicationStatus.PROPOSTA
      ? PlaybookApplicationStatus.REVISADA
      : current.status === PlaybookApplicationStatus.AGUARDANDO_APROVACAO
        ? PlaybookApplicationStatus.REVISADA
        : null;
  if (!next) return toApplicationDTO(current);
  return persistApplicationStatus(ownerId, applicationId, current.status, next, { reviewedAt: new Date() }, "playbook.application.reviewed");
}

export async function requestPlaybookApplicationDecision(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  if (current.decisionId) {
    return { application: toApplicationDTO(current), alreadyActive: true as const };
  }
  if (!current.opportunityId) {
    const confirmed = await confirmPlaybookApplication(ownerId, applicationId, true);
    current.opportunityId = confirmed.opportunity.id;
    current.status = confirmed.application.status;
  }
  const decision = await proposeDecision({
    createdById: ownerId,
    companyId: current.destinationCompanyId,
    opportunityId: current.opportunityId ?? undefined,
    title: `Testar playbook: ${current.playbook.title}`,
    rationale: [
      current.adaptedHypothesis,
      `KPI: ${current.kpi ?? "sem dados"}`,
      `Investimento: ${current.investment ?? "sem dados"}`,
      `Prazo: ${current.horizonDays ?? "sem dados"} dias`,
      `Compatibilidade: ${current.compatibilityScore ?? "parcial"}/100`,
      "A IA não aprova. Evidência da origem não transfere.",
    ]
      .filter(Boolean)
      .join(" · "),
    origin: AuditSource.USER,
  });
  const claimed = await prisma.playbookApplication.updateMany({
    where: { id: current.id, decisionId: null },
    data: {
      decisionId: decision.id,
      status: canTransitionApplication(current.status, PlaybookApplicationStatus.AGUARDANDO_APROVACAO)
        ? PlaybookApplicationStatus.AGUARDANDO_APROVACAO
        : current.status,
    },
  });
  if (claimed.count === 0) {
    return { application: toApplicationDTO(await ownedApplication(ownerId, applicationId)), alreadyActive: true as const };
  }
  const row = await ownedApplication(ownerId, applicationId);
  await writeAudit({
    actorId: ownerId,
    companyId: row.destinationCompanyId,
    action: "playbook.application.reviewed",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { decisionId: decision.id, status: row.status },
  });
  return { application: toApplicationDTO(row), alreadyActive: false as const };
}

export async function decidePlaybookApplication(
  ownerId: string,
  applicationId: string,
  action: "approve" | "reject" | "defer" | "review",
  humanReason?: string,
) {
  const current = await ownedApplication(ownerId, applicationId);
  if (!current.decisionId) {
    await requestPlaybookApplicationDecision(ownerId, applicationId);
  }
  const fresh = await ownedApplication(ownerId, applicationId);
  if (!fresh.decisionId) throw new Error("Decisão humana é obrigatória.");
  if (action === "review") {
    await reviewPlaybookApplication(ownerId, applicationId);
    return toApplicationDTO(await ownedApplication(ownerId, applicationId));
  }
  if (action === "defer") {
    await deferDecision({ actorId: ownerId, decisionId: fresh.decisionId });
    return toApplicationDTO(fresh);
  }
  if (action === "reject") {
    await rejectDecision({ actorId: ownerId, decisionId: fresh.decisionId, humanReason });
    return persistApplicationStatus(
      ownerId,
      applicationId,
      fresh.status,
      PlaybookApplicationStatus.REJEITADA,
      { rejectedAt: new Date() },
      "playbook.application.rejected",
    );
  }
  await approveDecision({ actorId: ownerId, decisionId: fresh.decisionId, humanReason });
  if (!fresh.opportunityId) {
    await confirmPlaybookApplication(ownerId, applicationId, true);
  }
  const after = await ownedApplication(ownerId, applicationId);
  const target = canTransitionApplication(after.status, PlaybookApplicationStatus.APROVADA)
    ? PlaybookApplicationStatus.APROVADA
    : after.status;
  if (target === after.status) {
    await writeAudit({
      actorId: ownerId,
      companyId: after.destinationCompanyId,
      action: "playbook.application.approved",
      entity: "PlaybookApplication",
      entityId: after.id,
      newValue: { status: after.status, decisionId: after.decisionId },
    });
    return toApplicationDTO(after);
  }
  return persistApplicationStatus(
    ownerId,
    applicationId,
    after.status,
    PlaybookApplicationStatus.APROVADA,
    {},
    "playbook.application.approved",
  );
}

export async function createPlaybookApplicationPlan(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  if (current.actionPlanId) {
    return { application: toApplicationDTO(current), alreadyActive: true as const };
  }
  if (!current.opportunityId) {
    const confirmed = await confirmPlaybookApplication(ownerId, applicationId, true);
    current.opportunityId = confirmed.opportunity.id;
  }
  const plan = await createExecutionPlanFromOpportunity(ownerId, current.destinationCompanyId, {
    companyId: current.destinationCompanyId,
    opportunityId: current.opportunityId!,
    title: `Teste · ${current.playbook.title}`,
    summary: current.adaptedHypothesis ?? "Plano de teste local. Ainda hipótese.",
    goal30: `Preparar e iniciar o teste de “${current.playbook.title}” com KPI ${current.kpi ?? "a definir"}.`,
    goal60: "Acompanhar medições do experimento de transferência sem concluir evidência antecipada.",
    goal90: "Registrar resultado medido e só então avaliar evidência local.",
  });
  const claimed = await prisma.playbookApplication.updateMany({
    where: { id: current.id, actionPlanId: null },
    data: {
      actionPlanId: plan.id,
      decisionId: current.decisionId ?? plan.decisionId,
      status: canTransitionApplication(current.status, PlaybookApplicationStatus.PLANEJADA)
        ? PlaybookApplicationStatus.PLANEJADA
        : current.status,
    },
  });
  if (claimed.count === 0) {
    return { application: toApplicationDTO(await ownedApplication(ownerId, applicationId)), alreadyActive: true as const };
  }
  const row = await ownedApplication(ownerId, applicationId);
  await writeAudit({
    actorId: ownerId,
    companyId: row.destinationCompanyId,
    action: "playbook.application.plan.created",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { actionPlanId: plan.id },
  });
  return { application: toApplicationDTO(row), alreadyActive: false as const };
}

export async function createPlaybookApplicationExperiment(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  if (current.experimentId) {
    return { application: toApplicationDTO(current), alreadyActive: true as const };
  }
  if (!current.opportunityId) {
    const confirmed = await confirmPlaybookApplication(ownerId, applicationId, true);
    current.opportunityId = confirmed.opportunity.id;
  }
  const startedAt = new Date();
  const plannedEndAt = current.horizonDays ? new Date(startedAt.getTime() + current.horizonDays * 86400000) : undefined;
  const experiment = await createExperiment(ownerId, {
    companyId: current.destinationCompanyId,
    opportunityId: current.opportunityId ?? undefined,
    actionPlanId: current.actionPlanId ?? undefined,
    title: `Transferência · ${current.playbook.title}`,
    hypothesis: current.adaptedHypothesis || localHypothesis(current.playbook.title, current.destination.name, current.horizonDays),
    kpi: current.kpi || "resultado do teste",
    direction: "HIGHER_IS_BETTER",
    baseline: num(current.playbook.baseline) ?? undefined,
    target: num(current.proposedTarget) ?? num(current.playbook.target) ?? undefined,
    investment: num(current.investment) ?? undefined,
    startedAt,
    plannedEndAt,
    testDescription: "Experimento local da empresa destino. Evidência da origem não transfere.",
    successCriteria: current.playbook.primaryKpi
      ? `Medir ${current.playbook.primaryKpi} no prazo. Meta não atingida não é fracasso automático.`
      : "Registrar resultado medido segundo o critério definido.",
    notes: "Origem PLAYBOOK_APPLICATION. Classificação permanece HIPÓTESE até a medição.",
  });
  const started = await startExperiment(ownerId, current.destinationCompanyId, experiment.id);
  const claimed = await prisma.playbookApplication.updateMany({
    where: { id: current.id, experimentId: null },
    data: {
      experimentId: started.id,
      status: canTransitionApplication(current.status, PlaybookApplicationStatus.EM_TESTE)
        ? PlaybookApplicationStatus.EM_TESTE
        : PlaybookApplicationStatus.EM_TESTE,
    },
  });
  if (claimed.count === 0) {
    return { application: toApplicationDTO(await ownedApplication(ownerId, applicationId)), alreadyActive: true as const };
  }
  await ensureKnowledgeTransferConnection(ownerId, current.playbook.originCompanyId, current.destinationCompanyId, current.playbookId);
  const row = await ownedApplication(ownerId, applicationId);
  await writeAudit({
    actorId: ownerId,
    companyId: row.destinationCompanyId,
    action: "playbook.application.experiment.created",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { experimentId: started.id },
  });
  return { application: toApplicationDTO(row), alreadyActive: false as const };
}

export async function recordPlaybookApplicationResult(
  ownerId: string,
  applicationId: string,
  input: { finalValue: number; realizedInvestment?: number; realizedReturn?: number; notes?: string },
) {
  const current = await ownedApplication(ownerId, applicationId);
  if (!current.experimentId) {
    await createPlaybookApplicationExperiment(ownerId, applicationId);
  }
  const fresh = await ownedApplication(ownerId, applicationId);
  if (!fresh.experimentId) throw new Error("Experimento é obrigatório para medir o destino.");
  if (fresh.resultingEvidenceId) {
    return { application: toApplicationDTO(fresh), alreadyActive: true as const };
  }
  await completeExperiment(ownerId, {
    companyId: fresh.destinationCompanyId,
    experimentId: fresh.experimentId,
    finalValue: input.finalValue,
    realizedInvestment: input.realizedInvestment,
    realizedReturn: input.realizedReturn,
    notes: input.notes,
  });
  const experiment = await prisma.experiment.findFirst({
    where: { id: fresh.experimentId, company: { ownerId } },
    include: { evidence: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const evidenceId = experiment?.evidence[0]?.id ?? null;
  if (evidenceId && experiment?.companyId) {
    if (!evidenceStaysLocal(fresh.playbook.originCompanyId, fresh.destinationCompanyId, experiment.companyId)) {
      throw new Error("Evidência da origem não pode virar evidência do destino.");
    }
  }
  await prisma.playbookApplication.updateMany({
    where: { id: fresh.id, resultingEvidenceId: null },
    data: {
      resultingEvidenceId: evidenceId,
      status: PlaybookApplicationStatus.MEDIDA,
      classification: KnowledgeKind.EVIDENCE,
    },
  });
  const row = await ownedApplication(ownerId, applicationId);
  await writeAudit({
    actorId: ownerId,
    companyId: row.destinationCompanyId,
    action: "playbook.application.result.recorded",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { experimentId: row.experimentId, polarity: mapResultPolarity(experiment?.classification) },
  });
  if (evidenceId) {
    await writeAudit({
      actorId: ownerId,
      companyId: row.destinationCompanyId,
      action: "playbook.application.evidence.created",
      entity: "PlaybookApplication",
      entityId: row.id,
      newValue: { resultingEvidenceId: evidenceId, companyId: row.destinationCompanyId, local: true },
    });
  }
  return { application: toApplicationDTO(row), alreadyActive: false as const };
}

export async function proposePlaybookApplicationMemory(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  if (current.resultingMemoryId) {
    return { application: toApplicationDTO(current), alreadyActive: true as const };
  }
  if (!current.resultingEvidenceId) {
    throw new Error("Memória local exige evidência medida na empresa destino.");
  }
  const memory = await proposeMemoryFromEvidence(ownerId, {
    companyId: current.destinationCompanyId,
    evidenceId: current.resultingEvidenceId,
    title: `Aprendizado local · ${current.playbook.title}`,
    lesson:
      current.adaptedHypothesis ||
      `${current.playbook.title} foi testado em ${current.destination.name}. Proposta de memória — ainda não validada.`,
  });
  await prisma.playbookApplication.updateMany({
    where: { id: current.id, resultingMemoryId: null },
    data: { resultingMemoryId: memory.id },
  });
  const row = await ownedApplication(ownerId, applicationId);
  await writeAudit({
    actorId: ownerId,
    companyId: row.destinationCompanyId,
    action: "playbook.application.memory.proposed",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { resultingMemoryId: memory.id, status: "PROPOSED" },
  });
  return { application: toApplicationDTO(row), alreadyActive: false as const };
}

export async function completePlaybookApplication(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  if (current.status === PlaybookApplicationStatus.CONCLUIDA) return toApplicationDTO(current);
  if (!current.resultingEvidenceId) {
    throw new Error("Conclusão exige evidência local medida na empresa destino.");
  }
  const row = await persistApplicationStatus(
    ownerId,
    applicationId,
    current.status,
    PlaybookApplicationStatus.CONCLUIDA,
    { completedAt: new Date() },
    "playbook.application.completed",
  );
  return row;
}

export async function getPlaybookApplicationWorkspace(ownerId: string, applicationId: string) {
  const current = await ownedApplication(ownerId, applicationId);
  const application = toApplicationDTO(current);
  const playbook = await getPlaybook(ownerId, current.playbookId);
  const timeline = buildTransferTimeline({
    proposedAt: application.proposedAt,
    reviewedAt: application.reviewedAt,
    decisionId: application.decisionId,
    approvedAt: application.status === "APROVADA" || application.status === "PLANEJADA" || application.status === "EM_TESTE" || application.status === "MEDIDA" || application.status === "CONCLUIDA" ? application.reviewedAt : null,
    actionPlanId: application.actionPlanId,
    experimentId: application.experimentId,
    resultingEvidenceId: application.resultingEvidenceId,
    resultingMemoryId: application.resultingMemoryId,
    completedAt: application.completedAt,
    confirmedAt: application.confirmedAt,
  });
  const originEvidence = playbook.evidenceId
    ? await prisma.evidence.findFirst({
        where: { id: playbook.evidenceId, company: { ownerId } },
        select: { id: true, companyId: true, title: true, classification: true },
      })
    : null;
  const destEvidence = application.resultingEvidenceId
    ? await prisma.evidence.findFirst({
        where: { id: application.resultingEvidenceId, company: { ownerId } },
        select: { id: true, companyId: true, title: true, classification: true, body: true },
      })
    : null;
  const destExperiment = application.experimentId
    ? await prisma.experiment.findFirst({
        where: { id: application.experimentId, company: { ownerId } },
        select: {
          id: true,
          companyId: true,
          kpi: true,
          baseline: true,
          target: true,
          finalValue: true,
          investment: true,
          realizedInvestment: true,
          classification: true,
        },
      })
    : null;
  const learning = buildTransversalLearning({
    originName: playbook.originCompanyName,
    destinationName: application.destinationName,
    origin: {
      segmento: playbook.originSegment,
      kpi: playbook.primaryKpi,
      baseline: playbook.baseline,
      meta: playbook.target,
      resultado: playbook.observedResult,
      investimento: playbook.observedInvestment,
      duracao: playbook.durationDays,
    },
    destination: {
      segmento: application.destinationSegment,
      kpi: destExperiment?.kpi ?? application.kpi,
      baseline: destExperiment?.baseline != null ? Number(destExperiment.baseline) : null,
      meta: destExperiment?.target != null ? Number(destExperiment.target) : application.proposedTarget,
      resultado: destExperiment?.finalValue != null ? Number(destExperiment.finalValue) : null,
      investimento: destExperiment?.realizedInvestment != null ? Number(destExperiment.realizedInvestment) : application.investment,
      duracao: application.horizonDays,
    },
    originPolarity: originEvidence?.classification,
    destinationPolarity: destExperiment?.classification ?? destEvidence?.classification,
  });
  return {
    playbook,
    application,
    timeline,
    learning,
    originEvidence,
    destEvidence,
    destExperiment,
    polarity: mapResultPolarity(destExperiment?.classification ?? destEvidence?.classification),
    evidenceStaysLocal: destEvidence?.companyId
      ? evidenceStaysLocal(playbook.originCompanyId, application.destinationCompanyId, destEvidence.companyId)
      : true,
  };
}

export async function listPlaybookTransferPriorities(ownerId: string) {
  const rows = await prisma.playbookApplication.findMany({
    where: {
      ownerId,
      status: {
        in: [
          PlaybookApplicationStatus.PROPOSTA,
          PlaybookApplicationStatus.REVISADA,
          PlaybookApplicationStatus.AGUARDANDO_APROVACAO,
          PlaybookApplicationStatus.PLANEJADA,
          PlaybookApplicationStatus.EM_TESTE,
        ],
      },
    },
    include: {
      destination: { select: { id: true, name: true } },
      playbook: { select: { title: true } },
      experiment: { select: { plannedEndAt: true, finalValue: true } },
    },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });
  const now = Date.now();
  return rows
    .map((item) => {
      const overdue = Boolean(item.experiment?.plannedEndAt && item.experiment.plannedEndAt.getTime() < now && item.experiment.finalValue == null);
      const missingData = item.scorePartial || !item.kpi;
      const reason =
        item.status === PlaybookApplicationStatus.AGUARDANDO_APROVACAO
          ? "Aplicação de playbook aguardando decisão humana."
          : overdue
            ? "Experimento de transferência com prazo vencido. Isso não prova falha."
            : item.status === PlaybookApplicationStatus.EM_TESTE && !item.resultingEvidenceId
              ? "Teste de transferência sem resultado registrado."
              : missingData
                ? "Aplicação com dados necessários ausentes."
                : null;
      if (!reason) return null;
      return {
        id: item.id,
        companyId: item.destination.id,
        companyName: item.destination.name,
        playbookTitle: item.playbook.title,
        status: item.status,
        reason,
        href: `/playbooks/${item.playbookId}`,
        overdue,
        missingData,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function ensureKnowledgeTransferConnection(
  ownerId: string,
  fromId: string,
  toId: string,
  playbookId: string,
) {
  try {
    await prisma.connection.create({
      data: {
        ownerId,
        fromId,
        toId,
        type: knowledgeConnectionType(),
        status: "SUGERIDA",
        classification: "HIPOTESE",
        hypothesis: "Conhecimento transferido para teste. Não é parceria comercial.",
        note: `Conhecimento transferido · playbook ${playbookId}`,
        limitations: "Aprendizado transferível não significa parceria comercial nem evidência do destino.",
        discoveryKey: `knowledge-transfer:${fromId}:${toId}`,
      },
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code !== "P2002") throw error;
  }
}
