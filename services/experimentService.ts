import "server-only";

import {
  EvidenceLevel,
  ExperimentClassification,
  ExperimentDirection,
  ExperimentStatus,
  KnowledgeKind,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import { toNumber } from "@/lib/format";
import {
  buildEvidenceSummary,
  calculateExperimentPayback,
  calculateExperimentROI,
  canProduceEvidence,
  estimateMeasuredImpact,
  evaluateExperimentResult,
  isCancelledStatus,
  isDraftStatus,
  nextOpportunityEvidenceLevel,
  type ExperimentClassification as Classification,
} from "@/lib/experiment-engine";
import type {
  ExperimentInput,
  ExperimentMeasurementInput,
  ExperimentResultInput,
} from "@/lib/validations";

const experimentInclude = {
  results: { orderBy: { recordedAt: "asc" as const } },
  evidence: { orderBy: { createdAt: "desc" as const } },
  opportunity: true,
  actionPlan: true,
  strategy: true,
} satisfies Prisma.ExperimentInclude;

type ExperimentRow = Prisma.ExperimentGetPayload<{ include: typeof experimentInclude }>;

export type ExperimentMeasurementDTO = {
  id: string;
  measuredValue: number | null;
  notes: string | null;
  recordedAt: string;
  recordedById: string | null;
  outcome: string;
};

export type ExperimentEvidenceDTO = {
  id: string;
  title: string;
  body: string;
  classification: Classification | null;
  createdAt: string;
};

export type ExperimentDTO = {
  id: string;
  companyId: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  actionPlanId: string | null;
  actionPlanTitle: string | null;
  strategyId: string | null;
  strategyTitle: string | null;
  title: string;
  hypothesis: string | null;
  kpi: string | null;
  kpiUnit: string | null;
  direction: ExperimentDirection;
  baseline: number | null;
  target: number | null;
  testDescription: string | null;
  successCriteria: string | null;
  notes: string | null;
  plannedInvestment: number | null;
  realizedInvestment: number | null;
  realizedReturn: number | null;
  roi: number | null;
  payback: number | null;
  status: ExperimentStatus;
  classification: Classification | null;
  classificationReason: string | null;
  finalValue: number | null;
  startedAt: string | null;
  plannedEndAt: string | null;
  endedAt: string | null;
  measurements: ExperimentMeasurementDTO[];
  latestMeasurement: number | null;
  evidence: ExperimentEvidenceDTO[];
  createdAt: string;
  updatedAt: string;
};

export type ExperimentFilters = {
  status?: string | "ALL";
  classification?: string | "ALL";
  kpi?: string | "ALL";
  opportunityId?: string | "ALL";
  year?: number;
};

export type ExperimentSummary = {
  active: number;
  completed: number;
  validated: number;
  partial: number;
  inconclusive: number;
  refuted: number;
  plannedInvestment: number;
  realizedInvestment: number;
  realizedReturn: number;
  roi: number | null;
};

async function requireCompany(ownerId: string, companyId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) throw new Error("Empresa não encontrada.");
  return company;
}

function decimal(value: number | null | undefined): Prisma.Decimal | null {
  return value == null ? null : new Prisma.Decimal(value);
}

