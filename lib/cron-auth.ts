import { sanitizeEnvValue } from "@/lib/integrations";

export function getCronSecret(): string | null {
  return sanitizeEnvValue(process.env.CRON_SECRET);
}

export function isSchedulerConfigured(): boolean {
  return Boolean(getCronSecret());
}

export function authorizeCronRequest(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? request.headers.get("x-cron-secret") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === secret;
}
