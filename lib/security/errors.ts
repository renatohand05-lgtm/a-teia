import { HUMAN_MESSAGES } from "@/lib/human-messages";

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

const PUBLIC_BY_CODE: Record<ErrorCode, string> = {
  VALIDATION_ERROR: HUMAN_MESSAGES.validation,
  UNAUTHORIZED: HUMAN_MESSAGES.unauthorized,
  FORBIDDEN: HUMAN_MESSAGES.forbidden,
  NOT_FOUND: HUMAN_MESSAGES.forbidden,
  CONFLICT: HUMAN_MESSAGES.conflict,
  RATE_LIMITED: HUMAN_MESSAGES.rateLimited,
  PROVIDER_UNAVAILABLE: HUMAN_MESSAGES.providerUnavailable,
  INTERNAL_ERROR: HUMAN_MESSAGES.internal,
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, message?: string, status?: number) {
    super(message ?? PUBLIC_BY_CODE[code]);
    this.name = "AppError";
    this.code = code;
    this.status = status ?? STATUS_BY_CODE[code];
  }
}

function looksTechnical(message: string): boolean {
  return (
    message.includes("\n") ||
    message.includes("Prisma") ||
    message.includes("SQL") ||
    /at\s+\S+\s+\(/.test(message) ||
    message.includes("ECONN") ||
    message.toLowerCase().includes("stack")
  );
}

export function toPublicError(error: unknown): { status: number; body: { error: string; code: ErrorCode } } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }

  const raw = error instanceof Error ? error.message : "";
  if (/outra sessão|atualizada em outra|conflito/i.test(raw)) {
    return { status: 409, body: { error: HUMAN_MESSAGES.conflict, code: "CONFLICT" } };
  }
  if (/muitas solicitações|rate limit/i.test(raw)) {
    return { status: 429, body: { error: HUMAN_MESSAGES.rateLimited, code: "RATE_LIMITED" } };
  }
  if (/fonte externa|provider|tavily|openai/i.test(raw) && /indispon|falhou|não foi possível/i.test(raw)) {
    return { status: 503, body: { error: HUMAN_MESSAGES.providerUnavailable, code: "PROVIDER_UNAVAILABLE" } };
  }
  if (/não autentic/i.test(raw)) {
    return { status: 401, body: { error: HUMAN_MESSAGES.unauthorized, code: "UNAUTHORIZED" } };
  }
  if (/não encontrad|sem acesso|não tem acesso/i.test(raw)) {
    return { status: 403, body: { error: HUMAN_MESSAGES.forbidden, code: "FORBIDDEN" } };
  }
  if (raw && !looksTechnical(raw) && raw.length < 180) {
    return { status: 400, body: { error: raw, code: "VALIDATION_ERROR" } };
  }
  return { status: 500, body: { error: HUMAN_MESSAGES.internal, code: "INTERNAL_ERROR" } };
}

export function publicErrorJson(error: unknown) {
  return toPublicError(error);
}
