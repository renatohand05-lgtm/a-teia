import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { AppError } from "@/lib/security/errors";

export function assertFreshTimestamp(currentIso: string, expectedIso?: string | null): void {
  if (!expectedIso) return;
  if (currentIso !== expectedIso) {
    throw new AppError("CONFLICT", HUMAN_MESSAGES.conflict);
  }
}

export function assertFreshDate(current: Date, expectedIso?: string | null): void {
  assertFreshTimestamp(current.toISOString(), expectedIso);
}
