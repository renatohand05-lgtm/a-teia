export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

const buckets = new Map<string, number[]>();

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  ai: { limit: 20, windowMs: 10 * 60 * 1000 },
  research: { limit: 12, windowMs: 10 * 60 * 1000 },
  automation: { limit: 10, windowMs: 10 * 60 * 1000 },
  cron: { limit: 30, windowMs: 10 * 60 * 1000 },
} as const;

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const start = now - windowMs;
  const previous = (buckets.get(key) ?? []).filter((stamp) => stamp > start);
  if (previous.length >= limit) {
    buckets.set(key, previous);
    const retryAfterSec = Math.max(1, Math.ceil((previous[0]! + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }
  previous.push(now);
  buckets.set(key, previous);
  return { ok: true, remaining: Math.max(0, limit - previous.length), retryAfterSec: 0 };
}

export function consumeNamedLimit(scope: keyof typeof RATE_LIMITS, identity: string, now = Date.now()): RateLimitResult {
  const rule = RATE_LIMITS[scope];
  return consumeRateLimit(`${scope}:${identity}`, rule.limit, rule.windowMs, now);
}

export function resetRateLimitForTests() {
  buckets.clear();
}

export function clientIdentity(headersList: Headers, extra = "anon"): string {
  const forwarded = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headersList.get("x-real-ip")?.trim();
  return `${forwarded || realIp || "local"}:${extra}`;
}
