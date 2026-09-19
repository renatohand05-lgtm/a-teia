import { AppError } from "@/lib/security/errors";

export const PERMISSIONS = [
  "company.read",
  "company.write",
  "finance.read",
  "finance.write",
  "diagnosis.read",
  "diagnosis.write",
  "opportunity.read",
  "opportunity.write",
  "execution.read",
  "execution.write",
  "experiment.read",
  "experiment.write",
  "evidence.read",
  "evidence.validate",
  "memory.read",
  "memory.promote",
  "decision.read",
  "decision.approve",
  "allocation.read",
  "allocation.approve",
  "automation.read",
  "automation.write",
  "ai.use",
  "research.use",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PermissionActor = {
  id: string;
  role?: string | null;
};

export type PermissionResource = {
  ownerId: string;
};

const OWNER_PERMISSIONS = new Set<Permission>(PERMISSIONS);

export function isOwnerRole(role?: string | null): boolean {
  return !role || role === "owner";
}

export function can(user: PermissionActor, permission: Permission, resource?: PermissionResource): boolean {
  if (!user.id) return false;
  if (resource && resource.ownerId !== user.id) return false;
  if (!isOwnerRole(user.role)) return false;
  return OWNER_PERMISSIONS.has(permission);
}

export function requirePermission(user: PermissionActor, permission: Permission, resource?: PermissionResource): void {
  if (!can(user, permission, resource)) {
    throw new AppError("FORBIDDEN", "Você não tem acesso a este recurso.");
  }
}
