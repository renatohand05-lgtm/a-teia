import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCompany } from "@/services/companyService";
import { canAccessCompany } from "@/lib/access-policy";

export { canAccessCompany };

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
