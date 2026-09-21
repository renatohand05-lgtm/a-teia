import "server-only";

import {
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
  PLAYBOOK_COMPAT_VERSION,
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
import { prisma } from "@/lib/prisma";
import { requireOwnedResource } from "@/lib/security/ownership";
import { writeAudit } from "@/services/auditService";
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
  opportunityId: string | null;
  status: PlaybookApplicationStatus;
  compatibilityScore: number | null;
  scorePartial: boolean;
  classification: KnowledgeKind;
  adaptedHypothesis: string | null;
  kpi: string | null;
  horizonDays: number | null;
  investment: number | null;
  limitations: string | null;
  factorsUsed: string[];
  factorsMissing: string[];
  favorable: string[];
  contrary: string[];
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

function toApplicationDTO(row: {
  id: string;
  playbookId: string;
  destinationCompanyId: string;
  opportunityId: string | null;
  status: PlaybookApplicationStatus;
  compatibilityScore: number | null;
  scorePartial: boolean;
  classification: KnowledgeKind;
  adaptedHypothesis: string | null;
  kpi: string | null;
  horizonDays: number | null;
  investment: Prisma.Decimal | null;
  limitations: string | null;
  factorsUsed: Prisma.JsonValue | null;
  factorsMissing: Prisma.JsonValue | null;
  favorable: Prisma.JsonValue | null;
  contrary: Prisma.JsonValue | null;
  destination: { name: string };
}): PlaybookApplicationDTO {
  return {
    id: row.id,
    playbookId: row.playbookId,
    destinationCompanyId: row.destinationCompanyId,
    destinationName: row.destination.name,
    opportunityId: row.opportunityId,
    status: row.status,
    compatibilityScore: row.compatibilityScore,
    scorePartial: row.scorePartial,
    classification: row.classification,
    adaptedHypothesis: row.adaptedHypothesis,
    kpi: row.kpi,
    horizonDays: row.horizonDays,
    investment: num(row.investment),
    limitations: row.limitations,
    factorsUsed: asStringArray(row.factorsUsed),
    factorsMissing: asStringArray(row.factorsMissing),
    favorable: asStringArray(row.favorable),
    contrary: asStringArray(row.contrary),
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

export async function getPlaybookDetail(ownerId: string, id: string) {
  const playbook = await getPlaybook(ownerId, id);
  const [applications, evidence, memory, companies] = await Promise.all([
    prisma.playbookApplication.findMany({
      where: { playbookId: id, ownerId },
      include: { destination: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    playbook.evidenceId
      ? prisma.evidence.findFirst({
          where: { id: playbook.evidenceId, company: { ownerId } },
          select: { id: true, title: true, body: true, companyId: true, kind: true },
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
  return {
    playbook,
    applications: applications.map(toApplicationDTO),
    evidence,
    memory,
    companies,
  };
}

async function destinationSignal(ownerId: string, companyId: string): Promise<CompatibilityCompany> {
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
      _count: { select: { evidence: true } },
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
  };
}

export async function analyzePlaybookFit(ownerId: string, playbookId: string, companyId: string) {
  const playbook = await getPlaybook(ownerId, playbookId);
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
  return {
    company,
    score,
    transfer: transferClassification(),
    warning: "Na empresa destino isto permanece HIPÓTESE até um experimento medido.",
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
  input: { kpi?: string; horizonDays?: number; investment?: number; hypothesis?: string },
) {
  const playbook = await getPlaybook(ownerId, playbookId);
  const fit = await analyzePlaybookFit(ownerId, playbookId, destinationCompanyId);
  const existing = await prisma.playbookApplication.findUnique({
    where: { playbookId_destinationCompanyId: { playbookId, destinationCompanyId } },
    include: { destination: { select: { name: true } } },
  });
  if (existing && isActiveApplicationStatus(existing.status)) {
    return { application: toApplicationDTO(existing), alreadyActive: true as const, message: alreadyEvaluatingCopy() };
  }
  const data = {
    ownerId,
    playbookId,
    destinationCompanyId,
    status: PlaybookApplicationStatus.PROPOSTA,
    compatibilityScore: fit.score.score,
    scorePartial: fit.score.partial,
    scoreVersion: PLAYBOOK_COMPAT_VERSION,
    scoredAt: new Date(),
    factorsUsed: fit.score.factorsUsed,
    factorsMissing: fit.score.factorsMissing,
    favorable: fit.score.favorable,
    contrary: fit.score.contrary,
    limitations: fit.score.limitations,
    adaptedHypothesis:
      input.hypothesis?.trim() ||
      `Se ${fit.company.name} testar “${playbook.title}”, um KPI mensurável deve se mover. Isso permanece hipótese.`,
    kpi: input.kpi?.trim() || playbook.primaryKpi,
    horizonDays: input.horizonDays ?? playbook.durationDays,
    investment: input.investment ?? playbook.observedInvestment,
    classification: KnowledgeKind.HYPOTHESIS,
    rejectedAt: null,
  };
  const row = existing
    ? await prisma.playbookApplication.update({
        where: { id: existing.id },
        data,
        include: { destination: { select: { name: true } } },
      })
    : await prisma.playbookApplication.create({
        data,
        include: { destination: { select: { name: true } } },
      });
  await writeAudit({
    actorId: ownerId,
    companyId: destinationCompanyId,
    action: "playbook.application.proposed",
    entity: "PlaybookApplication",
    entityId: row.id,
    newValue: { playbookId, destinationCompanyId, classification: "HIPOTESE" },
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
    include: { destination: { select: { name: true } }, playbook: true },
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
  const row = await prisma.playbookApplication.update({
    where: { id: current.id },
    data: {
      status: PlaybookApplicationStatus.CONFIRMADA,
      opportunityId: opportunity.id,
      confirmedAt: new Date(),
      classification: KnowledgeKind.HYPOTHESIS,
    },
    include: { destination: { select: { name: true } } },
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
    include: { destination: { select: { name: true } } },
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
  return prisma.playbook.findFirst({
    where: { ownerId, strategyId },
    select: { id: true, title: true, status: true },
  });
}

export async function getCockpitPlaybookSummary(ownerId: string) {
  const [validated, testing, companies] = await Promise.all([
    prisma.playbook.count({ where: { ownerId, status: PlaybookStatus.VALIDADO } }),
    prisma.playbookApplication.count({
      where: { ownerId, status: { in: [PlaybookApplicationStatus.CONFIRMADA, PlaybookApplicationStatus.EM_TESTE] } },
    }),
    prisma.company.count({ where: { ownerId, status: "ACTIVE" } }),
  ]);
  return { validated, testing, companies };
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
    },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });
}
