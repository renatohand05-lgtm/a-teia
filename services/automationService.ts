import "server-only";

import {
  AlertStatus,
  AllocationStatus,
  AuditSource,
  AutomationFrequency,
  AutomationKind,
  AutomationRunStatus,
  DecisionStatus,
  ExperimentStatus,
  NotificationChannel,
  Prisma,
} from "@prisma/client";
import {
  AUTOMATION_LIMITS,
  DEFAULT_AUTOMATION_TIMEZONE,
  canManageAutomations,
  shouldRetry,
} from "@/lib/automation-config";
import {
  AUTOMATION_TEMPLATES,
  alertIdempotencyKey,
  composeDailyBriefing,
  composeWeeklySummary,
  evaluatePortfolio,
  executionIdempotencyKey,
  parseAutomationPrompt,
  shouldSuppress,
  type AutomationCondition,
  type CompanyFacts,
  type EvaluationHit,
} from "@/lib/automation-rules-engine";
import { prisma } from "@/lib/prisma";
import { nextRunAt, slotKey } from "@/lib/timezone";
import { writeAudit } from "@/services/auditService";
import { loadPortfolioBundle } from "@/services/portfolioService";

export type AutomationDTO = {
  id: string;
  title: string;
  description: string | null;
  kind: AutomationKind;
  templateKey: string;
  enabled: boolean;
  frequency: AutomationFrequency;
  companyId: string | null;
  companyName: string | null;
  priority: string;
  cooldownHours: number;
  timezone: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  condition: AutomationCondition;
};

export type AutomationWorkspace = {
  automations: AutomationDTO[];
  alerts: AlertDTO[];
  notifications: NotificationDTO[];
  executions: ExecutionDTO[];
  templates: typeof AUTOMATION_TEMPLATES;
  companies: Array<{ id: string; name: string }>;
  unread: number;
  nextRun: string | null;
  failures: number;
  activeCount: number;
};

export type AlertDTO = {
  id: string;
  title: string;
  message: string;
  priority: string;
  status: AlertStatus;
  companyId: string | null;
  companyName: string | null;
  ruleKey: string;
  href: string | null;
  detectedAt: string;
  facts: Record<string, unknown>;
};

export type NotificationDTO = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ExecutionDTO = {
  id: string;
  automationId: string | null;
  status: AutomationRunStatus;
  summary: string | null;
  failureKind: string | null;
  alertsCreated: number;
  itemsProcessed: number;
  startedAt: string;
};

export type AutomationCockpitSummary = {
  alertsToday: number;
  activeAutomations: number;
  failedRuns: number;
  nextRunAt: string | null;
  openAlerts: number;
  criticalAlerts: number;
  attentionAlerts: number;
};

function ageDays(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

async function assertOwner(ownerId: string) {
  const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, role: true } });
  if (!user) throw new Error("Usuário não encontrado.");
  return user;
}

async function ownedAutomation(ownerId: string, automationId: string) {
  const row = await prisma.automation.findFirst({ where: { id: automationId, ownerId } });
  if (!row) throw new Error("Automação não encontrada.");
  return row;
}

