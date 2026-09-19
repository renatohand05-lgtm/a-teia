import { executionProgress, isClosedTaskStatus, isTaskOverdue } from "@/lib/execution";

export const HORIZON_PHASES = [
  {
    days: 30,
    title: "30 dias — Corrigir",
    focus: "Dados, gargalos, correções e testes mínimos. Sem prometer escala.",
  },
  {
    days: 60,
    title: "60 dias — Tração",
    focus: "Tração, conversão, recorrência, aquisição e otimização — só no contexto real do plano.",
  },
  {
    days: 90,
    title: "90 dias — Escalar",
    focus: "Escalar o que mostrou resultado. Hipótese sem evidência não vira estratégia de escala.",
  },
] as const;

export const EXECUTION_HELP = {
  progress:
    "Progresso = tarefas concluídas ÷ tarefas ativas. Canceladas ficam de fora. Sem tarefas, não há percentual.",
} as const;

export type PlanProgressDisplay = {
  done: number;
  total: number;
  percent: number | null;
  label: string;
};

export type TaskGroupKey = "inProgress" | "overdue" | "upcoming" | "done";

export function displayPlanProgress(statuses: string[]): PlanProgressDisplay {
  const active = statuses.filter((status) => status !== "CANCELLED");
  if (!active.length) {
    return { done: 0, total: 0, percent: null, label: "Plano ainda sem tarefas." };
  }
  const done = active.filter((status) => status === "DONE").length;
  const percent = executionProgress(statuses);
  return {
    done,
    total: active.length,
    percent,
    label: `${done} de ${active.length} concluídas`,
  };
}

export function displayAverageProgress(planCount: number, average: number): string {
  if (planCount <= 0) return "—";
  return `${average}%`;
}

export function horizonPhase(index: number) {
  return HORIZON_PHASES[index] ?? HORIZON_PHASES[HORIZON_PHASES.length - 1];
}

export function groupExecutionTasks<T extends { status: string; dueAt?: string | null; overdue?: boolean }>(
  tasks: T[],
  now = new Date(),
): Record<TaskGroupKey, T[]> {
  const overdue: T[] = [];
  const inProgress: T[] = [];
  const upcoming: T[] = [];
  const done: T[] = [];

  for (const task of tasks) {
    const late = task.overdue ?? isTaskOverdue(task.dueAt, task.status, now);
    if (task.status === "DONE") {
      done.push(task);
      continue;
    }
    if (isClosedTaskStatus(task.status)) continue;
    if (late) {
      overdue.push(task);
      continue;
    }
    if (task.status === "IN_PROGRESS" || task.status === "BLOCKED") {
      inProgress.push(task);
      continue;
    }
    upcoming.push(task);
  }

  return { inProgress, overdue, upcoming, done };
}

export function groupExecutionPlans<T extends { progress: number; overdueCount: number }>(plans: T[]) {
  return {
    overdue: plans.filter((plan) => plan.overdueCount > 0 && plan.progress < 100),
    inProgress: plans.filter((plan) => plan.overdueCount === 0 && plan.progress < 100),
    done: plans.filter((plan) => plan.progress === 100),
  };
}
