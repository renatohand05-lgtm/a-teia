import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AllocationView } from "@/components/allocation/AllocationView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { getAllocationWorkspace } from "@/services/allocationService";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    const workspace = await getAllocationWorkspace(session.user.id);
    return (
      <AppShell
        title="Alocação de recursos"
        subtitle="Onde investir dinheiro e tempo com os dados que você já tem."
        userName={session.user.name}
      >
        <AllocationView workspace={workspace} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Alocação de recursos" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar a alocação." />
      </AppShell>
    );
  }
}
