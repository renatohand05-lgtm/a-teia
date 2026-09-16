import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CockpitView } from "@/components/cockpit/CockpitView";
import { ErrorState } from "@/components/ui/States";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function CockpitPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    const companies = await listCompanies(session.user.id, true);
    return (
      <AppShell
        title="Meu Cockpit"
        subtitle="Centro de decisão pessoal"
        userName={session.user.name}
      >
        <CockpitView companies={companies} userName={session.user.name?.split(" ")[0] || "Renato"} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Meu Cockpit" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar o Cockpit. Verifique a conexão com o PostgreSQL (DATABASE_URL)." />
      </AppShell>
    );
  }
}
