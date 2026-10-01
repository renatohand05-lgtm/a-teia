export const HUMAN_REASON_MAX = 280;

export function normalizeHumanReason(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, HUMAN_REASON_MAX);
}

export function humanReasonRequired(): boolean {
  return false;
}

export function humanReasonHint(): string {
  return "Recomendada. Fica no histórico da decisão. A IA não preenche sozinha.";
}

/** Pendência operacional precisa de empresa ou de alocação. Órfã de teste não entra no Cockpit. */
export function isOperationalDecision(input: { companyId: string | null | undefined; hasAllocationProposal?: boolean }): boolean {
  return Boolean(input.companyId) || Boolean(input.hasAllocationProposal);
}

export const TEST_ORPHAN_DECISION_TITLES = ["Aprovar plano-piloto", "Alocação de recursos — BALANCEADO — v1"] as const;

export function isUnequivocalTestOrphanDecision(input: {
  title: string;
  companyId: string | null | undefined;
  opportunityId?: string | null;
  hasAllocationProposal?: boolean;
  status: string;
}): boolean {
  if (input.companyId) return false;
  if (input.opportunityId) return false;
  if (input.hasAllocationProposal) return false;
  if (input.status !== "PENDING_HUMAN_APPROVAL" && input.status !== "DEFERRED") return false;
  return (TEST_ORPHAN_DECISION_TITLES as readonly string[]).includes(input.title);
}
