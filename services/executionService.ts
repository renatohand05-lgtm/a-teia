import "server-only";

import {
  AuditSource,
  DecisionStatus,
  EvidenceLevel,
  OpportunityStatus,
  Prisma,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, countOverdueTasks, executionProgress, isClosedTaskStatus } from "@/lib/execution";
import { writeAudit } from "@/services/auditService";
import { toNumber } from "@/lib/format";
import type { ExecutionFinanceInput, ExecutionPlanInput } from "@/lib/validations";

const planInclude = {
  decision: { include: { opportunity: true } },
  tasks: { orderBy: { dueAt: "asc" as const } },
} satisfies Prisma.ActionPlanInclude;

type ExecutionPlanRow = Prisma.ActionPlanGetPayload<{ include: typeof planInclude }>;

export type ExecutionTaskDTO = {
  id: string;
  title: string;
  details: string | null;
  status: TaskStatus;
  dueAt: string | null;
  overdue: boolean;
};

export type ExecutionPlanDTO = {
  id: string;
  companyId: string | null;
  ownerId: string | null;
  decisionId: string | null;
  title: string;
  summary: string | null;
  horizonDays: number | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  opportunityEvidenceLevel: EvidenceLevel | null;
  decisionStatus: DecisionStatus | null;
  progress: number;
  overdueCount: number;
  estimatedInvestment: number | null;
  expectedMonthlyReturn: number | null;
  realizedCost: number | null;
  realizedReturn: number | null;
  tasks: ExecutionTaskDTO[];
  createdAt: string;
  updatedAt: string;
};

async function requireCompany(ownerId: string, companyId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) throw new Error("Empresa não encontrada.");
  return company;
}

export async function createExecutionPlanFromOpportunity(
  ownerId: string,
  companyId: string,
  input: ExecutionPlanInput,
): Promise<ExecutionPlanDTO> {
  await requireCompany(ownerId, companyId);

  const opportunity = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, companyId, company: { ownerId } },
  });
  if (!opportunity) throw new Error("Oportunidade não encontrada.");

  const existing = await prisma.actionPlan.findFirst({
    where: { companyId, company: { ownerId }, decision: { opportunityId: opportunity.id } },
    include: planInclude,
  });
  if (existing) return toExecutionPlanDTO(existing);

  const now = new Date();
  const plan = await prisma.$transaction(async (tx) => {
    const decision = await tx.decision.create({
      data: {
        companyId,
        opportunityId: opportunity.id,
        createdById: ownerId,
        title: `Executar: ${opportunity.title}`,
        rationale:
          opportunity.hypothesis ||
          opportunity.problemStatement ||
          "Hipótese priorizada pelo usuário para execução. Ainda não é evidência.",
        status: DecisionStatus.APPROVED,
        origin: AuditSource.USER,
        requiresHumanApproval: true,
        approvedAt: now,
      },
    });

    const createdPlan = await tx.actionPlan.create({
      data: {
        companyId,
        decisionId: decision.id,
        ownerId,
        title: input.title.trim(),
        summary: input.summary?.trim() || null,
        horizonDays: 90,
      },
    });

    await tx.task.createMany({
      data: [
        {
          actionPlanId: createdPlan.id,
          assigneeId: ownerId,
          title: "0–30 dias",
          details: input.goal30.trim(),
          dueAt: addDays(now, 30),
          status: TaskStatus.TODO,
        },
        {
          actionPlanId: createdPlan.id,
          assigneeId: ownerId,
          title: "31–60 dias",
          details: input.goal60.trim(),
          dueAt: addDays(now, 60),
          status: TaskStatus.TODO,
        },
        {
          actionPlanId: createdPlan.id,
          assigneeId: ownerId,
          title: "61–90 dias",
          details: input.goal90.trim(),
          dueAt: addDays(now, 90),
          status: TaskStatus.TODO,
        },
      ],
    });

    await tx.opportunity.update({
      where: { id: opportunity.id },
      data: {
        queuedForPlan: false,
        status: OpportunityStatus.IN_PROGRESS,
        evidenceLevel: opportunity.evidenceLevel,
      },
    });

    return tx.actionPlan.findUniqueOrThrow({
      where: { id: createdPlan.id },
      include: planInclude,
    });
  });

  await writeAudit({
    actorId: ownerId,
    action: "execution.plan.create",
    entity: "ActionPlan",
    entityId: plan.id,
    newValue: { title: plan.title, opportunityId: opportunity.id, horizonDays: 90 },
    origin: "USER",
  });

  return toExecutionPlanDTO(plan);
}

export async function listExecutionPlans(ownerId: string, companyId: string): Promise<ExecutionPlanDTO[]> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return [];

  const plans = await prisma.actionPlan.findMany({
    where: { companyId, company: { ownerId } },
    include: planInclude,
    orderBy: { updatedAt: "desc" },
  });
  return plans.map(toExecutionPlanDTO);
}

export async function getExecutionPlan(
  ownerId: string,
  companyId: string,
  planId: string,
): Promise<ExecutionPlanDTO | null> {
  const plan = await prisma.actionPlan.findFirst({
    where: { id: planId, companyId, company: { ownerId } },
    include: planInclude,
  });
  return plan ? toExecutionPlanDTO(plan) : null;
}

