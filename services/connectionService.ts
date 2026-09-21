import "server-only";

import {
  AuditSource,
  ConnectionClassification,
  ConnectionStatus,
  ExperimentClassification,
  MemoryStatus,
  Prisma,
} from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import {
  CONNECTION_EMPTY,
  calculateConnectionScore,
  discoverPortfolioConnections,
  stampConnectionScore,
  type ConnectionCompanySignal,
  type ConnectionDiscovery,
} from "@/lib/connection-engine";
import { prisma } from "@/lib/prisma";
import { requireOwnedResource } from "@/lib/security/ownership";
import { writeAudit } from "@/services/auditService";

export { CONNECTION_EMPTY };

export type ConnectionDTO = {
  id: string;
  ownerId: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  fromSegment: string | null;
  toSegment: string | null;
  type: string;
  status: ConnectionStatus;
  classification: ConnectionClassification;
  mechanism: string | null;
  hypothesis: string | null;
  justification: string | null;
  limitations: string | null;
  nextAction: string | null;
  score: number | null;
  scorePartial: boolean;
  scoreReasons: string[];
  scoreFactorsUsed: string[];
  scoreFactorsMissing: string[];
  scoreVersion: string | null;
  scoredAt: string | null;
  potential: number | null;
  usedMemoryIds: string[];
  usedEvidenceIds: string[];
  usedExternalSourceIds: string[];
  usedCompanyFields: string[];
  approvedAt: string | null;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConnectionFilters = {
  companyId?: string;
  segment?: string;
  type?: string;
  status?: string;
  classification?: string;
  minScore?: number;
};

function asStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toDTO(row: {
  id: string;
  ownerId: string;
  fromId: string;
  toId: string;
  type: string;
  status: ConnectionStatus;
  classification: ConnectionClassification;
  mechanism: string | null;
  hypothesis: string | null;
  justification: string | null;
  limitations: string | null;
  nextAction: string | null;
  score: number | null;
  scorePartial: boolean;
  scoreReasons: Prisma.JsonValue | null;
  scoreFactorsUsed: Prisma.JsonValue | null;
  scoreFactorsMissing: Prisma.JsonValue | null;
  scoreVersion: string | null;
  scoredAt: Date | null;
  potential: Prisma.Decimal | null;
  usedMemoryIds: Prisma.JsonValue | null;
  usedEvidenceIds: Prisma.JsonValue | null;
  usedExternalSourceIds: Prisma.JsonValue | null;
  usedCompanyFields: Prisma.JsonValue | null;
  approvedAt: Date | null;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  from: { name: string; segment: string | null };
  to: { name: string; segment: string | null };
}): ConnectionDTO {
  return {
    id: row.id,
    ownerId: row.ownerId,
    fromId: row.fromId,
    toId: row.toId,
    fromName: row.from.name,
    toName: row.to.name,
    fromSegment: row.from.segment,
    toSegment: row.to.segment,
    type: row.type,
    status: row.status,
    classification: row.classification,
    mechanism: row.mechanism,
    hypothesis: row.hypothesis,
    justification: row.justification,
    limitations: row.limitations,
    nextAction: row.nextAction,
    score: row.score,
    scorePartial: row.scorePartial,
    scoreReasons: asStringArray(row.scoreReasons),
    scoreFactorsUsed: asStringArray(row.scoreFactorsUsed),
    scoreFactorsMissing: asStringArray(row.scoreFactorsMissing),
    scoreVersion: row.scoreVersion,
    scoredAt: row.scoredAt?.toISOString() ?? null,
    potential: row.potential != null ? Number(row.potential) : null,
    usedMemoryIds: asStringArray(row.usedMemoryIds),
    usedEvidenceIds: asStringArray(row.usedEvidenceIds),
    usedExternalSourceIds: asStringArray(row.usedExternalSourceIds),
    usedCompanyFields: asStringArray(row.usedCompanyFields),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedById: row.approvedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const includeCompanies = {
  from: { select: { name: true, segment: true } },
  to: { select: { name: true, segment: true } },
} as const;

async function loadSignals(ownerId: string): Promise<ConnectionCompanySignal[]> {
  const companies = await prisma.company.findMany({
    where: { ownerId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      segment: true,
      perceivedBottlenecks: true,
      objectives: true,
      notes: true,
      revenueMonthly: true,
      marginPercent: true,
      diagnoses: { orderBy: { createdAt: "desc" }, take: 1, select: { bottleneck: true } },
      financialStatements: { take: 1, select: { id: true, grossRevenue: true } },
      evidence: { select: { id: true, classification: true } },
      memories: {
        select: {
          id: true,
          companyId: true,
          title: true,
          validated: true,
          status: true,
          segment: true,
          kpi: true,
          limitations: true,
        },
      },
    },
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    segment: company.segment,
    bottlenecks: company.perceivedBottlenecks,
    objectives: company.objectives,
    notes: company.notes,
    revenueMonthly: company.revenueMonthly != null ? Number(company.revenueMonthly) : null,
    marginPercent: company.marginPercent != null ? Number(company.marginPercent) : null,
    hasDiagnosis: company.diagnoses.length > 0,
    diagnosisBottleneck: company.diagnoses[0]?.bottleneck ?? null,
    hasFinance: company.financialStatements.some((item) => item.grossRevenue != null),
    evidenceCount: company.evidence.length,
    validatedEvidenceCount: company.evidence.filter((item) => item.classification === ExperimentClassification.VALIDATED)
      .length,
    memories: company.memories.map((item) => ({
      id: item.id,
      companyId: item.companyId ?? company.id,
      title: item.title,
      validated: item.validated,
      approved: item.status === MemoryStatus.APPROVED,
      segment: item.segment,
      kpi: item.kpi,
      limitations: item.limitations,
    })),
  }));
}

function persistPayload(ownerId: string, item: ConnectionDiscovery) {
  const scored = stampConnectionScore(item.score, new Date());
  return {
    ownerId,
    fromId: item.fromId,
    toId: item.toId,
    type: item.type,
    mechanism: item.mechanism,
    hypothesis: item.hypothesis,
    justification: scored.justification,
    limitations: item.limitations,
    nextAction: item.nextAction,
    classification: ConnectionClassification.HIPOTESE,
    score: scored.score,
    scorePartial: scored.partial,
    scoreReasons: scored.factors.map((factor) => `${factor.label}: ${factor.used ? factor.value : "ausente"}`),
    scoreFactorsUsed: scored.used,
    scoreFactorsMissing: scored.missing,
    scoreVersion: scored.version,
    scoredAt: new Date(scored.calculatedAt),
    usedMemoryIds: item.usedMemoryIds,
    usedCompanyFields: item.usedFields,
    discoveryKey: item.discoveryKey,
    strength: scored.score,
    note: item.mechanism,
  };
}

export async function discoverOwnerConnections(ownerId: string): Promise<ConnectionDTO[]> {
  const signals = await loadSignals(ownerId);
  const discoveries = discoverPortfolioConnections(signals);
  const mutable = new Set<ConnectionStatus>([ConnectionStatus.SUGERIDA, ConnectionStatus.EM_ANALISE]);

  for (const item of discoveries) {
    const existing = await prisma.connection.findUnique({
      where: { discoveryKey: item.discoveryKey },
    });
    if (existing && existing.ownerId !== ownerId) continue;
    if (existing && !mutable.has(existing.status)) continue;
    const data = persistPayload(ownerId, item);
    if (existing) {
      try {
        await prisma.connection.update({
          where: { id: existing.id },
          data: {
            mechanism: data.mechanism,
            hypothesis: data.hypothesis,
            justification: data.justification,
            limitations: data.limitations,
            nextAction: data.nextAction,
            score: data.score,
            scorePartial: data.scorePartial,
            scoreReasons: data.scoreReasons,
            scoreFactorsUsed: data.scoreFactorsUsed,
            scoreFactorsMissing: data.scoreFactorsMissing,
            scoreVersion: data.scoreVersion,
            scoredAt: data.scoredAt,
            usedMemoryIds: data.usedMemoryIds,
            usedCompanyFields: data.usedCompanyFields,
            strength: data.strength,
            note: data.note,
          },
        });
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
        if (code === "P2003" || code === "P2002") continue;
        throw error;
      }
    } else {
      try {
        const stillThere = await prisma.company.count({
          where: { ownerId, id: { in: [item.fromId, item.toId] } },
        });
        if (stillThere < 2) continue;
        const created = await prisma.connection.create({ data: { ...data, status: ConnectionStatus.SUGERIDA } });
        await writeAudit({
          actorId: ownerId,
          companyId: item.fromId,
          action: "connection.proposed",
          entity: "Connection",
          entityId: created.id,
          origin: AuditSource.SYSTEM,
          newValue: { type: item.type, fromId: item.fromId, toId: item.toId, classification: "HIPOTESE" },
        });
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
        if (code === "P2003" || code === "P2002") continue;
        throw error;
      }
    }
  }

  return listOwnerConnections(ownerId);
}

export async function listOwnerConnections(ownerId: string, filters: ConnectionFilters = {}): Promise<ConnectionDTO[]> {
  const rows = await prisma.connection.findMany({
    where: {
      ownerId,
      ...(filters.companyId ? { OR: [{ fromId: filters.companyId }, { toId: filters.companyId }] } : {}),
      ...(filters.type && filters.type !== "ALL" ? { type: filters.type } : {}),
      ...(filters.status && filters.status !== "ALL" ? { status: filters.status as ConnectionStatus } : {}),
      ...(filters.classification && filters.classification !== "ALL"
        ? { classification: filters.classification as ConnectionClassification }
        : {}),
    },
    include: includeCompanies,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
  return rows
    .map(toDTO)
    .filter((item) => {
      if (filters.segment) {
        const needle = filters.segment.toLowerCase();
        const hit =
          (item.fromSegment ?? "").toLowerCase().includes(needle) ||
          (item.toSegment ?? "").toLowerCase().includes(needle);
        if (!hit) return false;
      }
      if (typeof filters.minScore === "number" && (item.score == null || item.score < filters.minScore)) return false;
      return true;
    });
}

export async function getConnection(ownerId: string, id: string): Promise<ConnectionDTO> {
  await requireOwnedResource(ownerId, "connection", id);
  const row = await prisma.connection.findFirst({
    where: { id, ownerId },
    include: includeCompanies,
  });
  if (!row) throw new AppError("NOT_FOUND");
  return toDTO(row);
}

export async function getConnectionWorkspace(ownerId: string, filters: ConnectionFilters = {}) {
  await discoverOwnerConnections(ownerId);
  const connections = await listOwnerConnections(ownerId, filters);
  const companies = await prisma.company.findMany({
    where: { ownerId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      segment: true,
      perceivedBottlenecks: true,
      diagnoses: { orderBy: { createdAt: "desc" }, take: 1, select: { bottleneck: true, overallScore: true } },
      opportunities: { select: { id: true, title: true }, take: 4, orderBy: { score: "desc" } },
      memories: { where: { status: MemoryStatus.APPROVED }, select: { id: true, title: true }, take: 4 },
    },
  });
  const strategies = await prisma.strategy.count({ where: { ownerId, status: { not: "ARQUIVADA" } } });
  return {
    connections,
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      segment: company.segment,
      bottleneck: company.diagnoses[0]?.bottleneck ?? company.perceivedBottlenecks,
      diagnosisScore: company.diagnoses[0]?.overallScore ?? null,
      opportunities: company.opportunities,
      memories: company.memories,
    })),
    kpis: {
      companies: companies.length,
      suggested: connections.filter((item) => item.status === "SUGERIDA").length,
      analysis: connections.filter((item) => item.status === "EM_ANALISE").length,
      testing: connections.filter((item) => item.status === "EM_TESTE").length,
      validated: connections.filter((item) => item.status === "VALIDADA").length,
      strategies,
    },
  };
}

export async function reviewConnection(ownerId: string, id: string): Promise<ConnectionDTO> {
  const current = await getConnection(ownerId, id);
  if (current.status === "ARQUIVADA" || current.status === "REJEITADA" || current.status === "VALIDADA") {
    return current;
  }
  const row = await prisma.connection.update({
    where: { id },
    data: { status: ConnectionStatus.EM_ANALISE, reviewedAt: new Date(), reviewedById: ownerId },
    include: includeCompanies,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.fromId,
    action: "connection.reviewed",
    entity: "Connection",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function approveConnection(ownerId: string, id: string): Promise<ConnectionDTO> {
  const current = await getConnection(ownerId, id);
  const row = await prisma.connection.update({
    where: { id },
    data: {
      status: ConnectionStatus.APROVADA,
      approvedAt: new Date(),
      approvedById: ownerId,
      classification:
        current.classification === "EVIDENCIA" ? current.classification : ConnectionClassification.HIPOTESE,
    },
    include: includeCompanies,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.fromId,
    action: "connection.approved",
    entity: "Connection",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function rejectConnection(ownerId: string, id: string): Promise<ConnectionDTO> {
  const current = await getConnection(ownerId, id);
  const row = await prisma.connection.update({
    where: { id },
    data: { status: ConnectionStatus.REJEITADA, rejectedAt: new Date() },
    include: includeCompanies,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.fromId,
    action: "connection.rejected",
    entity: "Connection",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function archiveConnection(ownerId: string, id: string): Promise<ConnectionDTO> {
  const current = await getConnection(ownerId, id);
  const row = await prisma.connection.update({
    where: { id },
    data: { status: ConnectionStatus.ARQUIVADA, archivedAt: new Date() },
    include: includeCompanies,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.fromId,
    action: "connection.archived",
    entity: "Connection",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function markConnectionTesting(ownerId: string, id: string): Promise<void> {
  await getConnection(ownerId, id);
  await prisma.connection.update({
    where: { id },
    data: { status: ConnectionStatus.EM_TESTE },
  });
}

export function rescorePair(
  from: ConnectionCompanySignal,
  to: ConnectionCompanySignal,
  type: ConnectionDiscovery["type"],
) {
  return calculateConnectionScore({ from, to, type });
}

export async function getConnectionRelated(ownerId: string, connection: ConnectionDTO) {
  const [memories, evidence, external] = await Promise.all([
    connection.usedMemoryIds.length
      ? prisma.strategicMemory.findMany({
          where: { id: { in: connection.usedMemoryIds }, OR: [{ company: { ownerId } }, { authorId: ownerId }] },
          select: { id: true, title: true, lesson: true, companyId: true, validated: true, limitations: true },
        })
      : Promise.resolve([]),
    prisma.evidence.findMany({
      where: { companyId: { in: [connection.fromId, connection.toId] }, company: { ownerId } },
      select: { id: true, title: true, companyId: true, kind: true, classification: true },
      take: 8,
    }),
    prisma.researchSession.findMany({
      where: { userId: ownerId, companyId: { in: [connection.fromId, connection.toId] } },
      select: { id: true, question: true, status: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { memories, evidence, external };
}

export async function getCockpitConnectionSummary(ownerId: string) {
  const [suggested, analysis, testing, memories] = await Promise.all([
    prisma.connection.count({ where: { ownerId, status: ConnectionStatus.SUGERIDA } }),
    prisma.strategy.count({ where: { ownerId, status: { in: ["RASCUNHO", "PROPOSTA"] } } }),
    prisma.connection.count({ where: { ownerId, status: ConnectionStatus.EM_TESTE } }),
    prisma.connection.count({ where: { ownerId, type: "APRENDIZADO_TRANSFERIVEL", status: { not: ConnectionStatus.ARQUIVADA } } }),
  ]);
  return { suggested, analysis, testing, transferable: memories };
}
