import "server-only";

import { AuditSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { categoryFromAction, sanitizeAuditValue } from "@/lib/security/sanitize";

type AuditInput = {
  actorId?: string | null;
  companyId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  category?: string | null;
  success?: boolean;
  previousValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  origin?: AuditSource;
  ip?: string | null;
};

function asJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  return sanitizeAuditValue(value) as Prisma.InputJsonValue;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  const data = {
    actorId: input.actorId ?? undefined,
    companyId: input.companyId ?? undefined,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? undefined,
    category: input.category ?? categoryFromAction(input.action),
    success: input.success ?? true,
    previousValue: asJson(input.previousValue),
    newValue: asJson(input.newValue),
    origin: input.origin ?? AuditSource.USER,
    ip: input.ip ?? undefined,
  };
  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "P2003" && data.actorId) {
      await prisma.auditLog.create({ data: { ...data, actorId: undefined } });
      return;
    }
    throw error;
  }
}

export type AuditListFilters = {
  from?: Date;
  to?: Date;
  companyId?: string;
  category?: string;
  action?: string;
  success?: boolean;
  limit?: number;
};

export async function listOwnerAudit(ownerId: string, filters: AuditListFilters = {}) {
  const take = Math.min(Math.max(filters.limit ?? 80, 1), 200);
  const ownedCompanyIds = (
    await prisma.company.findMany({
      where: { ownerId },
      select: { id: true },
    })
  ).map((row) => row.id);

  const rows = await prisma.auditLog.findMany({
    where: {
      AND: [
        {
          OR: [
            { actorId: ownerId },
            ...(ownedCompanyIds.length ? [{ companyId: { in: ownedCompanyIds } }] : []),
          ],
        },
        filters.from || filters.to
          ? { createdAt: { gte: filters.from, lte: filters.to } }
          : {},
        filters.companyId ? { companyId: filters.companyId } : {},
        filters.category ? { category: filters.category } : {},
        filters.action ? { action: filters.action } : {},
        typeof filters.success === "boolean" ? { success: filters.success } : {},
      ],
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true, ownerId: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return rows
    .filter((row) => {
      if (row.company && row.company.ownerId !== ownerId) return false;
      if (row.actorId && row.actorId !== ownerId && row.company?.ownerId !== ownerId) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actorId: row.actorId,
      actorName: row.actor?.name ?? "Sistema",
      actorEmail: row.actor?.email ?? null,
      companyId: row.companyId,
      companyName: row.company?.name ?? null,
      category: row.category ?? categoryFromAction(row.action),
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      success: row.success,
      origin: row.origin,
      metadata: sanitizeAuditValue(row.newValue),
    }));
}

export async function writeCockpitViewed(actorId: string): Promise<void> {
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const recent = await prisma.auditLog.findFirst({
    where: { actorId, action: "cockpit.viewed", createdAt: { gte: windowStart } },
    select: { id: true },
  });
  if (recent) return;
  await writeAudit({
    actorId,
    action: "cockpit.viewed",
    entity: "Cockpit",
    origin: AuditSource.USER,
  });
}

export async function getOwnerAuditEvent(ownerId: string, eventId: string) {
  const events = await listOwnerAudit(ownerId, { limit: 200 });
  return events.find((item) => item.id === eventId) ?? null;
}
