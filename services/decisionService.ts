import "server-only";

import { AuditSource, DecisionStatus, EvidenceLevel, Prisma } from "@prisma/client";
import { isUnequivocalTestOrphanDecision, normalizeHumanReason, TEST_ORPHAN_DECISION_TITLES } from "@/lib/decision-reason";
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const decision = await prisma.$transaction(
        async (tx) => {
          const existingPending = await tx.decision.findFirst({
            where: {
              createdById: input.createdById,
              companyId: input.companyId ?? null,
              opportunityId: input.opportunityId ?? null,
              title: input.title,
              status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
            },
            orderBy: { createdAt: "asc" },
          });
          if (existingPending) return { decision: existingPending, created: false as const };
          const created = await tx.decision.create({
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
          return { decision: created, created: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (decision.created) {
        await writeAudit({
          actorId: input.createdById,
          action: "decision.propose",
          entity: "Decision",
          entityId: decision.decision.id,
          newValue: { title: decision.decision.title, status: decision.decision.status, origin: decision.decision.origin },
          origin: input.origin,
        });
      }
      return decision.decision;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
      if (code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("Não foi possível registrar a decisão agora.");
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
      AND: [
        { OR: [{ createdById: ownerId }, { company: { ownerId } }] },
        {
          OR: [{ companyId: { not: null } }, { allocationProposals: { some: {} } }],
        },
      ],
    },
    include: decisionInclude,
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return rows.filter((item) => !item.company || item.company.ownerId === ownerId).map(toDecisionDTO);
}

export async function cancelUnequivocalTestOrphanDecisions(actorId?: string | null) {
  const reason = normalizeHumanReason(
    "Resíduo de teste: empresa apagada (companyId SetNull). Cancelada no Sprint 21. Histórico APPROVED/EXECUTED preservado.",
  );
  const rows = await prisma.decision.findMany({
    where: {
      companyId: null,
      opportunityId: null,
      strategyId: null,
      title: { in: [...TEST_ORPHAN_DECISION_TITLES] },
      status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
      allocationProposals: { none: {} },
      playbookApplications: { none: {} },
    },
    select: { id: true, title: true, status: true, companyId: true, opportunityId: true },
  });
  const eligible = rows.filter((item) =>
    isUnequivocalTestOrphanDecision({
      title: item.title,
      companyId: item.companyId,
      opportunityId: item.opportunityId,
      hasAllocationProposal: false,
      status: item.status,
    }),
  );
  if (!eligible.length) {
    return { cancelled: 0, ids: [] as string[] };
  }
  const ids = eligible.map((item) => item.id);
  await prisma.decision.updateMany({
    where: { id: { in: ids } },
    data: { status: DecisionStatus.CANCELLED, humanReason: reason },
  });
  await writeAudit({
    actorId: actorId ?? undefined,
    action: "decision.test_orphan.cancelled",
    entity: "Decision",
    newValue: {
      count: ids.length,
      titles: [...TEST_ORPHAN_DECISION_TITLES],
      ids: ids.slice(0, 80),
      preserved: "APPROVED/EXECUTED/REJECTED not cancelled",
    },
    origin: AuditSource.SYSTEM,
  });
  return { cancelled: ids.length, ids };
}
