export const EXECUTION_HORIZONS = [30, 60, 90] as const;

export type ExecutionHorizon = (typeof EXECUTION_HORIZONS)[number];

export function addDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

export function executionProgress(statuses: string[]): number {
  if (!statuses.length) return 0;
  const done = statuses.filter((status) => status === "DONE").length;
  return Math.round((done / statuses.length) * 100);
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
    EXECUTED: "Executada",
    CANCELLED: "Cancelada",
  };
  return labels[status] ?? status;
}
