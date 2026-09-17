import "server-only";

import { DecisionStatus, OpportunityStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, executionProgress } from "@/lib/execution";
import { writeAudit } from "@/services/auditService";

export type CreateExecutionPlanInput = {
  title: string;
  summary?: string | null;
  goal30: string;
  goal60: string;
  goal90: string;
};

export type ExecutionTaskDTO = {
  id: string;
  title: string;
  details: string | null;
  status: TaskStatus;
  dueAt: string | null;
};

export type ExecutionPlanDTO = {
  id: string;
  companyId: string | null;
  decisionId: string | null;
  title: string;
  summary: string | null;
  horizonDays: number | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  decisionStatus: DecisionStatus | null;
  progress: number;
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
  opportunityId: string,
  input: CreateExecutionPlanInput,
): Promise<ExecutionPlanDTO> {
  await requireCompany(ownerId, companyId);

  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, companyId, company: { ownerId } },
  });
  if (!opportunity) throw new Error("Oportunidade não encontrada.");

  const existing = await prisma.actionPlan.findFirst({
    where: { companyId, decision: { opportunityId } },
    include: { decision: true, tasks: { orderBy: { dueAt: "asc" } } },
  });
  if (existing) return toExecutionPlanDTO(existing);

  const now = new Date();
  const plan = await prisma.$transaction(async (tx) => {
    const decision = await tx.decision.create({
      data: {
        companyId,
        opportunityId,
        createdById: ownerId,
        title: `Executar: ${opportunity.title}`,
        rationale:
          opportunity.hypothesis ||
          opportunity.problemStatement ||
          "Oportunidade priorizada para execução.",
        status: DecisionStatus.APPROVED,
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
      where: { id: opportunityId },
      data: { queuedForPlan: false, status: OpportunityStatus.IN_PROGRESS },
    });

    return tx.actionPlan.findUniqueOrThrow({
      where: { id: createdPlan.id },
      include: { decision: { include: { opportunity: true } }, tasks: { orderBy: { dueAt: "asc" } } },
    });
  });

  await writeAudit({
    actorId: ownerId,
    action: "execution.plan.create",
    entity: "ActionPlan",
    entityId: plan.id,
    newValue: { title: plan.title, opportunityId, horizonDays: 90 },
    origin: "USER",
  });

  return toExecutionPlanDTO(plan);
}

export async function listExecutionPlans(ownerId: string, companyId: string): Promise<ExecutionPlanDTO[]> {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } });
  if (!company) return [];

  const plans = await prisma.actionPlan.findMany({
    where: { companyId },
    include: { decision: { include: { opportunity: true } }, tasks: { orderBy: { dueAt: "asc" } } },
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
    include: { decision: { include: { opportunity: true } }, tasks: { orderBy: { dueAt: "asc" } } },
  });
  return plan ? toExecutionPlanDTO(plan) : null;
}

export async function updateExecutionTaskStatus(
  ownerId: string,
  companyId: string,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await requireCompany(ownerId, companyId);
  const task = await prisma.task.findFirst({
    where: { id: taskId, actionPlan: { companyId, company: { ownerId } } },
  });
  if (!task) throw new Error("Tarefa não encontrada.");

  await prisma.task.update({ where: { id: taskId }, data: { status } });

  const plan = await prisma.actionPlan.findFirst({
    where: { id: task.actionPlanId ?? "" },
    include: { tasks: true, decision: true },
  });
  if (plan?.decisionId && plan.tasks.length && plan.tasks.every((item) => item.status === TaskStatus.DONE)) {
    await prisma.decision.update({
      where: { id: plan.decisionId },
      data: { status: DecisionStatus.EXECUTED },
    });
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
}

export async function getExecutionSummary(ownerId: string, companyId: string) {
  const plans = await listExecutionPlans(ownerId, companyId);
  const active = plans.filter((plan) => plan.progress < 100);
  const allTasks = plans.flatMap((plan) => plan.tasks);
  const overdue = allTasks.filter((task) => {
    if (!task.dueAt || task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED) return false;
    return new Date(task.dueAt).getTime() < Date.now();
  }).length;
  return {
    totalPlans: plans.length,
    activePlans: active.length,
    completedPlans: plans.filter((plan) => plan.progress === 100).length,
    overdueTasks: overdue,
    averageProgress: plans.length
      ? Math.round(plans.reduce((sum, plan) => sum + plan.progress, 0) / plans.length)
      : 0,
  };
}

function toExecutionPlanDTO(row: any): ExecutionPlanDTO {
  const tasks: ExecutionTaskDTO[] = (row.tasks ?? []).map((task: any) => ({
    id: task.id,
    title: task.title,
    details: task.details,
    status: task.status,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
  }));
  return {
    id: row.id,
    companyId: row.companyId,
    decisionId: row.decisionId,
    title: row.title,
    summary: row.summary,
    horizonDays: row.horizonDays,
    opportunityId: row.decision?.opportunityId ?? null,
    opportunityTitle: row.decision?.opportunity?.title ?? null,
    decisionStatus: row.decision?.status ?? null,
    progress: executionProgress(tasks.map((task) => task.status)),
    tasks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