function toDTO(row: ExperimentRow): ExperimentDTO {
  const plannedInvestment = toNumber(row.investment);
  const realizedInvestment = toNumber(row.realizedInvestment);
  const realizedReturn = toNumber(row.realizedReturn);
  const measurements: ExperimentMeasurementDTO[] = row.results.map((item) => ({
    id: item.id,
    measuredValue: toNumber(item.measuredValue),
    notes: item.notes,
    recordedAt: item.recordedAt.toISOString(),
    recordedById: item.recordedById,
    outcome: item.outcome,
  }));
  const measured = measurements.filter((item) => item.outcome === "MEASUREMENT");
  return {
    id: row.id,
    companyId: row.companyId,
    opportunityId: row.opportunityId,
    opportunityTitle: row.opportunity?.title ?? null,
    actionPlanId: row.actionPlanId,
    actionPlanTitle: row.actionPlan?.title ?? null,
    strategyId: row.strategyId,
    strategyTitle: row.strategy?.title ?? null,
    title: row.title,
    hypothesis: row.hypothesis,
    kpi: row.kpi,
    kpiUnit: row.kpiUnit,
    direction: row.direction,
    baseline: toNumber(row.baseline),
    target: toNumber(row.target),
    testDescription: row.testDescription,
    successCriteria: row.successCriteria,
    notes: row.notes,
    plannedInvestment,
    realizedInvestment,
    realizedReturn,
    roi: calculateExperimentROI(realizedReturn, realizedInvestment),
    payback: calculateExperimentPayback(realizedInvestment, realizedReturn),
    status: row.status,
    classification: row.classification,
    classificationReason: row.classificationReason,
    finalValue: toNumber(row.finalValue),
    startedAt: row.startedAt?.toISOString() ?? null,
    plannedEndAt: row.plannedEndAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    measurements,
    latestMeasurement: measured.at(-1)?.measuredValue ?? null,
    evidence: row.evidence.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      classification: item.classification,
      createdAt: item.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createExperiment(ownerId: string, input: ExperimentInput): Promise<ExperimentDTO> {
  await requireCompany(ownerId, input.companyId);
  if (input.opportunityId) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, companyId: input.companyId, company: { ownerId } },
    });
    if (!opportunity) throw new Error("Oportunidade não encontrada.");
  }
  if (input.actionPlanId) {
    const plan = await prisma.actionPlan.findFirst({
      where: { id: input.actionPlanId, companyId: input.companyId, company: { ownerId } },
    });
    if (!plan) throw new Error("Plano não encontrado.");
  }
  if (input.strategyId) {
    const strategy = await prisma.strategy.findFirst({
      where: { id: input.strategyId, companyId: input.companyId, company: { ownerId } },
    });
    if (!strategy) throw new Error("Estratégia não encontrada.");
  }

  const ready = input.kpi && input.hypothesis && input.title;
  const row = await prisma.experiment.create({
    data: {
      companyId: input.companyId,
      createdById: ownerId,
      opportunityId: input.opportunityId ?? null,
      actionPlanId: input.actionPlanId ?? null,
      strategyId: input.strategyId ?? null,
      title: input.title,
      hypothesis: input.hypothesis,
      kpi: input.kpi,
      kpiUnit: input.kpiUnit ?? null,
      direction: input.direction,
      baseline: decimal(input.baseline ?? null),
      target: decimal(input.target ?? null),
      testDescription: input.testDescription ?? null,
      successCriteria: input.successCriteria ?? null,
      notes: input.notes ?? null,
      investment: decimal(input.investment ?? null),
      startedAt: input.startedAt ?? null,
      plannedEndAt: input.plannedEndAt ?? null,
      status: ready ? ExperimentStatus.READY : ExperimentStatus.DRAFT,
    },
    include: experimentInclude,
  });

  await writeAudit({
    actorId: ownerId,
    action: "experiment.create",
    entity: "Experiment",
    entityId: row.id,
    newValue: { title: row.title, status: row.status, opportunityId: row.opportunityId },
    origin: "USER",
  });
  return toDTO(row);
}

