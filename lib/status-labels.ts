export const ALLOCATION_STATUS_LABELS: Record<string, string> = {
  SIMULATION: "Simulação",
  PROPOSAL: "Proposta",
  SENT_TO_DECISION: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const AUTOMATION_ALERT_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  ACKNOWLEDGED: "Reconhecido",
  RESOLVED: "Resolvido",
  DISMISSED: "Dispensado",
};

export const DECISION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_HUMAN_APPROVAL: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  EXECUTED: "Em execução",
  CANCELLED: "Arquivado",
};

export function statusLabel(value: string | null | undefined, dictionary: Record<string, string>, fallback = "—"): string {
  if (!value) return fallback;
  return dictionary[value] ?? fallback;
}
