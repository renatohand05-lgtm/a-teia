import "server-only";

import {
  ConnectionClassification,
  EvidenceLevel,
  OpportunityOrigin,
  OpportunityStatus,
  Prisma,
  StrategyEffort,
  StrategyRisk,
  StrategyStatus,
} from "@prisma/client";
import { AppError } from "@/lib/security/errors";
import { draftStrategyFromConnection, strategyConversionReview } from "@/lib/strategy-engine";
import { prisma } from "@/lib/prisma";
import { requireOwnedResource } from "@/lib/security/ownership";
import { writeAudit } from "@/services/auditService";
import { getConnection, markConnectionTesting } from "@/services/connectionService";
import { toOpportunityDTO, type OpportunityDTO } from "@/services/opportunityService";

export type StrategyDTO = {
  id: string;
  ownerId: string;
  companyId: string;
  originName: string;
  destinationCompanyId: string | null;
  destinationName: string | null;
  connectionId: string | null;
  opportunityId: string | null;
  title: string;
  description: string | null;
  status: StrategyStatus;
  mechanism: string | null;
  problem: string | null;
  hypothesis: string | null;
  audience: string | null;
  valueProposition: string | null;
  primaryKpi: string | null;
  secondaryKpi: string | null;
  estimatedInvestment: number | null;
  effort: StrategyEffort;
  testHorizonDays: number | null;
  risk: StrategyRisk;
  recommendationOrigin: ConnectionClassification;
  evidenceIds: string[];
  memoryIds: string[];
  createdAt: string;
  updatedAt: string;
};

