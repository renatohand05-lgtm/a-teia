import "server-only";

import {
  MemoryConfidence,
  MemoryOrigin,
  MemoryPolarity,
  MemoryStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import { toNumber } from "@/lib/format";
import {
  buildMemoryExplanation,
  buildMemoryFromEvidence,
  calculateMemoryConfidence,
  calculateTransferability,
  compareMemoryContexts,
  countEvidenceRepetition,
  detectConflictingMemories,
  inferFamilyFromKpi,
  previewMemoryScoreImpact,
  prioritizeRelatedMemories,
  resolveStrategicFamily,
  type MemoryLike,
  type MemoryOrigin as EngineOrigin,
  type TransferabilityResult,
} from "@/lib/memory-engine";
import type { MemoryObservationInput, MemoryProposeInput } from "@/lib/validations";

function decimal(value: number | null | undefined) {
  return value == null ? null : new Prisma.Decimal(value);
}

async function ownedCompany(ownerId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, ownerId },
  });
  if (!company) throw new Error("Empresa não encontrada.");
  return company;
}

const memoryInclude = {
  company: true,
  evidence: true,
  experiment: true,
  opportunity: true,
  strategy: true,
  author: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.StrategicMemoryInclude;

type MemoryRow = Prisma.StrategicMemoryGetPayload<{ include: typeof memoryInclude }>;

export type MemoryDTO = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  authorId: string | null;
  authorName: string | null;
  title: string;
  lesson: string;
  validated: boolean;
  origin: MemoryOrigin;
  status: MemoryStatus;
  confidence: MemoryConfidence;
  polarity: MemoryPolarity | null;
  evidenceId: string | null;
  experimentId: string | null;
  experimentTitle: string | null;
  hypothesis: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  strategyId: string | null;
  strategyTitle: string | null;
  context: string | null;
  segment: string | null;
  kpi: string | null;
  family: string | null;
  baseline: number | null;
  target: number | null;
  measuredResult: number | null;
  classification: MemoryRow["classification"];
  limitations: string | null;
  conditions: string | null;
  investment: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  explanation: string;
};

export type MemoryFilters = {
  companyId?: string;
  origin?: string;
  status?: string;
  polarity?: string;
  family?: string;
  kpi?: string;
  classification?: string;
  confidence?: string;
  experimentId?: string;
  opportunityId?: string;
  segment?: string;
  evidenceId?: string;
};

export type RelatedMemoryDTO = MemoryDTO & {
  matchKind: "EXACT" | "TRANSVERSAL" | "UNRELATED";
  transferability: TransferabilityResult;
};

function toDto(row: MemoryRow): MemoryDTO {
  return {
    id: row.id,
    companyId: row.companyId,
    companyName: row.company?.name ?? null,
    authorId: row.authorId,
    authorName: row.author?.name ?? null,
    title: row.title,
    lesson: row.lesson,
    validated: row.validated,
    origin: row.origin,
    status: row.status,
    confidence: row.confidence,
    polarity: row.polarity,
    evidenceId: row.evidenceId,
    experimentId: row.experimentId,
    experimentTitle: row.experiment?.title ?? null,
    hypothesis: row.experiment?.hypothesis ?? null,
    opportunityId: row.opportunityId,
    opportunityTitle: row.opportunity?.title ?? null,
    strategyId: row.strategyId,
    strategyTitle: row.strategy?.title ?? null,
    context: row.context,
    segment: row.segment,
    kpi: row.kpi,
    family: row.family,
    baseline: toNumber(row.baseline),
    target: toNumber(row.target),
    measuredResult: toNumber(row.measuredResult),
    classification: row.classification,
    limitations: row.limitations,
    conditions: row.conditions,
    investment: toNumber(row.investment),
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    approvedById: row.approvedById,
    approvedByName: row.approvedBy?.name ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    explanation: buildMemoryExplanation({
      companyName: row.company?.name ?? null,
      family: row.family,
      kpi: row.kpi,
      baseline: toNumber(row.baseline),
      measuredResult: toNumber(row.measuredResult),
      polarity: row.polarity,
      origin: row.origin,
      validated: row.validated,
    }),
  };
}

function toLike(item: MemoryDTO): MemoryLike {
  return {
    id: item.id,
    companyId: item.companyId,
    family: item.family,
    kpi: item.kpi,
    polarity: item.polarity,
    classification: item.classification,
    status: item.status,
    origin: item.origin,
    validated: item.validated,
    title: item.title,
    lesson: item.lesson,
    companyName: item.companyName,
    segment: item.segment,
    baseline: item.baseline,
    measuredResult: item.measuredResult,
    confidence: item.confidence,
    opportunityId: item.opportunityId,
  };
}

