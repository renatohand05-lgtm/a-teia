import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PlaybookLibrary } from "@/components/playbooks/PlaybookLibrary";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { listPlaybooks } from "@/services/playbookService";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams?: Promise<{ empresa?: string; segmento?: string; familia?: string; status?: string; kpi?: string; maturidade?: string; aplicacoes?: string; empresas?: string; segmentos?: string; ordem?: string; pagina?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};
  try {
    const [bundle, companies] = await Promise.all([
      listPlaybooks(session.user.id, {
        companyId: params.empresa,
        segment: params.segmento,
        family: params.familia,
        status: params.status,
        kpi: params.kpi,
        maturity: params.maturidade,
        applications: params.aplicacoes,
        companies: params.empresas,
        segments: params.segmentos,
        order: params.ordem,
        page: params.pagina ? Number(params.pagina) : 1,
      }),
      listCompanies(session.user.id),
    ]);
    return (
      <AppShell title="Playbooks" subtitle="Aprendizados estruturados para reutilizar o que já foi testado" userName={session.user.name}>
        <PlaybookLibrary
          playbooks={bundle.items}
          kpis={bundle.kpis}
          page={bundle.page}
          pages={bundle.pages}
          total={bundle.total}
          companies={companies.map((item) => ({ id: item.id, name: item.name, segment: item.segment }))}
          filters={params}
        />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Playbooks" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar os playbooks." />
      </AppShell>
    );
  }
}
