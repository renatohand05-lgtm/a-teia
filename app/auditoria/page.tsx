import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuditView } from "@/components/audit/AuditView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { parseAuditUrlFilters } from "@/lib/audit-ui";
import { listOwnerAudit } from "@/services/auditService";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams?: Promise<{ empresa?: string; categoria?: string; acao?: string; usuario?: string; de?: string; ate?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const filters = parseAuditUrlFilters((await searchParams) ?? {});

  try {
    const [events, companies] = await Promise.all([
      listOwnerAudit(session.user.id, { limit: 120 }),
      listCompanies(session.user.id, true),
    ]);
    return (
      <AppShell
        title="Auditoria"
        subtitle="Quem fez o quê, quando e em qual recurso."
        userName={session.user.name}
      >
        <AuditView
          events={events}
          companies={companies.map((company) => ({ id: company.id, name: company.name }))}
          filters={filters}
        />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Auditoria" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar a auditoria." />
      </AppShell>
    );
  }
}
