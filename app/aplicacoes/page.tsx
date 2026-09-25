import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApplicationCenter } from "@/components/applications/ApplicationCenter";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { applicationCenterKpis } from "@/lib/application-center";
import { listCompanies } from "@/services/companyService";
import { listPlaybookApplications } from "@/services/playbookService";

export const dynamic = "force-dynamic";

export default async function AplicacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    origem?: string;
    destino?: string;
    playbook?: string;
    segmento?: string;
    status?: string;
    compat?: string;
    resultado?: string;
    evidencia?: string;
    periodo?: string;
    q?: string;
    ordem?: string;
    pagina?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};
  try {
    const [bundle, companies] = await Promise.all([
      listPlaybookApplications(session.user.id, {
        originId: params.origem,
        destinationId: params.destino,
        playbookId: params.playbook,
        segment: params.segmento,
        status: params.status,
        compatibility: params.compat,
        result: params.resultado,
        evidence: params.evidencia,
        period: params.periodo,
        q: params.q,
        order: params.ordem,
        page: params.pagina ? Number(params.pagina) : 1,
      }),
      listCompanies(session.user.id),
    ]);
    const playbooks = [...new Map(bundle.all.map((item) => [item.playbookId, { id: item.playbookId, title: item.playbookTitle }])).values()];
    const hasCoverage = bundle.all.length > 0 || companies.length > 0;
    return (
      <AppShell title="Aplicações" subtitle="Ciclo de transferência em operação" userName={session.user.name}>
        <ApplicationCenter
          items={bundle.items}
          kpis={applicationCenterKpis(bundle.all, hasCoverage)}
          hasCoverage={hasCoverage}
          page={bundle.page}
          pages={bundle.pages}
          total={bundle.total}
          companies={companies.map((item) => ({ id: item.id, name: item.name, segment: item.segment }))}
          playbooks={playbooks}
          filters={params}
        />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Aplicações" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar as aplicações." />
      </AppShell>
    );
  }
}
