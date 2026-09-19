import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AutomationView } from "@/components/automation/AutomationView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { getAutomationWorkspace } from "@/services/automationService";

export const dynamic = "force-dynamic";

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ empresa?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};

  try {
    const workspace = await getAutomationWorkspace(session.user.id, params.empresa || undefined);
    return (
      <AppShell
        title="Central de Automações"
        subtitle="Transforme sinais, prazos e rotinas em acompanhamento contínuo."
        userName={session.user.name}
      >
        <AutomationView workspace={workspace} companyId={params.empresa} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Central de Automações" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar as automações." />
      </AppShell>
    );
  }
}
