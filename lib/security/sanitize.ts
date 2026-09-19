const SECRET_KEY_PATTERN =
  /^(password|passwordhash|authorization|cookie|cookies|token|session|sessiontoken|auth_secret|nextauth_secret|cron_secret|api[_-]?key|openai_api_key|tavily_api_key|database_url|secret|bearer)$/i;

const SECRET_VALUE_PATTERN =
  /(sk-[a-zA-Z0-9_-]{8,}|tvly-[a-zA-Z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]+|postgres(ql)?:\/\/\S+)/i;

const REDACTED = "[redacted]";

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key.replace(/[\s-]/g, ""));
}

export function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (SECRET_VALUE_PATTERN.test(value)) return REDACTED;
    return value.length > 4000 ? `${value.slice(0, 4000)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isSecretKey(key)) continue;
      output[key] = sanitizeAuditValue(nested, depth + 1);
    }
    return output;
  }
  return String(value);
}

export function auditContainsSecret(value: unknown): boolean {
  const text = JSON.stringify(sanitizeAuditValue(value) ?? {}).toLowerCase();
  return (
    /sk-[a-z0-9_-]{8,}/.test(text) ||
    /tvly-[a-z0-9_-]{8,}/.test(text) ||
    text.includes("cron_secret=") ||
    /postgres(ql)?:\/\//.test(text) ||
    text.includes("bearer ")
  );
}

export function categoryFromAction(action: string): string {
  const prefix = action.split(".")[0]?.trim().toLowerCase();
  if (!prefix) return "system";
  if (prefix === "auth" || prefix === "security") return prefix;
  return prefix;
}
