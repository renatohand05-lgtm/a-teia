import "server-only";

import { OnboardingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import { toNumber } from "@/lib/format";
import { deriveOnboardingStatus } from "@/lib/onboarding";
import type { OnboardingInput } from "@/lib/validations";
import { getCompany } from "@/services/companyService";

export type OnboardingDTO = {
  id: string;
  companyId: string;
  city: string | null;
  state: string | null;
  averageTicket: number | null;
  clientsPerMonth: number | null;
  estimatedRecurrence: string | null;
  status: OnboardingStatus;
  completedAt: string | null;
  updatedAt: string;
};

function emptyToNull(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function toOnboardingDTO(row: {
  id: string;
  companyId: string;
  city: string | null;
  state: string | null;
  averageTicket: Prisma.Decimal | null;
  clientsPerMonth: number | null;
  estimatedRecurrence: string | null;
  status: OnboardingStatus;
  completedAt: Date | null;
  updatedAt: Date;
}): OnboardingDTO {
  return {
    id: row.id,
    companyId: row.companyId,
    city: row.city,
    state: row.state,
    averageTicket: toNumber(row.averageTicket),
    clientsPerMonth: row.clientsPerMonth,
    estimatedRecurrence: row.estimatedRecurrence,
    status: row.status,
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOnboarding(ownerId: string, companyId: string): Promise<OnboardingDTO | null> {
  const company = await getCompany(ownerId, companyId);
  if (!company) return null;
  const row = await prisma.companyOnboarding.findUnique({ where: { companyId } });
  return row ? toOnboardingDTO(row) : null;
}

export async function upsertOnboarding(
  ownerId: string,
  companyId: string,
  input: OnboardingInput,
): Promise<OnboardingDTO> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) {
    throw new Error("Empresa não encontrada.");
  }

  const status = deriveOnboardingStatus({
    name: input.name,
    segment: input.segment,
    city: input.city,
    state: input.state,
    revenueMonthly: input.revenueMonthly,
    teamSize: input.teamSize,
    channels: input.channels,
    primaryObjective: input.primaryObjective,
    perceivedBottleneck: input.perceivedBottleneck,
  });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: input.name.trim(),
      segment: emptyToNull(input.segment),
      revenueMonthly: input.revenueMonthly ?? null,
      teamSize: input.teamSize ?? null,
      channels: emptyToNull(input.channels),
      objectives: emptyToNull(input.primaryObjective),
      perceivedBottlenecks: emptyToNull(input.perceivedBottleneck),
      notes: emptyToNull(input.notes),
    },
  });

  const previous = await prisma.companyOnboarding.findUnique({ where: { companyId } });

  const row = await prisma.companyOnboarding.upsert({
    where: { companyId },
    create: {
      companyId,
      updatedById: ownerId,
      city: emptyToNull(input.city),
      state: emptyToNull(input.state),
      averageTicket: input.averageTicket ?? null,
      clientsPerMonth: input.clientsPerMonth ?? null,
      estimatedRecurrence: emptyToNull(input.estimatedRecurrence),
      status,
      completedAt: status === "COMPLETE" ? new Date() : null,
    },
    update: {
      updatedById: ownerId,
      city: emptyToNull(input.city),
      state: emptyToNull(input.state),
      averageTicket: input.averageTicket ?? null,
      clientsPerMonth: input.clientsPerMonth ?? null,
      estimatedRecurrence: emptyToNull(input.estimatedRecurrence),
      status,
      completedAt:
        status === "COMPLETE" ? previous?.completedAt ?? new Date() : null,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "onboarding.upsert",
    entity: "CompanyOnboarding",
    entityId: row.id,
    previousValue: { status: company.name },
    newValue: { status: row.status, companyId },
    origin: "USER",
  });

  return toOnboardingDTO(row);
}
