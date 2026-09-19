export const EXECUTION_HORIZONS = [30, 60, 90] as const;

export type ExecutionHorizon = (typeof EXECUTION_HORIZONS)[number];

export const EXECUTION_TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
export type ExecutionTaskStatus = (typeof EXECUTION_TASK_STATUSES)[number];

export function addDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function isClosedTaskStatus(status: string): boolean {
  return status === "DONE" || status === "CANCELLED";
}

/** Progresso = concluídas / tarefas ativas. Canceladas não entram no denominador. */
export function executionProgress(statuses: string[]): number {
  const active = statuses.filter((status) => status !== "CANCELLED");
  if (!active.length) return 0;
  const done = active.filter((status) => status === "DONE").length;
  return Math.round((done / active.length) * 100);
}

export function isTaskOverdue(dueAt: Date | string | null | undefined, status: string, now = new Date()): boolean {
  if (!dueAt || isClosedTaskStatus(status)) return false;
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function countOverdueTasks(
  tasks: Array<{ dueAt: Date | string | null; status: string }>,
  now = new Date(),
): number {
  return tasks.filter((task) => isTaskOverdue(task.dueAt, task.status, now)).length;
}

export function executionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    TODO: "A fazer",
    IN_PROGRESS: "Em execução",
    BLOCKED: "Bloqueada",
    DONE: "Concluída",
    CANCELLED: "Cancelada",
  };
  return labels[status] ?? status;
}

export function decisionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    PENDING_HUMAN_APPROVAL: "Aguardando aprovação",
    APPROVED: "Aprovada",
    REJECTED: "Rejeitada",
    DEFERRED: "Adiada",
    EXECUTED: "Executada",
    CANCELLED: "Cancelada",
  };
  return labels[status] ?? status;
}