function ownerWhere(ownerId: string): Prisma.StrategicMemoryWhereInput {
  return { company: { is: { ownerId } } };
}

function filterWhere(filters: MemoryFilters = {}): Prisma.StrategicMemoryWhereInput {
  const where: Prisma.StrategicMemoryWhereInput = {};
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.origin && filters.origin !== "ALL") where.origin = filters.origin as MemoryOrigin;
  if (filters.status && filters.status !== "ALL") where.status = filters.status as MemoryStatus;
  if (filters.polarity && filters.polarity !== "ALL") where.polarity = filters.polarity as MemoryPolarity;
  if (filters.family && filters.family !== "ALL") where.family = filters.family;
  if (filters.kpi && filters.kpi !== "ALL") where.kpi = filters.kpi;
  if (filters.classification && filters.classification !== "ALL") {
    where.classification = filters.classification as MemoryRow["classification"];
  }
  if (filters.confidence && filters.confidence !== "ALL") where.confidence = filters.confidence as MemoryConfidence;
  if (filters.experimentId) where.experimentId = filters.experimentId;
  if (filters.opportunityId) where.opportunityId = filters.opportunityId;
  if (filters.evidenceId) where.evidenceId = filters.evidenceId;
  if (filters.segment && filters.segment !== "ALL") where.segment = filters.segment;
  return where;
}

async function repeatedCount(ownerId: string, family: string | null, kpi: string | null, excludeId?: string) {
  if (!family && !kpi) return 0;
  const related = await prisma.strategicMemory.findMany({
    where: {
      ...ownerWhere(ownerId),
      status: { not: MemoryStatus.REJECTED },
      origin: MemoryOrigin.EXPERIMENT_EVIDENCE,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        family ? { family } : undefined,
        kpi ? { kpi } : undefined,
      ].filter(Boolean) as Prisma.StrategicMemoryWhereInput[],
    },
    select: { id: true },
  });
  return related.length;
}

/**
 * Compatível com o stub anterior, agora com owner isolation.
 * Observação/lição manual — nunca vira aprendizado validado.
 */
export async function appendMemory(input: {
  authorId: string;
  companyId: string;
  title: string;
  lesson: string;
  validated?: boolean;
}) {
  return createObservation(input.authorId, {
    companyId: input.companyId,
    origin: "OBSERVATION",
    title: input.title,
    lesson: input.lesson,
  });
}

export async function listMemories(ownerId: string, companyId?: string) {
  if (companyId) return listCompanyMemories(ownerId, companyId);
  return listOwnerMemories(ownerId);
}

