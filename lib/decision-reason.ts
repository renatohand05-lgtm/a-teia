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
