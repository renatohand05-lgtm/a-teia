import "server-only";

import { AuditSource, DecisionStatus, EvidenceLevel } from "@prisma/client";
import { normalizeHumanReason } from "@/lib/decision-reason";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";

export type DecisionDTO = {
  id: string;
  title: string;
  rationale: string | null;
  humanReason: string | null;
  status: DecisionStatus;
  origin: AuditSource;
  companyId: string | null;
  companyName: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  opportunityEvidenceLevel: EvidenceLevel | null;
  estimatedInvestment: number | null;
  expectedMonthlyReturn: number | null;
  createdById: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  deferredAt: string | null;
  requiresHumanApproval: boolean;
};

/**
 * Motor de decisão preparado.
 * Propostas da IA nascem como PENDING_HUMAN_APPROVAL e nunca executam sozinhas.
 */
export async function proposeDecision(input: {
  createdById: string;
  companyId?: string;
  opportunityId?: string;
  title: string;
  rationale: string;
  origin: AuditSource;
}) {
  if (input.companyId) {
    const company = await prisma.company.findFirst({ where: { id: input.companyId, ownerId: input.createdById } });
    if (!company) throw new Error("Empresa não encontrada.");
  }
  if (input.opportunityId) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, company: { ownerId: input.createdById } },
    });
    if (!opportunity) throw new Error("Oportunidade não encontrada.");
  }

  const requiresHumanApproval = true;

  const existingPending = await prisma.decision.findFirst({
    where: {
      createdById: input.createdById,
      companyId: input.companyId ?? null,
      opportunityId: input.opportunityId ?? null,
      title: input.title,
      status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (existingPending) return existingPending;

  const decision = await prisma.decision.create({
    data: {
      createdById: input.createdById,
      companyId: input.companyId,
      opportunityId: input.opportunityId,
      title: input.title,
      rationale: input.rationale,
      origin: input.origin,
      requiresHumanApproval,
      status: DecisionStatus.PENDING_HUMAN_APPROVAL,
    },
  });

  await writeAudit({
    actorId: input.createdById,
    action: "decision.propose",
    entity: "Decision",
    entityId: decision.id,
    newValue: { title: decision.title, status: decision.status, origin: decision.origin },
    origin: input.origin,
  });

  return decision;
}

async function ownedDecision(actorId: string, decisionId: string) {
  const existing = await prisma.decision.findFirst({
    where: {
      id: decisionId,
      OR: [{ createdById: actorId }, { company: { ownerId: actorId } }],
    },
    include: { company: { select: { ownerId: true, name: true } }, opportunity: { select: { title: true } } },
  });
  if (!existing) throw new Error("Decisão não encontrada.");
  if (existing.company && existing.company.ownerId !== actorId) throw new Error("Decisão não encontrada.");
  return existing;
}

function requirePending(existing: { status: DecisionStatus; requiresHumanApproval: boolean }) {
  if (existing.status !== DecisionStatus.PENDING_HUMAN_APPROVAL && existing.status !== DecisionStatus.DEFERRED) {
    throw new Error("Esta decisão já foi encerrada.");
  }
  if (!existing.requiresHumanApproval) {
    throw new Error("Decisão crítica exige confirmação humana.");
  }
}

export async function approveDecision(input: { actorId: string; decisionId: string; humanReason?: string | null }) {
  const existing = await ownedDecision(input.actorId, input.decisionId);
  requirePending(existing);
  const humanReason = normalizeHumanReason(input.humanReason);

  const decision = await prisma.decision.update({
    where: { id: input.decisionId },
    data: {
      status: DecisionStatus.APPROVED,
      approvedAt: new Date(),
      humanReason,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "decision.approved",
    entity: "Decision",
    entityId: decision.id,
    companyId: existing.companyId,
    previousValue: { status: existing.status },
    newValue: { status: decision.status, humanReason },
    origin: AuditSource.USER,
  });

  return decision;
}

export async function rejectDecision(input: { actorId: string; decisionId: string; humanReason?: string | null }) {
  const existing = await ownedDecision(input.actorId, input.decisionId);
  requirePending(existing);
  const humanReason = normalizeHumanReason(input.humanReason);
  const decision = await prisma.decision.update({
    where: { id: input.decisionId },
    data: { status: DecisionStatus.REJECTED, rejectedAt: new Date(), humanReason },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "decision.rejected",
    entity: "Decision",
    entityId: decision.id,
    companyId: existing.companyId,
    previousValue: { status: existing.status },
    newValue: { status: decision.status, humanReason },
    origin: AuditSource.USER,
  });
  return decision;
}

export async function deferDecision(input: { actorId: string; decisionId: string }) {
  const existing = await ownedDecision(input.actorId, input.decisionId);
  requirePending(existing);
  const decision = await prisma.decision.update({
    where: { id: input.decisionId },
    data: { status: DecisionStatus.DEFERRED, deferredAt: new Date() },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "decision.deferred",
    entity: "Decision",
    entityId: decision.id,
    previousValue: { status: existing.status },
    newValue: { status: decision.status },
    origin: AuditSource.USER,
  });
  return decision;
}

export async function reviewDecision(input: { actorId: string; decisionId: string }) {
  const existing = await ownedDecision(input.actorId, input.decisionId);
  await writeAudit({
    actorId: input.actorId,
    action: "decision.reviewed",
    entity: "Decision",
    entityId: existing.id,
    newValue: { status: existing.status },
    origin: AuditSource.USER,
  });
  return existing;
}

const decisionInclude = {
  company: { select: { name: true, ownerId: true } },
  opportunity: { select: { title: true, investment: true, expectedReturn: true, evidenceLevel: true } },
} as const;

function toDecisionDTO(item: {
  id: string;
  title: string;
  rationale: string | null;
  humanReason: string | null;
  status: DecisionStatus;
  origin: AuditSource;
  companyId: string | null;
  opportunityId: string | null;
  createdById: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  deferredAt: Date | null;
  requiresHumanApproval: boolean;
  company: { name: string; ownerId: string } | null;
  opportunity: {
    title: string;
    investment: { toString(): string } | null;
    expectedReturn: { toString(): string } | null;
    evidenceLevel: EvidenceLevel;
  } | null;
}): DecisionDTO {
  return {
    id: item.id,
    title: item.title,
    rationale: item.rationale,
    humanReason: item.humanReason,
    status: item.status,
    origin: item.origin,
    companyId: item.companyId,
    companyName: item.company?.name ?? null,
    opportunityId: item.opportunityId,
    opportunityTitle: item.opportunity?.title ?? null,
    opportunityEvidenceLevel: item.opportunity?.evidenceLevel ?? null,
    estimatedInvestment: toNumber(item.opportunity?.investment),
    expectedMonthlyReturn: toNumber(item.opportunity?.expectedReturn),
    createdById: item.createdById,
    createdAt: item.createdAt.toISOString(),
    approvedAt: item.approvedAt ? item.approvedAt.toISOString() : null,
    rejectedAt: item.rejectedAt ? item.rejectedAt.toISOString() : null,
    deferredAt: item.deferredAt ? item.deferredAt.toISOString() : null,
    requiresHumanApproval: item.requiresHumanApproval,
  };
}

export async function listOpportunityDecisions(
  ownerId: string,
  companyId: string,
  opportunityId: string,
): Promise<DecisionDTO[]> {
  const rows = await prisma.decision.findMany({
    where: { opportunityId, companyId, company: { ownerId } },
    include: decisionInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.filter((item) => !item.company || item.company.ownerId === ownerId).map(toDecisionDTO);
}

export async function listOwnerDecisions(ownerId: string): Promise<DecisionDTO[]> {
  const rows = await prisma.decision.findMany({
    where: {
      OR: [{ createdById: ownerId }, { company: { ownerId } }],
    },
    include: decisionInclude,
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return rows.filter((item) => !item.company || item.company.ownerId === ownerId).map(toDecisionDTO);
}