export async function listCompanyMemories(ownerId: string, companyId: string, filters: MemoryFilters = {}) {
  await ownedCompany(ownerId, companyId);
  const rows = await prisma.strategicMemory.findMany({
    where: { ...ownerWhere(ownerId), ...filterWhere({ ...filters, companyId }) },
    include: memoryInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toDto);
}

export async function listOwnerMemories(ownerId: string, filters: MemoryFilters = {}) {
  if (filters.companyId) await ownedCompany(ownerId, filters.companyId);
  const rows = await prisma.strategicMemory.findMany({
    where: { ...ownerWhere(ownerId), ...filterWhere(filters) },
    include: memoryInclude,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return rows.map(toDto);
}

export async function getMemory(ownerId: string, memoryId: string, companyId?: string) {
  const row = await prisma.strategicMemory.findFirst({
    where: {
      id: memoryId,
      ...ownerWhere(ownerId),
      ...(companyId ? { companyId } : {}),
    },
    include: memoryInclude,
  });
  return row ? toDto(row) : null;
}

export async function getMemorySummary(ownerId: string, companyId?: string) {
  if (companyId) await ownedCompany(ownerId, companyId);
  const items = companyId ? await listCompanyMemories(ownerId, companyId) : await listOwnerMemories(ownerId);
  const conflicts = detectConflictingMemories(items.map(toLike));
  const recent = items.slice(0, 3);
  const transferable = companyId
    ? await findTransferableMemories(ownerId, companyId)
    : items.filter((item) => item.origin === "EXPERIMENT_EVIDENCE" && item.status === "APPROVED");
  return {
    total: items.length,
    validated: items.filter((item) => item.validated && item.status === "APPROVED").length,
    observations: items.filter((item) => item.origin === "OBSERVATION" || item.origin === "MANUAL_LESSON").length,
    positive: items.filter((item) => item.polarity === "POSITIVE").length,
    negative: items.filter((item) => item.polarity === "NEGATIVE").length,
    inconclusive: items.filter((item) => item.polarity === "INCONCLUSIVE").length,
    proposed: items.filter((item) => item.status === "PROPOSED").length,
    approved: items.filter((item) => item.status === "APPROVED").length,
    conflicting: conflicts.length,
    recent,
    transferableCount: transferable.length,
  };
}

export async function previewMemoryFromEvidence(ownerId: string, companyId: string, evidenceId: string) {
  const source = await loadEvidenceSource(ownerId, companyId, evidenceId);
  const repeats = await repeatedCount(ownerId, source.family, source.kpi);
  return buildMemoryFromEvidence(source, { repeatedValidationCount: repeats, humanApproved: false });
}

async function loadEvidenceSource(ownerId: string, companyId: string, evidenceId: string) {
  const company = await ownedCompany(ownerId, companyId);
  const evidence = await prisma.evidence.findFirst({
    where: { id: evidenceId, companyId, company: { ownerId } },
    include: { experiment: true, opportunity: true },
  });
  if (!evidence) throw new Error("Evidência não encontrada.");
  const experiment = evidence.experiment;
  const family =
    resolveStrategicFamily(evidence.opportunity?.sourceDimension) ?? inferFamilyFromKpi(experiment?.kpi ?? null);
  return {
    evidenceId: evidence.id,
    evidenceTitle: evidence.title,
    evidenceBody: evidence.body,
    classification: evidence.classification ?? experiment?.classification ?? null,
    experimentId: evidence.experimentId,
    experimentTitle: experiment?.title ?? null,
    hypothesis: experiment?.hypothesis ?? null,
    opportunityId: evidence.opportunityId,
    strategyId: experiment?.strategyId ?? null,
    kpi: experiment?.kpi ?? null,
    family,
    baseline: toNumber(experiment?.baseline),
    target: toNumber(experiment?.target),
    measuredResult: toNumber(experiment?.finalValue),
    experimentCompleted: experiment?.status === "COMPLETED",
    companyId: company.id,
    companyName: company.name,
    segment: company.segment,
    teamSize: company.teamSize,
    units: company.units,
    investment: toNumber(experiment?.realizedInvestment),
    periodStart: experiment?.startedAt?.toISOString() ?? null,
    periodEnd: experiment?.endedAt?.toISOString() ?? null,
    conditions: experiment?.successCriteria ?? experiment?.notes ?? null,
    testDescription: experiment?.testDescription ?? null,
  };
}

export async function proposeMemoryFromEvidence(ownerId: string, input: MemoryProposeInput) {
  const draft = await previewMemoryFromEvidence(ownerId, input.companyId, input.evidenceId);
  if (!draft.canCreateValidated || !draft.experimentId) {
    throw new Error("Não é possível criar aprendizado validado sem evidência de experimento concluído.");
  }

  const existing = await prisma.strategicMemory.findFirst({
    where: { evidenceId: input.evidenceId, company: { ownerId } },
  });
  if (existing) throw new Error("Já existe memória proposta ou registrada para esta evidência.");

  const created = await prisma.strategicMemory.create({
    data: {
      companyId: input.companyId,
      authorId: ownerId,
      title: input.title,
      lesson: input.lesson,
      validated: false,
      origin: MemoryOrigin.EXPERIMENT_EVIDENCE,
      status: MemoryStatus.PROPOSED,
      confidence: draft.confidence.level,
      polarity: draft.polarity,
      evidenceId: draft.evidenceId,
      experimentId: draft.experimentId,
      opportunityId: draft.opportunityId,
      strategyId: draft.strategyId,
      context: input.context ?? draft.context,
      segment: draft.segment,
      kpi: draft.kpi,
      family: draft.family,
      baseline: decimal(draft.baseline),
      target: decimal(draft.target),
      measuredResult: decimal(draft.measuredResult),
      classification: draft.classification,
      limitations: input.limitations ?? draft.limitations,
      conditions: input.conditions ?? draft.conditions,
      investment: decimal(draft.investment),
      periodStart: draft.periodStart ? new Date(draft.periodStart) : null,
      periodEnd: draft.periodEnd ? new Date(draft.periodEnd) : null,
    },
    include: memoryInclude,
  });

  await writeAudit({
    actorId: ownerId,
    action: "memory.proposed",
    entity: "StrategicMemory",
    entityId: created.id,
    newValue: { evidenceId: input.evidenceId, origin: "EXPERIMENT_EVIDENCE", status: "PROPOSED" },
    origin: "USER",
  });

  return toDto(created);
}

export async function createObservation(ownerId: string, input: MemoryObservationInput) {
  await ownedCompany(ownerId, input.companyId);
  const origin = input.origin as EngineOrigin;
  const family = resolveStrategicFamily(input.family) ?? inferFamilyFromKpi(input.kpi ?? null);
  const confidence = calculateMemoryConfidence({
    origin,
    experimentCompleted: false,
    hasBaseline: input.baseline != null,
    hasTarget: input.target != null,
    hasMeasuredResult: input.measuredResult != null,
    hasTraceableEvidence: false,
    classification: null,
    humanApproved: true,
    repeatedValidationCount: 0,
  });

  const created = await prisma.strategicMemory.create({
    data: {
      companyId: input.companyId,
      authorId: ownerId,
      title: input.title,
      lesson: input.lesson,
      validated: false,
      origin: input.origin,
      status: MemoryStatus.APPROVED,
      confidence: confidence.level,
      polarity: MemoryPolarity.INCONCLUSIVE,
      context: input.context,
      segment: input.segment,
      kpi: input.kpi,
      family,
      baseline: decimal(input.baseline ?? null),
      target: decimal(input.target ?? null),
      measuredResult: decimal(input.measuredResult ?? null),
      limitations: input.limitations,
      conditions: input.conditions,
      approvedById: ownerId,
      approvedAt: new Date(),
    },
    include: memoryInclude,
  });

  await writeAudit({
    actorId: ownerId,
    action: "memory.created",
    entity: "StrategicMemory",
    entityId: created.id,
    newValue: { origin: input.origin, validated: false },
    origin: "USER",
  });

  return toDto(created);
}

export async function approveMemory(ownerId: string, companyId: string, memoryId: string) {
  await ownedCompany(ownerId, companyId);
  const existing = await prisma.strategicMemory.findFirst({
    where: { id: memoryId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Memória não encontrada.");
  if (existing.status === MemoryStatus.APPROVED) {
    const current = await getMemory(ownerId, memoryId, companyId);
    if (!current) throw new Error("Memória não encontrada.");
    return current;
  }

  const repeats = await repeatedCount(ownerId, existing.family, existing.kpi, existing.id);
  const confidence = calculateMemoryConfidence({
    origin: existing.origin,
    experimentCompleted: Boolean(existing.experimentId),
    hasBaseline: existing.baseline != null,
    hasTarget: existing.target != null,
    hasMeasuredResult: existing.measuredResult != null,
    hasTraceableEvidence: Boolean(existing.evidenceId),
    classification: existing.classification,
    humanApproved: true,
    repeatedValidationCount: repeats,
  });
  const validated =
    existing.origin === MemoryOrigin.EXPERIMENT_EVIDENCE && Boolean(existing.evidenceId);

  const updated = await prisma.strategicMemory.update({
    where: { id: memoryId },
    data: {
      status: MemoryStatus.APPROVED,
      approvedById: ownerId,
      approvedAt: new Date(),
      confidence: confidence.level,
      validated,
    },
    include: memoryInclude,
  });

  await writeAudit({
    actorId: ownerId,
    action: "memory.approved",
    entity: "StrategicMemory",
    entityId: memoryId,
    previousValue: { status: existing.status, validated: existing.validated },
    newValue: { status: "APPROVED", validated, confidence: confidence.level },
    origin: "USER",
  });

  return toDto(updated);
}

export async function rejectMemory(ownerId: string, companyId: string, memoryId: string) {
  await ownedCompany(ownerId, companyId);
  const existing = await prisma.strategicMemory.findFirst({
    where: { id: memoryId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Memória não encontrada.");

  const updated = await prisma.strategicMemory.update({
    where: { id: memoryId },
    data: {
      status: MemoryStatus.REJECTED,
      validated: false,
    },
    include: memoryInclude,
  });

  await writeAudit({
    actorId: ownerId,
    action: "memory.rejected",
    entity: "StrategicMemory",
    entityId: memoryId,
    previousValue: { status: existing.status },
    newValue: { status: "REJECTED", validated: false },
    origin: "USER",
  });

  return toDto(updated);
}

export async function findRelatedMemories(
  ownerId: string,
  companyId: string,
  target: {
    opportunityId?: string | null;
    family?: string | null;
    kpi?: string | null;
    segment?: string | null;
  },
): Promise<RelatedMemoryDTO[]> {
  const company = await ownedCompany(ownerId, companyId);
  const items = await listOwnerMemories(ownerId, { status: "APPROVED" });
  const ranked = prioritizeRelatedMemories(
    items.map(toLike),
    {
      companyId,
      segment: target.segment ?? company.segment,
      family: target.family ?? null,
      kpi: target.kpi ?? null,
      opportunityId: target.opportunityId ?? null,
      teamSize: company.teamSize,
      units: company.units,
    },
  );
  const byId = new Map(items.map((item) => [item.id, item]));
  return ranked
    .filter((item) => item.matchKind !== "UNRELATED")
    .slice(0, 12)
    .flatMap((item) => {
      const full = item.id ? byId.get(item.id) : undefined;
      if (!full) return [];
      return [{ ...full, matchKind: item.matchKind, transferability: item.transferability }];
    });
}

export async function findTransferableMemories(ownerId: string, companyId: string) {
  const company = await ownedCompany(ownerId, companyId);
  const items = await listOwnerMemories(ownerId, { status: "APPROVED", origin: "EXPERIMENT_EVIDENCE" });
  const others = items.filter((item) => item.companyId && item.companyId !== companyId);
  const ranked = prioritizeRelatedMemories(
    others.map(toLike),
    {
      companyId,
      segment: company.segment,
      family: null,
      kpi: null,
      opportunityId: null,
      teamSize: company.teamSize,
      units: company.units,
    },
  );
  const byId = new Map(others.map((item) => [item.id, item]));
  return ranked.slice(0, 12).flatMap((item) => {
    const full = item.id ? byId.get(item.id) : undefined;
    if (!full) return [];
    return [
      {
        ...full,
        matchKind: "TRANSVERSAL" as const,
        transferability: item.transferability,
      },
    ];
  });
}

export async function getExperimentMemories(ownerId: string, companyId: string, experimentId: string) {
  return listCompanyMemories(ownerId, companyId, { experimentId });
}

export async function getOpportunityMemoryPreview(
  ownerId: string,
  companyId: string,
  opportunity: { id: string; sourceDimension: string | null; priorityScore: number },
) {
  const related = await findRelatedMemories(ownerId, companyId, {
    opportunityId: opportunity.id,
    family: resolveStrategicFamily(opportunity.sourceDimension),
  });
  const preview = previewMemoryScoreImpact(
    opportunity.priorityScore,
    related.map(toLike),
  );
  const conflicts = detectConflictingMemories(related.map(toLike));
  const repetition = countEvidenceRepetition(related);
  return { related, preview, conflicts: conflicts.length, repetition };
}

export async function compareContextsForCompanies(
  ownerId: string,
  sourceCompanyId: string,
  targetCompanyId: string,
  extras?: { family?: string | null; kpi?: string | null },
) {
  const source = await ownedCompany(ownerId, sourceCompanyId);
  const target = await ownedCompany(ownerId, targetCompanyId);
  return compareMemoryContexts(
    {
      companyId: source.id,
      segment: source.segment,
      family: extras?.family ?? null,
      kpi: extras?.kpi ?? null,
      opportunityId: null,
      teamSize: source.teamSize,
      units: source.units,
    },
    {
      companyId: target.id,
      segment: target.segment,
      family: extras?.family ?? null,
      kpi: extras?.kpi ?? null,
      opportunityId: null,
      teamSize: target.teamSize,
      units: target.units,
    },
  );
}

export function transferabilityFor(source: MemoryDTO, target: {
  companyId: string;
  segment: string | null;
  family: string | null;
  kpi: string | null;
  teamSize: number | null;
  units: number | null;
}) {
  return calculateTransferability({
    source: {
      companyId: source.companyId,
      segment: source.segment,
      family: source.family,
      kpi: source.kpi,
      opportunityId: source.opportunityId,
      teamSize: null,
      units: null,
    },
    target: {
      companyId: target.companyId,
      segment: target.segment,
      family: target.family,
      kpi: target.kpi,
      opportunityId: null,
      teamSize: target.teamSize,
      units: target.units,
    },
    evidenceQuality: source.classification,
  });
}