export async function updateExecutionTaskStatus(
  ownerId: string,
  companyId: string,
  taskId: string,
  status: TaskStatus,
): Promise<ExecutionPlanDTO> {
  await requireCompany(ownerId, companyId);
  const task = await prisma.task.findFirst({
    where: { id: taskId, actionPlan: { companyId, company: { ownerId } } },
  });
  if (!task) throw new Error("Tarefa não encontrada.");

  await prisma.task.update({ where: { id: taskId }, data: { status } });

  const plan = await prisma.actionPlan.findFirst({
    where: { id: task.actionPlanId ?? undefined, companyId, company: { ownerId } },
    include: planInclude,
  });
  if (!plan) throw new Error("Plano não encontrado.");

  const active = plan.tasks.filter((item) => item.status !== TaskStatus.CANCELLED);
  if (
    plan.decisionId &&
    active.length > 0 &&
    active.every((item) => item.status === TaskStatus.DONE)
  ) {
    await prisma.decision.update({
      where: { id: plan.decisionId },
      data: { status: DecisionStatus.EXECUTED },
    });
    if (plan.decision?.opportunityId) {
      await prisma.opportunity.update({
        where: { id: plan.decision.opportunityId },
        data: {
          status: OpportunityStatus.IN_PROGRESS,
          evidenceLevel: plan.decision.opportunity?.evidenceLevel ?? EvidenceLevel.HYPOTHESIS,
        },
      });
    }
  }

  await writeAudit({
    actorId: ownerId,
    action: "execution.task.status",
    entity: "Task",
    entityId: taskId,
    previousValue: { status: task.status },
    newValue: { status },
    origin: "USER",
  });

  const refreshed = await prisma.actionPlan.findFirstOrThrow({
    where: { id: plan.id, companyId, company: { ownerId } },
    include: planInclude,
  });
  return toExecutionPlanDTO(refreshed);
}

export async function getExecutionSummary(ownerId: string, companyId: string) {
  const plans = await listExecutionPlans(ownerId, companyId);
  const active = plans.filter((plan) => plan.progress < 100);
  const allTasks = plans.flatMap((plan) => plan.tasks);
  return {
    totalPlans: plans.length,
    activePlans: active.length,
    completedPlans: plans.filter((plan) => plan.progress === 100).length,
    overdueTasks: countOverdueTasks(allTasks),
    averageProgress: plans.length
      ? Math.round(plans.reduce((sum, plan) => sum + plan.progress, 0) / plans.length)
      : 0,
  };
}

function toExecutionPlanDTO(row: ExecutionPlanRow): ExecutionPlanDTO {
  const now = new Date();
  const tasks: ExecutionTaskDTO[] = row.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    details: task.details,
    status: task.status,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    overdue: !isClosedTaskStatus(task.status) && Boolean(task.dueAt && task.dueAt.getTime() < now.getTime()),
  }));
  return {
    id: row.id,
    companyId: row.companyId,
    ownerId: row.ownerId,
    decisionId: row.decisionId,
    title: row.title,
    summary: row.summary,
    horizonDays: row.horizonDays,
    opportunityId: row.decision?.opportunityId ?? null,
    opportunityTitle: row.decision?.opportunity?.title ?? null,
    opportunityEvidenceLevel: row.decision?.opportunity?.evidenceLevel ?? null,
    decisionStatus: row.decision?.status ?? null,
    progress: executionProgress(tasks.map((task) => task.status)),
    overdueCount: countOverdueTasks(tasks, now),
    estimatedInvestment: toNumber(row.decision?.opportunity?.investment),
    expectedMonthlyReturn: toNumber(row.decision?.opportunity?.expectedReturn),
    realizedCost: toNumber(row.realizedCost),
    realizedReturn: toNumber(row.realizedReturn),
    tasks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateExecutionRealizedFinance(
  ownerId: string,
  input: ExecutionFinanceInput,
): Promise<ExecutionPlanDTO> {
  await requireCompany(ownerId, input.companyId);
  const plan = await prisma.actionPlan.findFirst({
    where: { id: input.planId, companyId: input.companyId, company: { ownerId } },
  });
  if (!plan) throw new Error("Plano não encontrado.");

  await prisma.actionPlan.update({
    where: { id: plan.id },
    data: {
      realizedCost: input.realizedCost == null ? null : input.realizedCost,
      realizedReturn: input.realizedReturn == null ? null : input.realizedReturn,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "execution.finance.realized",
    entity: "ActionPlan",
    entityId: plan.id,
    previousValue: {
      realizedCost: toNumber(plan.realizedCost),
      realizedReturn: toNumber(plan.realizedReturn),
    },
    newValue: {
      realizedCost: input.realizedCost ?? null,
      realizedReturn: input.realizedReturn ?? null,
    },
    origin: "USER",
  });

  const refreshed = await prisma.actionPlan.findFirstOrThrow({
    where: { id: plan.id, companyId: input.companyId, company: { ownerId } },
    include: planInclude,
  });
  return toExecutionPlanDTO(refreshed);
}
