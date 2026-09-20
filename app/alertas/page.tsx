import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AlertInbox } from "@/components/alerts/AlertInbox";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { getAutomationWorkspace } from "@/services/automationService";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    const workspace = await getAutomationWorkspace(session.user.id);
    return (
      <AppShell title="Alertas" subtitle="Inbox de condições detectadas" userName={session.user.name}>
        <AlertInbox alerts={workspace.alerts} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Alertas" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar os alertas." />
      </AppShell>
    );
  }
}
