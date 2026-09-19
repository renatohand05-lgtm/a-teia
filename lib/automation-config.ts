export const DEFAULT_AUTOMATION_TIMEZONE = "America/Sao_Paulo";

export const AUTOMATION_LIMITS = {
  maxPerOwner: 40,
  maxExecutionsPerRun: 50,
  maxAlertsPerJob: 30,
  maxRetries: 2,
} as const;

export const ENABLED_NOTIFICATION_CHANNELS = ["IN_APP"] as const;

export function canManageAutomations(role: string | null | undefined): boolean {
  return !role || role === "owner";
}

export function canAcknowledgeAlerts(role: string | null | undefined): boolean {
  return canManageAutomations(role);
}

export function aiMayEnableAutomation(): false {
  return false;
}

export function aiMayCreateAutomationSilently(): false {
  return false;
}

export function shouldRetry(kind: string | null | undefined): boolean {
  return kind === "PROVIDER" || kind === "TIMEOUT" || kind === "DATABASE" || kind === "RATE_LIMIT";
}