export async function listExperiments(
  ownerId: string,
  companyId: string,
  filters: ExperimentFilters = {},
): Promise<ExperimentDTO[]> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return [];
  const rows = await prisma.experiment.findMany({
    where: {
      companyId,
      company: { ownerId },
      ...(filters.status && filters.status !== "ALL"
        ? filters.status === "DRAFT"
          ? { status: { in: [ExperimentStatus.DRAFT, ExperimentStatus.PLANNED] } }
          : filters.status === "CANCELLED"
            ? { status: { in: [ExperimentStatus.CANCELLED, ExperimentStatus.ABANDONED] } }
            : { status: filters.status as ExperimentStatus }
        : {}),
      ...(filters.classification && filters.classification !== "ALL"
        ? { classification: filters.classification as ExperimentClassification }
        : {}),
      ...(filters.kpi && filters.kpi !== "ALL" ? { kpi: filters.kpi } : {}),
      ...(filters.opportunityId && filters.opportunityId !== "ALL" ? { opportunityId: filters.opportunityId } : {}),
      ...(filters.year
        ? {
            OR: [
              { startedAt: { gte: new Date(filters.year, 0, 1), lt: new Date(filters.year + 1, 0, 1) } },
              { createdAt: { gte: new Date(filters.year, 0, 1), lt: new Date(filters.year + 1, 0, 1) } },
            ],
          }
        : {}),
    },
    include: experimentInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getExperiment(
  ownerId: string,
  companyId: string,
  experimentId: string,
): Promise<ExperimentDTO | null> {
  const row = await prisma.experiment.findFirst({
    where: { id: experimentId, companyId, company: { ownerId } },
    include: experimentInclude,
  });
  return row ? toDTO(row) : null;
}

export async function startExperiment(ownerId: string, companyId: string, experimentId: string): Promise<ExperimentDTO> {
  await requireCompany(ownerId, companyId);
  const existing = await prisma.experiment.findFirst({
    where: { id: experimentId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Experimento não encontrado.");
  if (!isDraftStatus(existing.status) && existing.status !== ExperimentStatus.READY) {
    throw new Error("Só é possível iniciar um experimento em rascunho ou pronto.");
  }
  if (!existing.hypothesis || !existing.kpi) {
    throw new Error("Hipótese e KPI são obrigatórios para iniciar.");
  }
  const row = await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: ExperimentStatus.RUNNING,
      startedAt: existing.startedAt ?? new Date(),
    },
    include: experimentInclude,
  });
  await writeAudit({
    actorId: ownerId,
    action: "experiment.start",
    entity: "Experiment",
    entityId: row.id,
    previousValue: { status: existing.status },
    newValue: { status: row.status },
    origin: "USER",
  });
  if (existing.opportunityId) {
    await prisma.opportunity.update({
      where: { id: existing.opportunityId },
      data: { evidenceLevel: EvidenceLevel.TESTING },
    });
  }
  return toDTO(row);
}

export async function cancelExperiment(ownerId: string, companyId: string, experimentId: string): Promise<ExperimentDTO> {
  await requireCompany(ownerId, companyId);
  const existing = await prisma.experiment.findFirst({
    where: { id: experimentId, companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Experimento não encontrado.");
  if (existing.status === ExperimentStatus.COMPLETED) {
    throw new Error("Experimento concluído não pode ser cancelado.");
  }
  const row = await prisma.experiment.update({
    where: { id: experimentId },
    data: { status: ExperimentStatus.CANCELLED, endedAt: new Date() },
    include: experimentInclude,
  });
  await writeAudit({
    actorId: ownerId,
    action: "experiment.cancel",
    entity: "Experiment",
    entityId: row.id,
    previousValue: { status: existing.status },
    newValue: { status: row.status },
    origin: "USER",
  });
  return toDTO(row);
}

export async function addMeasurement(ownerId: string, input: ExperimentMeasurementInput): Promise<ExperimentDTO> {
  await requireCompany(ownerId, input.companyId);
  const existing = await prisma.experiment.findFirst({
    where: { id: input.experimentId, companyId: input.companyId, company: { ownerId } },
  });
  if (!existing) throw new Error("Experimento não encontrado.");
  if (existing.status !== ExperimentStatus.RUNNING) {
    throw new Error("Medições só podem ser registradas em experimento em teste.");
  }
  const created = await prisma.experimentResult.create({
    data: {
      experimentId: existing.id,
      recordedById: ownerId,
      outcome: "MEASUREMENT",
      measuredValue: new Prisma.Decimal(input.measuredValue),
      notes: input.notes ?? null,
      recordedAt: input.recordedAt ?? new Date(),
    },
  });
  await writeAudit({
    actorId: ownerId,
    action: "experiment.measurement.create",
    entity: "ExperimentResult",
    entityId: created.id,
    newValue: { experimentId: existing.id, measuredValue: input.measuredValue },
    origin: "USER",
  });
  const row = await prisma.experiment.findFirstOrThrow({
    where: { id: existing.id, companyId: input.companyId, company: { ownerId } },
    include: experimentInclude,
  });
  return toDTO(row);
}

export async function completeExperiment(ownerId: string, input: ExperimentResultInput): Promise<ExperimentDTO> {
  await requireCompany(ownerId, input.companyId);
  const existing = await prisma.experiment.findFirst({
    where: { id: input.experimentId, companyId: input.companyId, company: { ownerId } },
    include: experimentInclude,
  });
  if (!existing) throw new Error("Experimento não encontrado.");
  if (existing.status !== ExperimentStatus.RUNNING) {
    throw new Error("Só é possível encerrar um experimento em teste.");
  }

  const measurementCount = existing.results.filter((item) => item.outcome === "MEASUREMENT").length;
  const evaluation = evaluateExperimentResult({
    baseline: toNumber(existing.baseline),
    target: toNumber(existing.target),
    finalValue: input.finalValue,
    direction: existing.direction,
    measurementCount,
    status: "COMPLETED",
  });

  await prisma.experimentResult.create({
    data: {
      experimentId: existing.id,
      recordedById: ownerId,
      outcome: "FINAL",
      measuredValue: new Prisma.Decimal(input.finalValue),
      notes: input.notes ?? null,
      recordedAt: new Date(),
    },
  });

  const realizedInvestment = input.realizedInvestment ?? toNumber(existing.realizedInvestment);
  const realizedReturn = input.realizedReturn ?? toNumber(existing.realizedReturn);
  const impact = estimateMeasuredImpact({
    direction: existing.direction,
    baseline: toNumber(existing.baseline),
    finalValue: input.finalValue,
    revenueBase: input.revenueBase ?? null,
    unit: existing.kpiUnit ?? existing.kpi,
  });

  const summary = buildEvidenceSummary({
    title: existing.title,
    hypothesis: existing.hypothesis ?? "",
    kpi: existing.kpi ?? "",
    unit: existing.kpiUnit,
    baseline: toNumber(existing.baseline),
    target: toNumber(existing.target),
    finalValue: input.finalValue,
    classification: evaluation.classification,
    reason: evaluation.reason,
    startedAt: existing.startedAt?.toISOString() ?? null,
    endedAt: new Date().toISOString(),
    plannedInvestment: toNumber(existing.investment),
    realizedInvestment,
    realizedReturn,
    source: `Experimento ${existing.id}`,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const evidence = await tx.evidence.create({
      data: {
        companyId: input.companyId,
        experimentId: existing.id,
        opportunityId: existing.opportunityId,
        kind: KnowledgeKind.EVIDENCE,
        title: `Evidência · ${existing.title}`,
        body: summary + (impact != null ? `\nImpacto financeiro calculável: ${impact}` : "\nImpacto financeiro: não calculável sem base real."),
        classification: evaluation.classification,
        confidence: evaluation.classification === "VALIDATED" ? 80 : evaluation.classification === "PARTIALLY_VALIDATED" ? 55 : 30,
      },
    });

    await tx.strategicMemory.create({
      data: {
        companyId: input.companyId,
        authorId: ownerId,
        title: `Aprendizado · ${existing.title}`,
        lesson: evaluation.reason,
        validated: evaluation.classification === "VALIDATED",
      },
    });

    const experiment = await tx.experiment.update({
      where: { id: existing.id },
      data: {
        status: ExperimentStatus.COMPLETED,
        endedAt: new Date(),
        finalValue: new Prisma.Decimal(input.finalValue),
        realizedInvestment: decimal(realizedInvestment),
        realizedReturn: decimal(realizedReturn),
        classification: evaluation.classification,
        classificationReason: evaluation.reason,
      },
      include: experimentInclude,
    });

    if (existing.opportunityId) {
      const related = await tx.experiment.findMany({
        where: { opportunityId: existing.opportunityId, status: ExperimentStatus.COMPLETED },
        select: { classification: true },
      });
      const nextLevel = nextOpportunityEvidenceLevel(
        related
          .map((item) => item.classification)
          .filter((item): item is ExperimentClassification => item != null),
      );
      await tx.opportunity.update({
        where: { id: existing.opportunityId },
        data: { evidenceLevel: nextLevel },
      });
    }

    return { experiment, evidenceId: evidence.id };
  });

  await writeAudit({
    actorId: ownerId,
    action: "experiment.complete",
    entity: "Experiment",
    entityId: existing.id,
    previousValue: { status: existing.status },
    newValue: { status: "COMPLETED", classification: evaluation.classification },
    origin: "USER",
  });
  await writeAudit({
    actorId: ownerId,
    action: "evidence.create",
    entity: "Evidence",
    entityId: updated.evidenceId,
    newValue: { experimentId: existing.id, classification: evaluation.classification },
    origin: "USER",
  });

  const row = await prisma.experiment.findFirstOrThrow({
    where: { id: existing.id, companyId: input.companyId, company: { ownerId } },
    include: experimentInclude,
  });
  return toDTO(row);
}

export async function getExperimentSummary(ownerId: string, companyId: string): Promise<ExperimentSummary> {
  const items = await listExperiments(ownerId, companyId);
  const realizedInvestment = items.reduce((sum, item) => sum + (item.realizedInvestment ?? 0), 0);
  const realizedReturn = items.reduce((sum, item) => sum + (item.realizedReturn ?? 0), 0);
  return {
    active: items.filter((item) => item.status === "RUNNING" || item.status === "READY").length,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    validated: items.filter((item) => item.classification === "VALIDATED").length,
    partial: items.filter((item) => item.classification === "PARTIALLY_VALIDATED").length,
    inconclusive: items.filter((item) => item.classification === "INCONCLUSIVE").length,
    refuted: items.filter((item) => item.classification === "REFUTED").length,
    plannedInvestment: items.reduce((sum, item) => sum + (item.plannedInvestment ?? 0), 0),
    realizedInvestment,
    realizedReturn,
    roi: calculateExperimentROI(realizedReturn || null, realizedInvestment || null),
  };
}

export { canProduceEvidence, isCancelledStatus, isDraftStatus };
