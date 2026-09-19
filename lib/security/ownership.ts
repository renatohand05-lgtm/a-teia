import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/security/errors";
import { writeAudit } from "@/services/auditService";

export type OwnedResourceKind =
  | "company"
  | "opportunity"
  | "diagnosis"
  | "actionPlan"
  | "task"
  | "experiment"
  | "evidence"
  | "memory"
  | "decision"
  | "allocation"
  | "automation"
  | "alert"
  | "conversation"
  | "research";

export type OwnedResource = {
  id: string;
  ownerId: string;
  companyId?: string | null;
  kind: OwnedResourceKind;
};

async function resolveOwner(kind: OwnedResourceKind, id: string): Promise<OwnedResource | null> {
  switch (kind) {
    case "company": {
      const row = await prisma.company.findUnique({ where: { id }, select: { id: true, ownerId: true } });
      return row ? { id: row.id, ownerId: row.ownerId, companyId: row.id, kind } : null;
    }
    case "opportunity": {
      const row = await prisma.opportunity.findUnique({
        where: { id },
        select: { id: true, companyId: true, company: { select: { ownerId: true } } },
      });
      return row?.company ? { id: row.id, ownerId: row.company.ownerId, companyId: row.companyId, kind } : null;
    }
    case "diagnosis": {
      const row = await prisma.diagnosis.findUnique({
        where: { id },
        select: { id: true, companyId: true, company: { select: { ownerId: true } } },
      });
      return row?.company ? { id: row.id, ownerId: row.company.ownerId, companyId: row.companyId, kind } : null;
    }
    case "actionPlan": {
      const row = await prisma.actionPlan.findUnique({
        where: { id },
        select: { id: true, companyId: true, ownerId: true, company: { select: { ownerId: true } } },
      });
      const ownerId = row?.company?.ownerId ?? row?.ownerId;
      return row && ownerId ? { id: row.id, ownerId, companyId: row.companyId, kind } : null;
    }
    case "task": {
      const row = await prisma.task.findUnique({
        where: { id },
        select: {
          id: true,
          actionPlan: { select: { companyId: true, company: { select: { ownerId: true } } } },
        },
      });
      return row?.actionPlan?.company
        ? { id: row.id, ownerId: row.actionPlan.company.ownerId, companyId: row.actionPlan.companyId, kind }
        : null;
    }
    case "experiment": {
      const row = await prisma.experiment.findUnique({
        where: { id },
        select: { id: true, companyId: true, company: { select: { ownerId: true } } },
      });
      return row?.company ? { id: row.id, ownerId: row.company.ownerId, companyId: row.companyId, kind } : null;
    }
    case "evidence": {
      const row = await prisma.evidence.findUnique({
        where: { id },
        select: { id: true, companyId: true, company: { select: { ownerId: true } } },
      });
      return row?.company ? { id: row.id, ownerId: row.company.ownerId, companyId: row.companyId, kind } : null;
    }
    case "memory": {
      const row = await prisma.strategicMemory.findUnique({
        where: { id },
        select: { id: true, companyId: true, company: { select: { ownerId: true } } },
      });
      return row?.company ? { id: row.id, ownerId: row.company.ownerId, companyId: row.companyId, kind } : null;
    }
    case "decision": {
      const row = await prisma.decision.findUnique({
        where: { id },
        select: { id: true, companyId: true, createdById: true, company: { select: { ownerId: true } } },
      });
      const ownerId = row?.company?.ownerId ?? row?.createdById;
      return row && ownerId ? { id: row.id, ownerId, companyId: row.companyId, kind } : null;
    }
    case "allocation": {
      const row = await prisma.allocationProposal.findUnique({
        where: { id },
        select: { id: true, ownerId: true },
      });
      return row ? { id: row.id, ownerId: row.ownerId, kind } : null;
    }
    case "automation": {
      const row = await prisma.automation.findUnique({
        where: { id },
        select: { id: true, ownerId: true, companyId: true },
      });
      return row ? { id: row.id, ownerId: row.ownerId, companyId: row.companyId, kind } : null;
    }
    case "alert": {
      const row = await prisma.automationAlert.findUnique({
        where: { id },
        select: { id: true, ownerId: true, companyId: true },
      });
      return row ? { id: row.id, ownerId: row.ownerId, companyId: row.companyId, kind } : null;
    }
    case "conversation": {
      const row = await prisma.aIConversation.findUnique({
        where: { id },
        select: { id: true, userId: true, companyId: true },
      });
      return row ? { id: row.id, ownerId: row.userId, companyId: row.companyId, kind } : null;
    }
    case "research": {
      const row = await prisma.researchSession.findUnique({
        where: { id },
        select: { id: true, userId: true, companyId: true, company: { select: { ownerId: true } } },
      });
      const ownerId = row?.userId ?? row?.company?.ownerId;
      return row && ownerId ? { id: row.id, ownerId, companyId: row.companyId, kind } : null;
    }
    default:
      return null;
  }
}

export function assertCompanyAccess(actorOwnerId: string, companyOwnerId: string): void {
  if (actorOwnerId !== companyOwnerId) {
    throw new AppError("FORBIDDEN");
  }
}

export function assertResourceOwnership(actorOwnerId: string, resourceOwnerId: string): void {
  if (actorOwnerId !== resourceOwnerId) {
    throw new AppError("FORBIDDEN");
  }
}

export async function requireOwnedResource(
  actorId: string,
  kind: OwnedResourceKind,
  id: string,
): Promise<OwnedResource> {
  const resource = await resolveOwner(kind, id);
  if (!resource || resource.ownerId !== actorId) {
    const knownActor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
    await writeAudit({
      actorId: knownActor?.id,
      action: "security.access_denied",
      entity: kind,
      entityId: id,
      success: false,
      newValue: { kind },
    }).catch(() => undefined);
    throw new AppError("FORBIDDEN");
  }
  return resource;
}
