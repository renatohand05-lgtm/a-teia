import "server-only";

import { AuditSource, DecisionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";

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
  const requiresHumanApproval = input.origin === AuditSource.AI || true;

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

export async function approveDecision(input: { actorId: string; decisionId: string }) {
  const existing = await prisma.decision.findUnique({ where: { id: input.decisionId } });
  if (!existing) throw new Error("Decisão não encontrada.");

  const decision = await prisma.decision.update({
    where: { id: input.decisionId },
    data: {
      status: DecisionStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "decision.approve",
    entity: "Decision",
    entityId: decision.id,
    previousValue: { status: existing.status },
    newValue: { status: decision.status },
    origin: AuditSource.USER,
  });

  return decision;
}
