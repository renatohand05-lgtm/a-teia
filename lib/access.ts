import "server-only";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCompany } from "@/services/companyService";
import { canAccessCompany } from "@/lib/access-policy";
import { AppError } from "@/lib/security/errors";
import { can, type Permission } from "@/lib/security/permissions";
import {
  requireOwnedResource,
  assertCompanyAccess,
  assertResourceOwnership,
  type OwnedResourceKind,
} from "@/lib/security/ownership";

export {
  canAccessCompany,
  requireOwnedResource,
  assertCompanyAccess,
  assertResourceOwnership,
};

export async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED");
  }
  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: "owner" as const,
  };
}

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, name: session.user.name, email: session.user.email };
}

export async function requireOwnedCompany(companyId: string) {
  const session = await requireUserId();
  const company = await getCompany(session.userId, companyId);
  if (!company) redirect("/empresas");
  return { ...session, company };
}

export async function assertOwnedCompany(ownerId: string, companyId: string) {
  const company = await getCompany(ownerId, companyId);
  if (!company) throw new AppError("FORBIDDEN");
  return company;
}

export function assertCan(ownerId: string, permission: Permission, resourceOwnerId?: string) {
  if (!can({ id: ownerId, role: "owner" }, permission, resourceOwnerId ? { ownerId: resourceOwnerId } : undefined)) {
    throw new AppError("FORBIDDEN");
  }
}

export async function requireOwnedKind(ownerId: string, kind: OwnedResourceKind, id: string) {
  return requireOwnedResource(ownerId, kind, id);
}
