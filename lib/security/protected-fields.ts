import { AppError } from "@/lib/security/errors";

export const PROTECTED_CLIENT_FIELDS = [
  "ownerId",
  "createdById",
  "validatedById",
  "approvedById",
  "passwordHash",
  "role",
  "validated",
  "evidenceLevel",
  "score",
  "priorityScore",
  "system",
] as const;

export function rejectProtectedClientFields(input: unknown): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const keys = Object.keys(input);
  const blocked = keys.filter((key) =>
    PROTECTED_CLIENT_FIELDS.some((field) => field.toLowerCase() === key.toLowerCase()),
  );
  if (blocked.length) {
    throw new AppError("FORBIDDEN", "Campo protegido não pode ser definido pelo cliente.");
  }
}

export function hasProtectedClientField(input: unknown): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  return Object.keys(input).some((key) =>
    PROTECTED_CLIENT_FIELDS.some((field) => field.toLowerCase() === key.toLowerCase()),
  );
}
