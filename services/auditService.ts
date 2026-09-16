import "server-only";

import { AuditSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  origin?: AuditSource;
  ip?: string | null;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? undefined,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? undefined,
      previousValue: input.previousValue ?? Prisma.JsonNull,
      newValue: input.newValue ?? Prisma.JsonNull,
      origin: input.origin ?? AuditSource.USER,
      ip: input.ip ?? undefined,
    },
  });
}
