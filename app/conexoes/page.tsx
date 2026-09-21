import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConnectionsWorkspace } from "@/components/connections/ConnectionsWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { getConnectionWorkspace } from "@/services/connectionService";

export const dynamic = "force-dynamic";

export default async function ConexoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ empresa?: string; tipo?: string; status?: string; classificacao?: string; segmento?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};
  try {
    const workspace = await getConnectionWorkspace(session.user.id, {
      companyId: params.empresa && params.empresa !== "ALL" ? params.empresa : undefined,
      type: params.tipo,
      status: params.status,
      classification: params.classificacao,
      segment: params.segmento,
    });
    return (
      <AppShell title="Conexões" subtitle="Mapa operacional da carteira" userName={session.user.name}>
        <ConnectionsWorkspace
          connections={workspace.connections}
          companies={workspace.companies}
          kpis={workspace.kpis}
          filters={params}
        />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Conexões" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar as conexões." />
      </AppShell>
    );
  }
}
