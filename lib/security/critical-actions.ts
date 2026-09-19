import { AppError } from "@/lib/security/errors";

export const CRITICAL_ACTIONS = [
  "decision.approve",
  "decision.reject",
  "allocation.approve",
  "allocation.reject",
  "capital.move",
  "evidence.validate",
  "memory.promote",
  "experiment.complete",
  "record.delete.critical",
  "automation.enable",
  "automation.update",
  "automation.run.external",
] as const;

export type CriticalAction = (typeof CRITICAL_ACTIONS)[number];

const CRITICAL_SET = new Set<string>(CRITICAL_ACTIONS);

export function isCriticalAction(action: string): action is CriticalAction {
  return CRITICAL_SET.has(action);
}

export function requiresHumanConfirmation(action: string): boolean {
  return isCriticalAction(action);
}

export function aiMayExecute(action: string): boolean {
  return !isCriticalAction(action);
}

export function assertHumanOnly(action: string): void {
  if (!requiresHumanConfirmation(action)) return;
  throw new AppError("FORBIDDEN", "Esta ação exige confirmação humana.");
}

export function assertAiCannotExecute(action: string): void {
  if (aiMayExecute(action)) return;
  throw new AppError("FORBIDDEN", "A IA não pode executar esta ação.");
}