function asIds(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toDTO(row: {
  id: string;
  ownerId: string;
  companyId: string;
  destinationCompanyId: string | null;
  connectionId: string | null;
  opportunityId: string | null;
  title: string;
  description: string | null;
  status: StrategyStatus;
  mechanism: string | null;
  problem: string | null;
  hypothesis: string | null;
  audience: string | null;
  valueProposition: string | null;
  primaryKpi: string | null;
  secondaryKpi: string | null;
  estimatedInvestment: Prisma.Decimal | null;
  effort: StrategyEffort;
  testHorizonDays: number | null;
  risk: StrategyRisk;
  recommendationOrigin: ConnectionClassification;
  evidenceIds: Prisma.JsonValue | null;
  memoryIds: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  company: { name: string };
  destination: { name: string } | null;
}): StrategyDTO {
  return {
    id: row.id,
    ownerId: row.ownerId,
    companyId: row.companyId,
    originName: row.company.name,
    destinationCompanyId: row.destinationCompanyId,
    destinationName: row.destination?.name ?? null,
    connectionId: row.connectionId,
    opportunityId: row.opportunityId,
    title: row.title,
    description: row.description,
    status: row.status,
    mechanism: row.mechanism,
    problem: row.problem,
    hypothesis: row.hypothesis,
    audience: row.audience,
    valueProposition: row.valueProposition,
    primaryKpi: row.primaryKpi,
    secondaryKpi: row.secondaryKpi,
    estimatedInvestment: row.estimatedInvestment != null ? Number(row.estimatedInvestment) : null,
    effort: row.effort,
    testHorizonDays: row.testHorizonDays,
    risk: row.risk,
    recommendationOrigin: row.recommendationOrigin,
    evidenceIds: asIds(row.evidenceIds),
    memoryIds: asIds(row.memoryIds),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const includeNames = {
  company: { select: { name: true } },
  destination: { select: { name: true } },
} as const;

export async function listOwnerStrategies(
  ownerId: string,
  filters: { companyId?: string; status?: string } = {},
): Promise<StrategyDTO[]> {
  const rows = await prisma.strategy.findMany({
    where: {
      ownerId,
      ...(filters.companyId
        ? { OR: [{ companyId: filters.companyId }, { destinationCompanyId: filters.companyId }] }
        : {}),
      ...(filters.status && filters.status !== "ALL" ? { status: filters.status as StrategyStatus } : {}),
    },
    include: includeNames,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getStrategy(ownerId: string, id: string): Promise<StrategyDTO> {
  await requireOwnedResource(ownerId, "strategy", id);
  const row = await prisma.strategy.findFirst({ where: { id, ownerId }, include: includeNames });
  if (!row) throw new AppError("NOT_FOUND");
  return toDTO(row);
}

export async function createStrategyFromConnection(ownerId: string, connectionId: string): Promise<StrategyDTO> {
  const connection = await getConnection(ownerId, connectionId);
  const draft = draftStrategyFromConnection({
    fromName: connection.fromName,
    toName: connection.toName,
    type: connection.type,
    mechanism: connection.mechanism,
    hypothesis: connection.hypothesis,
    limitations: connection.limitations,
    classification: connection.classification,
  });
  const row = await prisma.strategy.create({
    data: {
      ownerId,
      companyId: connection.fromId,
      destinationCompanyId: connection.toId,
      connectionId: connection.id,
      title: draft.title,
      description: draft.limitations,
      status: StrategyStatus.PROPOSTA,
      mechanism: draft.mechanism,
      problem: draft.problem,
      hypothesis: draft.hypothesis,
      audience: draft.audience,
      valueProposition: draft.valueProposition,
      primaryKpi: draft.primaryKpi,
      recommendationOrigin: ConnectionClassification.HIPOTESE,
      memoryIds: connection.usedMemoryIds,
      evidenceIds: connection.usedEvidenceIds,
      horizon: connection.nextAction,
    },
    include: includeNames,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: connection.toId,
    action: "strategy.created",
    entity: "Strategy",
    entityId: row.id,
    newValue: { connectionId, status: row.status, origin: "HIPOTESE" },
  });
  return toDTO(row);
}

export async function reviewStrategy(ownerId: string, id: string): Promise<StrategyDTO> {
  const current = await getStrategy(ownerId, id);
  const row = await prisma.strategy.update({
    where: { id },
    data: { status: StrategyStatus.PROPOSTA, reviewedAt: new Date() },
    include: includeNames,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.companyId,
    action: "strategy.reviewed",
    entity: "Strategy",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function approveStrategy(ownerId: string, id: string): Promise<StrategyDTO> {
  const current = await getStrategy(ownerId, id);
  const row = await prisma.strategy.update({
    where: { id },
    data: { status: StrategyStatus.APROVADA, approvedAt: new Date(), approvedById: ownerId },
    include: includeNames,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.companyId,
    action: "strategy.approved",
    entity: "Strategy",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function rejectStrategy(ownerId: string, id: string): Promise<StrategyDTO> {
  const current = await getStrategy(ownerId, id);
  const row = await prisma.strategy.update({
    where: { id },
    data: { status: StrategyStatus.REJEITADA },
    include: includeNames,
  });
  await writeAudit({
    actorId: ownerId,
    companyId: row.companyId,
    action: "strategy.rejected",
    entity: "Strategy",
    entityId: row.id,
    previousValue: { status: current.status },
    newValue: { status: row.status },
  });
  return toDTO(row);
}

export async function archiveStrategy(ownerId: string, id: string): Promise<StrategyDTO> {
  await getStrategy(ownerId, id);
  const row = await prisma.strategy.update({
    where: { id },
    data: { status: StrategyStatus.ARQUIVADA },
    include: includeNames,
  });
  return toDTO(row);
}

export function previewStrategyOpportunity(strategy: StrategyDTO) {
  return strategyConversionReview({
    problem: strategy.problem,
    hypothesis: strategy.hypothesis,
    primaryKpi: strategy.primaryKpi,
    estimatedInvestment: strategy.estimatedInvestment,
    risk: strategy.risk,
    evidenceCount: strategy.evidenceIds.length,
    missing: [],
  });
}

export async function convertStrategyToOpportunity(
  ownerId: string,
  strategyId: string,
  confirmed: boolean,
): Promise<{ strategy: StrategyDTO; opportunity: OpportunityDTO }> {
  if (!confirmed) throw new Error("Confirme a criação da oportunidade.");
  const strategy = await getStrategy(ownerId, strategyId);
  if (strategy.opportunityId) {
    throw new Error("Esta estratégia já gerou uma oportunidade.");
  }
  const targetCompanyId = strategy.destinationCompanyId ?? strategy.companyId;
  const company = await prisma.company.findFirst({ where: { id: targetCompanyId, ownerId } });
  if (!company) throw new AppError("FORBIDDEN");
  const preview = previewStrategyOpportunity(strategy);
  if (!preview.canConfirm) throw new Error("Informe problema e hipótese antes de criar a oportunidade.");

  const opportunity = await prisma.opportunity.create({
    data: {
      companyId: targetCompanyId,
      createdById: ownerId,
      origin: OpportunityOrigin.STRATEGY,
      title: strategy.title,
      description: strategy.description,
      problemStatement: strategy.problem ?? preview.problem,
      hypothesis: strategy.hypothesis ?? preview.hypothesis,
      expectedImpact: 3,
      urgency: 3,
      confidence: 2,
      effort: strategy.effort === "BAIXO" ? 2 : strategy.effort === "ALTO" ? 4 : 3,
      investment: strategy.estimatedInvestment,
      status: OpportunityStatus.DRAFT,
      evidenceLevel: EvidenceLevel.HYPOTHESIS,
      scorePartial: true,
      scoreReasons: [
        "Oportunidade originada de estratégia cruzada. Permanece hipótese.",
        "Evidência da empresa origem não foi copiada para o destino.",
      ],
    },
  });

  const updated = await prisma.strategy.update({
    where: { id: strategy.id },
    data: {
      opportunityId: opportunity.id,
      convertedAt: new Date(),
      status: StrategyStatus.EM_TESTE,
    },
    include: includeNames,
  });

  if (strategy.connectionId) {
    await markConnectionTesting(ownerId, strategy.connectionId);
  }

  await writeAudit({
    actorId: ownerId,
    companyId: targetCompanyId,
    action: "strategy.converted_to_opportunity",
    entity: "Strategy",
    entityId: strategy.id,
    newValue: { opportunityId: opportunity.id, companyId: targetCompanyId },
  });
  await writeAudit({
    actorId: ownerId,
    companyId: targetCompanyId,
    action: "opportunity.create",
    entity: "Opportunity",
    entityId: opportunity.id,
    newValue: { origin: "STRATEGY", strategyId: strategy.id },
  });

  return { strategy: toDTO(updated), opportunity: toOpportunityDTO(opportunity, null) };
}