export async function loadCompanyFacts(ownerId: string): Promise<CompanyFacts[]> {
  const [portfolio, decisions, experiments, allocations] = await Promise.all([
    loadPortfolioBundle(ownerId),
    prisma.decision.findMany({
      where: {
        OR: [{ createdById: ownerId }, { company: { ownerId } }],
        status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
      },
      select: { companyId: true, createdAt: true },
    }),
    prisma.experiment.findMany({
      where: { company: { ownerId } },
      select: {
        companyId: true,
        status: true,
        updatedAt: true,
        plannedEndAt: true,
        _count: { select: { results: true } },
      },
    }),
    prisma.allocationProposal.findMany({
      where: { ownerId, status: AllocationStatus.SENT_TO_DECISION },
      select: { updatedAt: true },
      take: 1,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const allocationPendingDays = allocations[0] ? ageDays(allocations[0].updatedAt.toISOString(), now) : null;

  return portfolio.inputs.map((company) => {
    const overdue = company.plans.reduce((sum, plan) => sum + plan.overdueTaskCount, 0);
    const stalePlans = company.plans.filter((plan) => {
      const age = ageDays(plan.updatedAt, now) ?? 0;
      return age >= 14 && plan.pendingTaskCount > 0;
    }).length;
    const staleExperiments = experiments.filter((item) => {
      if (item.companyId !== company.id) return false;
      const open = item.status === ExperimentStatus.READY || item.status === ExperimentStatus.RUNNING || item.status === ExperimentStatus.COMPLETED;
      return open && item._count.results === 0 && (ageDays(item.updatedAt.toISOString(), now) ?? 0) >= 7;
    }).length;
    const companyDecisions = decisions.filter((item) => item.companyId === company.id);
    const oldest = companyDecisions[0]?.createdAt;
    return {
      companyId: company.id,
      companyName: company.name,
      cogsPercent: company.finance.cogsPercent,
      cogsTarget: company.finance.cogsTarget,
      ebitda: company.finance.ebitda,
      ebitdaTarget: company.finance.ebitdaTarget,
      cash: company.finance.cash,
      revenue: company.finance.revenue,
      financeUpdatedAt: company.updatedAt,
      overdueTaskCount: overdue,
      stalePlanCount: stalePlans,
      experimentStaleCount: staleExperiments,
      pendingDecisionCount: companyDecisions.length,
      pendingDecisionDays: oldest ? ageDays(oldest.toISOString(), now) : null,
      highScoreOpportunityWithoutPlan: company.opportunities.filter((item) => (item.score ?? 0) >= 80 && !item.hasPlan).length,
      allocationPendingDays,
      financeAgeDays: company.finance.periodLabel ? ageDays(company.updatedAt, now) : null,
    };
  });
}

export async function createAutomationFromTemplate(input: {
  ownerId: string;
  templateKey: string;
  companyId?: string;
  enabled?: boolean;
  condition?: AutomationCondition;
  role?: string;
}) {
  const user = await assertOwner(input.ownerId);
  if (!canManageAutomations(input.role ?? user.role)) throw new Error("Sem permissão para criar automação.");
  const count = await prisma.automation.count({ where: { ownerId: input.ownerId } });
  if (count >= AUTOMATION_LIMITS.maxPerOwner) throw new Error("Limite de automações atingido.");
  const template = AUTOMATION_TEMPLATES.find((item) => item.key === input.templateKey);
  if (!template) throw new Error("Modelo de automação inválido.");
  if (input.companyId) {
    const company = await prisma.company.findFirst({ where: { id: input.companyId, ownerId: input.ownerId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }
  const automation = await prisma.automation.create({
    data: {
      ownerId: input.ownerId,
      companyId: input.companyId ?? null,
      kind: template.kind,
      templateKey: template.key,
      title: template.title,
      description: template.description,
      enabled: Boolean(input.enabled),
      frequency: template.frequency,
      condition: (input.condition ?? template.condition) as Prisma.InputJsonValue,
      cooldownHours: template.cooldownHours,
      priority: template.priority,
      timezone: DEFAULT_AUTOMATION_TIMEZONE,
      nextRunAt: input.enabled ? new Date() : null,
    },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: "automation.created",
    entity: "Automation",
    entityId: automation.id,
    newValue: { templateKey: template.key, enabled: automation.enabled },
    origin: AuditSource.USER,
  });
  return automation;
}

export async function setAutomationEnabled(input: { ownerId: string; automationId: string; enabled: boolean; role?: string }) {
  const user = await assertOwner(input.ownerId);
  if (!canManageAutomations(input.role ?? user.role)) throw new Error("Sem permissão para alterar automação.");
  const existing = await ownedAutomation(input.ownerId, input.automationId);
  const updated = await prisma.automation.update({
    where: { id: existing.id },
    data: {
      enabled: input.enabled,
      nextRunAt: input.enabled ? new Date() : null,
    },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: input.enabled ? "automation.enabled" : "automation.disabled",
    entity: "Automation",
    entityId: updated.id,
    previousValue: { enabled: existing.enabled },
    newValue: { enabled: updated.enabled },
    origin: AuditSource.USER,
  });
  return updated;
}

export async function runAutomation(input: {
  ownerId: string;
  automationId: string;
  mode: "cron" | "manual";
  now?: Date;
}) {
  const automation = await ownedAutomation(input.ownerId, input.automationId);
  if (!automation.enabled && input.mode === "cron") {
    return { skipped: true, alertsCreated: 0 };
  }
  const template = AUTOMATION_TEMPLATES.find((item) => item.key === automation.templateKey);
  if (!template) throw Object.assign(new Error("Regra inválida."), { failureKind: "VALIDATION" });
  const now = input.now ?? new Date();
  const slot = slotKey(now, automation.frequency, automation.timezone);
  const key = executionIdempotencyKey({
    mode: input.mode,
    ownerId: input.ownerId,
    automationId: automation.id,
    slot,
  });

  try {
    await prisma.automationExecution.create({
      data: {
        ownerId: input.ownerId,
        automationId: automation.id,
        idempotencyKey: key,
        status: AutomationRunStatus.SUCCESS,
        summary: "Iniciado",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { skipped: true, alertsCreated: 0, idempotent: true };
    }
    throw error;
  }

  try {
    const facts = await loadCompanyFacts(input.ownerId);
    const scopedFacts = automation.companyId ? facts.filter((item) => item.companyId === automation.companyId) : facts;
    const validCompanyIds = new Set(scopedFacts.map((item) => item.companyId));
    const condition = automation.condition as AutomationCondition;
    const hits = evaluatePortfolio(template, scopedFacts, {
      cashLimit: typeof condition.threshold === "number" ? condition.threshold : null,
      cogsThreshold: typeof condition.threshold === "number" ? condition.threshold : null,
    }).slice(0, AUTOMATION_LIMITS.maxAlertsPerJob);

    let created = 0;
    const open = await prisma.automationAlert.findMany({
      where: {
        ownerId: input.ownerId,
        automationId: automation.id,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
      },
      select: { id: true, ruleKey: true, companyId: true, detectedAt: true, status: true },
    });

    for (const hit of hits) {
      const existing = open.find((item) => item.ruleKey === hit.ruleKey && item.companyId === hit.companyId);
      if (
        shouldSuppress({
          openOrAck: Boolean(existing),
          lastDetectedAt: existing?.detectedAt.toISOString() ?? null,
          cooldownHours: automation.cooldownHours,
          now,
        })
      ) {
        continue;
      }
      const idempotency = alertIdempotencyKey({
        ownerId: input.ownerId,
        ruleKey: hit.ruleKey,
        companyId: hit.companyId,
        slot,
      });
      try {
        const alert = await prisma.automationAlert.create({
          data: {
            ownerId: input.ownerId,
            automationId: automation.id,
            companyId: hit.companyId && validCompanyIds.has(hit.companyId) ? hit.companyId : null,
            kind: hit.kind,
            title: hit.title,
            message: hit.message,
            priority: hit.priority,
            ruleKey: hit.ruleKey,
            idempotencyKey: idempotency,
            facts: hit.facts as Prisma.InputJsonValue,
            href: hit.href,
          },
        });
        await prisma.appNotification.create({
          data: {
            ownerId: input.ownerId,
            alertId: alert.id,
            channel: NotificationChannel.IN_APP,
            title: hit.title,
            body: hit.message,
            href: hit.href,
          },
        });
        created += 1;
        await writeAudit({
          actorId: input.ownerId,
          action: "alert.created",
          entity: "AutomationAlert",
          entityId: alert.id,
          newValue: { ruleKey: hit.ruleKey },
          origin: AuditSource.SYSTEM,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }

    await autoResolveAlerts(input.ownerId, automation.id, hits);
    const briefing = await maybeBriefing(input.ownerId, template.key, scopedFacts);

    await prisma.automationExecution.update({
      where: { idempotencyKey: key },
      data: {
        finishedAt: new Date(),
        status: AutomationRunStatus.SUCCESS,
        summary: briefing ?? `${created} alerta(s) · ${hits.length} condição(ões)`,
        itemsProcessed: scopedFacts.length,
        alertsCreated: created,
      },
    });
    await prisma.automation.update({
      where: { id: automation.id },
      data: { lastRunAt: now, nextRunAt: nextRunAt(now, automation.frequency, automation.timezone) },
    });
    await writeAudit({
      actorId: input.ownerId,
      action: "automation.executed",
      entity: "Automation",
      entityId: automation.id,
      newValue: { created, mode: input.mode },
      origin: AuditSource.SYSTEM,
    });
    return { skipped: false, alertsCreated: created };
  } catch (error) {
    const failureKind = classifyFailure(error);
    await prisma.automationExecution.update({
      where: { idempotencyKey: key },
      data: {
        finishedAt: new Date(),
        status: AutomationRunStatus.FAILED,
        failureKind,
        summary: "Falha na execução. Detalhes técnicos não são exibidos.",
      },
    });
    await writeAudit({
      actorId: input.ownerId,
      action: "automation.failed",
      entity: "Automation",
      entityId: automation.id,
      newValue: { failureKind },
      origin: AuditSource.SYSTEM,
    });
    if (input.mode === "cron" && shouldRetry(failureKind)) {
      return { skipped: false, alertsCreated: 0, retry: true, failureKind };
    }
    return { skipped: false, alertsCreated: 0, failureKind };
  }
}

async function autoResolveAlerts(ownerId: string, automationId: string, hits: EvaluationHit[]) {
  const open = await prisma.automationAlert.findMany({
    where: { ownerId, automationId, status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] } },
  });
  const active = new Set(hits.map((item) => `${item.ruleKey}:${item.companyId ?? "portfolio"}`));
  for (const alert of open) {
    const key = `${alert.ruleKey}:${alert.companyId ?? "portfolio"}`;
    if (active.has(key)) continue;
    await prisma.automationAlert.update({
      where: { id: alert.id },
      data: { status: AlertStatus.RESOLVED, resolvedAt: new Date(), resolvedBy: "SYSTEM_RULE" },
    });
    await writeAudit({
      actorId: ownerId,
      action: "alert.resolved",
      entity: "AutomationAlert",
      entityId: alert.id,
      newValue: { resolvedBy: "SYSTEM_RULE" },
      origin: AuditSource.SYSTEM,
    });
  }
}

async function maybeBriefing(ownerId: string, templateKey: string, facts: CompanyFacts[]) {
  if (templateKey !== "daily_briefing" && templateKey !== "weekly_summary") return null;
  const [alerts, portfolio] = await Promise.all([
    prisma.automationAlert.findMany({
      where: { ownerId, status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] } },
      take: 5,
      orderBy: { detectedAt: "desc" },
    }),
    loadPortfolioBundle(ownerId),
  ]);
  const financeOff = facts
    .filter((item) => item.cogsPercent != null && item.cogsTarget != null && item.cogsPercent > item.cogsTarget)
    .map((item) => `${item.companyName} CMV`);
  if (templateKey === "weekly_summary") {
    return composeWeeklySummary({
      changed: portfolio.changes.map((item) => item.title),
      improved: portfolio.trends.filter((item) => item.direction === "up").map((item) => `${item.companyName} ${item.metric}`),
      worsened: portfolio.trends.filter((item) => item.direction === "down").map((item) => `${item.companyName} ${item.metric}`),
      pendingDecisions: facts.reduce((sum, item) => sum + item.pendingDecisionCount, 0),
      priorities: portfolio.priorities.map((item) => item.situation),
      experiments: facts.filter((item) => item.experimentStaleCount > 0).map((item) => item.companyName),
      execution: `${portfolio.execution.overdueTasks} tarefas vencidas`,
      finance: financeOff[0] ?? "sem desvio informado",
    });
  }
  return composeDailyBriefing({
    priorities: portfolio.priorities.map((item) => item.situation),
    alerts: alerts.map((item) => item.title),
    overdueTasks: facts.reduce((sum, item) => sum + item.overdueTaskCount, 0),
    pendingDecisions: facts.reduce((sum, item) => sum + item.pendingDecisionCount, 0),
    staleExperiments: facts.reduce((sum, item) => sum + item.experimentStaleCount, 0),
    financeOff,
    changes: portfolio.changes.map((item) => item.title),
  });
}

function classifyFailure(error: unknown): "CONFIGURATION" | "VALIDATION" | "PROVIDER" | "DATABASE" | "RATE_LIMIT" | "TIMEOUT" | "UNKNOWN" {
  if (error && typeof error === "object" && "failureKind" in error) {
    return (error as { failureKind: "VALIDATION" }).failureKind;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) return "DATABASE";
  return "UNKNOWN";
}

export async function runDueAutomations(now = new Date()) {
  const due = await prisma.automation.findMany({
    where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    take: AUTOMATION_LIMITS.maxExecutionsPerRun,
    orderBy: { nextRunAt: "asc" },
  });
  const results = [];
  for (const item of due) {
    results.push(await runAutomation({ ownerId: item.ownerId, automationId: item.id, mode: "cron", now }));
  }
  return { processed: due.length, results };
}

export async function acknowledgeAlert(input: { ownerId: string; alertId: string }) {
  const alert = await prisma.automationAlert.findFirst({ where: { id: input.alertId, ownerId: input.ownerId } });
  if (!alert) throw new Error("Alerta não encontrado.");
  const updated = await prisma.automationAlert.update({
    where: { id: alert.id },
    data: { status: AlertStatus.ACKNOWLEDGED, acknowledgedAt: new Date() },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: "alert.acknowledged",
    entity: "AutomationAlert",
    entityId: alert.id,
    origin: AuditSource.USER,
  });
  return updated;
}

export async function resolveAlert(input: { ownerId: string; alertId: string }) {
  const alert = await prisma.automationAlert.findFirst({ where: { id: input.alertId, ownerId: input.ownerId } });
  if (!alert) throw new Error("Alerta não encontrado.");
  const updated = await prisma.automationAlert.update({
    where: { id: alert.id },
    data: { status: AlertStatus.RESOLVED, resolvedAt: new Date(), resolvedBy: "USER" },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: "alert.resolved",
    entity: "AutomationAlert",
    entityId: alert.id,
    newValue: { resolvedBy: "USER" },
    origin: AuditSource.USER,
  });
  return updated;
}

export async function dismissAlert(input: { ownerId: string; alertId: string }) {
  const alert = await prisma.automationAlert.findFirst({ where: { id: input.alertId, ownerId: input.ownerId } });
  if (!alert) throw new Error("Alerta não encontrado.");
  const updated = await prisma.automationAlert.update({
    where: { id: alert.id },
    data: { status: AlertStatus.DISMISSED, dismissedAt: new Date() },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: "alert.dismissed",
    entity: "AutomationAlert",
    entityId: alert.id,
    origin: AuditSource.USER,
  });
  return updated;
}

export async function markNotificationRead(input: { ownerId: string; notificationId: string }) {
  const row = await prisma.appNotification.findFirst({ where: { id: input.notificationId, ownerId: input.ownerId } });
  if (!row) throw new Error("Notificação não encontrada.");
  const updated = await prisma.appNotification.update({
    where: { id: row.id },
    data: { readAt: new Date() },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: "notification.read",
    entity: "AppNotification",
    entityId: row.id,
    origin: AuditSource.USER,
  });
  return updated;
}

export async function countUnreadNotifications(ownerId: string) {
  return prisma.appNotification.count({ where: { ownerId, readAt: null } });
}

export async function getAutomationWorkspace(ownerId: string, companyId?: string): Promise<AutomationWorkspace> {
  const [automations, alerts, notifications, executions, companies, unread] = await Promise.all([
    prisma.automation.findMany({
      where: { ownerId, ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}) },
      include: { company: { select: { name: true, ownerId: true } } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.automationAlert.findMany({
      where: { ownerId, ...(companyId ? { companyId } : {}) },
      include: { company: { select: { name: true } } },
      orderBy: { detectedAt: "desc" },
      take: 80,
    }),
    prisma.appNotification.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.automationExecution.findMany({
      where: { ownerId },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.company.findMany({ where: { ownerId, status: "ACTIVE" }, select: { id: true, name: true } }),
    countUnreadNotifications(ownerId),
  ]);
  return {
    automations: automations
      .filter((item) => !item.company || item.company.ownerId === ownerId)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        kind: item.kind,
        templateKey: item.templateKey,
        enabled: item.enabled,
        frequency: item.frequency,
        companyId: item.companyId,
        companyName: item.company?.name ?? null,
        priority: item.priority,
        cooldownHours: item.cooldownHours,
        timezone: item.timezone,
        nextRunAt: item.nextRunAt?.toISOString() ?? null,
        lastRunAt: item.lastRunAt?.toISOString() ?? null,
        condition: item.condition as AutomationCondition,
      })),
    alerts: alerts.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      priority: item.priority,
      status: item.status,
      companyId: item.companyId,
      companyName: item.company?.name ?? null,
      ruleKey: item.ruleKey,
      href: item.href,
      detectedAt: item.detectedAt.toISOString(),
      facts: (item.facts ?? {}) as Record<string, unknown>,
    })),
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      href: item.href,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    executions: executions.map((item) => ({
      id: item.id,
      automationId: item.automationId,
      status: item.status,
      summary: item.summary,
      failureKind: item.failureKind,
      alertsCreated: item.alertsCreated,
      itemsProcessed: item.itemsProcessed,
      startedAt: item.startedAt.toISOString(),
    })),
    templates: AUTOMATION_TEMPLATES,
    companies,
    unread,
    nextRun: automations.find((item) => item.enabled && item.nextRunAt)?.nextRunAt?.toISOString() ?? null,
    failures: executions.filter((item) => item.status === AutomationRunStatus.FAILED).length,
    activeCount: automations.filter((item) => item.enabled).length,
  };
}

export async function countOpenOwnerAlerts(ownerId: string): Promise<number> {
  return prisma.automationAlert.count({
    where: { ownerId, status: AlertStatus.OPEN },
  });
}

export async function getAutomationCockpitSummary(ownerId: string): Promise<AutomationCockpitSummary> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [alertsToday, activeAutomations, failedRuns, next, openAlerts, criticalAlerts, attentionAlerts] = await Promise.all([
    prisma.automationAlert.count({ where: { ownerId, detectedAt: { gte: start } } }),
    prisma.automation.count({ where: { ownerId, enabled: true } }),
    prisma.automationExecution.count({ where: { ownerId, status: AutomationRunStatus.FAILED } }),
    prisma.automation.findFirst({
      where: { ownerId, enabled: true, nextRunAt: { not: null } },
      orderBy: { nextRunAt: "asc" },
      select: { nextRunAt: true },
    }),
    prisma.automationAlert.count({ where: { ownerId, status: AlertStatus.OPEN } }),
    prisma.automationAlert.count({ where: { ownerId, status: AlertStatus.OPEN, priority: "CRITICO" } }),
    prisma.automationAlert.count({ where: { ownerId, status: AlertStatus.OPEN, priority: { in: ["ALTO", "MEDIO"] } } }),
  ]);
  return {
    alertsToday,
    activeAutomations,
    failedRuns,
    nextRunAt: next?.nextRunAt?.toISOString() ?? null,
    openAlerts,
    criticalAlerts,
    attentionAlerts,
  };
}

export async function proposeAutomationFromQuestion(ownerId: string, question: string) {
  void ownerId;
  const parsed = parseAutomationPrompt(question);
  return parsed ? { ...parsed, enabled: false } : null;
}

export async function sendExternalNotification() {
  throw new Error("Canal externo não habilitado.");
}
