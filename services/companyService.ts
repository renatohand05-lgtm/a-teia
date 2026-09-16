import "server-only";

import { CompanyStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import type { CompanyInput } from "@/lib/validations";
import { toNumber } from "@/lib/format";

export { cockpitPriorityFromCompany } from "@/lib/priority";

export type CompanyDTO = {
  id: string;
  name: string;
  segment: string | null;
  units: number | null;
  revenueMonthly: number | null;
  marginPercent: number | null;
  teamSize: number | null;
  channels: string | null;
  objectives: string | null;
  perceivedBottlenecks: string | null;
  notes: string | null;
  status: CompanyStatus;
  isDemo: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDTO(row: {
  id: string;
  name: string;
  segment: string | null;
  units: number | null;
  revenueMonthly: Prisma.Decimal | null;
  marginPercent: Prisma.Decimal | null;
  teamSize: number | null;
  channels: string | null;
  objectives: string | null;
  perceivedBottlenecks: string | null;
  notes: string | null;
  status: CompanyStatus;
  isDemo: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CompanyDTO {
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    units: row.units,
    revenueMonthly: toNumber(row.revenueMonthly),
    marginPercent: toNumber(row.marginPercent),
    teamSize: row.teamSize,
    channels: row.channels,
    objectives: row.objectives,
    perceivedBottlenecks: row.perceivedBottlenecks,
    notes: row.notes,
    status: row.status,
    isDemo: row.isDemo,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function emptyToNull(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function listCompanies(ownerId: string, includeArchived = false): Promise<CompanyDTO[]> {
  const rows = await prisma.company.findMany({
    where: {
      ownerId,
      ...(includeArchived ? {} : { status: CompanyStatus.ACTIVE }),
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getCompany(ownerId: string, id: string): Promise<CompanyDTO | null> {
  const row = await prisma.company.findFirst({ where: { id, ownerId } });
  return row ? toDTO(row) : null;
}

export async function createCompany(
  ownerId: string,
  input: CompanyInput,
  ip?: string,
): Promise<CompanyDTO> {
  const row = await prisma.company.create({
    data: {
      ownerId,
      name: input.name.trim(),
      segment: emptyToNull(input.segment),
      units: input.units ?? null,
      revenueMonthly: input.revenueMonthly ?? null,
      marginPercent: input.marginPercent ?? null,
      teamSize: input.teamSize ?? null,
      channels: emptyToNull(input.channels),
      objectives: emptyToNull(input.objectives),
      perceivedBottlenecks: emptyToNull(input.perceivedBottlenecks),
      notes: emptyToNull(input.notes),
      isDemo: input.isDemo ?? false,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "company.create",
    entity: "Company",
    entityId: row.id,
    newValue: { name: row.name, isDemo: row.isDemo },
    origin: "USER",
    ip,
  });

  return toDTO(row);
}

export async function updateCompany(
  ownerId: string,
  id: string,
  input: CompanyInput,
  ip?: string,
): Promise<CompanyDTO> {
  const existing = await prisma.company.findFirst({ where: { id, ownerId } });
  if (!existing) {
    throw new Error("Empresa não encontrada.");
  }

  const row = await prisma.company.update({
    where: { id },
    data: {
      name: input.name.trim(),
      segment: emptyToNull(input.segment),
      units: input.units ?? null,
      revenueMonthly: input.revenueMonthly ?? null,
      marginPercent: input.marginPercent ?? null,
      teamSize: input.teamSize ?? null,
      channels: emptyToNull(input.channels),
      objectives: emptyToNull(input.objectives),
      perceivedBottlenecks: emptyToNull(input.perceivedBottlenecks),
      notes: emptyToNull(input.notes),
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "company.update",
    entity: "Company",
    entityId: row.id,
    previousValue: { name: existing.name, segment: existing.segment },
    newValue: { name: row.name, segment: row.segment },
    origin: "USER",
    ip,
  });

  return toDTO(row);
}

export async function archiveCompany(ownerId: string, id: string, ip?: string): Promise<CompanyDTO> {
  const existing = await prisma.company.findFirst({ where: { id, ownerId } });
  if (!existing) {
    throw new Error("Empresa não encontrada.");
  }

  const row = await prisma.company.update({
    where: { id },
    data: {
      status: CompanyStatus.ARCHIVED,
      archivedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "company.archive",
    entity: "Company",
    entityId: row.id,
    previousValue: { status: existing.status },
    newValue: { status: row.status },
    origin: "USER",
    ip,
  });

  return toDTO(row);
}

