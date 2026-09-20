import "server-only";

import { CompanyStatus, Prisma } from "@prisma/client";
import { coverageFromFlags, listingPriorityLabel, nextActionForCompany, type EssentialFlags } from "@/lib/company-ux";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { CompanyInput } from "@/lib/validations";
import { writeAudit } from "@/services/auditService";

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

export type CompanyDirectoryRow = CompanyDTO & {
  coverage: ReturnType<typeof coverageFromFlags>;
  nextAction: ReturnType<typeof nextActionForCompany>;
  priorityLabel: string;
};

export async function listCompanyDirectory(ownerId: string, includeArchived = true): Promise<CompanyDirectoryRow[]> {
  const companies = await listCompanies(ownerId, includeArchived);
  if (!companies.length) return [];

  const ids = companies.map((company) => company.id);
  const [onboardings, diagnoses, statements, opportunities, plans] = await Promise.all([
    prisma.companyOnboarding.findMany({
      where: { company: { ownerId }, companyId: { in: ids } },
      select: { companyId: true, status: true },
    }),
    prisma.diagnosis.findMany({
      where: { company: { ownerId }, companyId: { in: ids } },
      select: { companyId: true },
    }),
    prisma.financialStatement.findMany({
      where: { company: { ownerId }, companyId: { in: ids } },
      select: { companyId: true, grossRevenue: true },
    }),
    prisma.opportunity.findMany({
      where: { company: { ownerId }, companyId: { in: ids } },
      select: { companyId: true, status: true },
    }),
    prisma.actionPlan.findMany({
      where: { company: { ownerId }, companyId: { in: ids } },
      select: { companyId: true },
    }),
  ]);

  const onboardingByCompany = new Set(
    onboardings.filter((item) => item.status === "COMPLETE" || item.status === "DRAFT").map((item) => item.companyId),
  );
  const diagnosisByCompany = new Set(diagnoses.map((item) => item.companyId));
  const financeByCompany = new Set(statements.filter((item) => item.grossRevenue != null).map((item) => item.companyId));
  const opportunityByCompany = new Map<string, { total: number; active: number }>();
  for (const item of opportunities) {
    const current = opportunityByCompany.get(item.companyId) ?? { total: 0, active: 0 };
    current.total += 1;
    if (item.status === "ACTIVE" || item.status === "IN_PROGRESS" || item.status === "VALIDATED") current.active += 1;
    opportunityByCompany.set(item.companyId, current);
  }
  const planByCompany = new Map<string, number>();
  for (const item of plans) {
    if (!item.companyId) continue;
    planByCompany.set(item.companyId, (planByCompany.get(item.companyId) ?? 0) + 1);
  }

  return companies.map((company) => {
    const flags: EssentialFlags = {
      cadastro: Boolean(company.segment?.trim()),
      onboarding: onboardingByCompany.has(company.id),
      diagnostico: diagnosisByCompany.has(company.id),
      financeiro: financeByCompany.has(company.id),
      oportunidades: (opportunityByCompany.get(company.id)?.total ?? 0) > 0,
    };
    const nextAction = nextActionForCompany({
      companyId: company.id,
      companyName: company.name,
      hasCompany: true,
      hasDiagnosis: flags.diagnostico,
      opportunityCount: opportunityByCompany.get(company.id)?.total ?? 0,
      prioritizedOpportunityCount: opportunityByCompany.get(company.id)?.active ?? 0,
      planCount: planByCompany.get(company.id) ?? 0,
      financialCount: flags.financeiro ? 1 : 0,
      experimentActiveCount: 0,
      experimentCompletedCount: 0,
      evidenceCount: 0,
      evidenceValidatedCount: 0,
      memoryValidatedCount: 0,
      attention: false,
    });
    return {
      ...company,
      coverage: coverageFromFlags(flags),
      nextAction,
      priorityLabel: listingPriorityLabel(company),
    };
  });
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

export async function restoreCompany(ownerId: string, id: string, ip?: string): Promise<CompanyDTO> {
  const existing = await prisma.company.findFirst({ where: { id, ownerId } });
  if (!existing) {
    throw new Error("Empresa não encontrada.");
  }
  if (existing.status !== CompanyStatus.ARCHIVED) {
    throw new Error("Empresa não está arquivada.");
  }

  const row = await prisma.company.update({
    where: { id },
    data: {
      status: CompanyStatus.ACTIVE,
      archivedAt: null,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "company.restore",
    entity: "Company",
    entityId: row.id,
    companyId: row.id,
    previousValue: { status: existing.status },
    newValue: { status: row.status },
    origin: "USER",
    ip,
  });

  return toDTO(row);
}

