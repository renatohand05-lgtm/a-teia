import { isSchedulerConfigured } from "@/lib/cron-auth";
import packageJson from "../package.json";

export const APP_NAME = "A TEIA";
export const APP_RELEASE = "Sprint 11";
export const APP_VERSION = packageJson.version;

export function appEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
}

export function buildHealthPayload() {
  return {
    status: "ok" as const,
    ok: true,
    app: APP_NAME,
    release: APP_RELEASE,
    version: APP_VERSION,
    environment: appEnvironment(),
    openaiExposed: false,
    automationEngine: "ok" as const,
    scheduler: isSchedulerConfigured() ? ("configured" as const) : ("not_configured" as const),
  };
}
