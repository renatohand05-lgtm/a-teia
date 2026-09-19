import "server-only";

import { AuditSource, DecisionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";

export type DecisionDTO = {
  id: string;
  title: string;
  rationale: string | null;
  status: DecisionStatus;
  origin: AuditSource;
  companyId: string | null;
  companyName: string | null;
  opportunityTitle: string | null;
  createdById: string | null;
  createdAt: string;
  requiresHumanApproval: boolean;
};

/**
 * Motor de decisão preparado.
 * Propostas da IA nascem como PENDING_HUMAN_APPROVAL e nunca executam sozinhas.
 */
export async function proposeDecision(input: {
  createdById: string;
  companyId?: string;
  title: string;
  rationale: string;
  origin: AuditSource;
}) {
  if (input.companyId) {
    const company = await prisma.company.findFirst({ where: { id: input.companyId, ownerId: input.createdById } });
    if (!company) throw new Error("Empresa não encontrada.");
  }

  const requiresHumanApproval = true;

  const decision = await prisma.decision.create({
    data: {
      createdById: input.createdById,
      companyId: input.companyId,
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

export async function approveDecision(input: { actorId: string; decisionId: string }) {
  const existing = await ownedDecision(input.actorId, input.decisionId);
  requirePending(existing);

  const decision = await prisma.decision.update({
    where: { id: input.decisionId },
    data: {
      status: DecisionStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "decision.approved",
    entity: "Decision",
    entityId: decision.id,
    previousValue: { status: existing.status },
    newValue: { status: decision.status },
    origin: AuditSource.USER,
  });

  return decision;
}

export async function rejectDecision(input: { actorId: string; decisionId: string }) {
  const existing = await ownedDecision(input.actorId, input.decisionId);
  requirePending(existing);
  const decision = await prisma.decision.update({
    where: { id: input.decisionId },
    data: { status: DecisionStatus.REJECTED, rejectedAt: new Date() },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "decision.rejected",
    entity: "Decision",
    entityId: decision.id,
    previousValue: { status: existing.status },
    newValue: { status: decision.status },
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

export async function listOwnerDecisions(ownerId: string): Promise<DecisionDTO[]> {
  const rows = await prisma.decision.findMany({
    where: {
      OR: [{ createdById: ownerId }, { company: { ownerId } }],
    },
    include: { company: { select: { name: true, ownerId: true } }, opportunity: { select: { title: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return rows
    .filter((item) => !item.company || item.company.ownerId === ownerId)
    .map((item) => ({
      id: item.id,
      title: item.title,
      rationale: item.rationale,
      status: item.status,
      origin: item.origin,
      companyId: item.companyId,
      companyName: item.company?.name ?? null,
      opportunityTitle: item.opportunity?.title ?? null,
      createdById: item.createdById,
      createdAt: item.createdAt.toISOString(),
      requiresHumanApproval: item.requiresHumanApproval,
    }));
}
