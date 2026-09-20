import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CockpitView } from "@/components/cockpit/CockpitView";
import { ErrorState } from "@/components/ui/States";
import { parseCockpitPeriod } from "@/lib/cockpit-period";
import { getCockpitSnapshot } from "@/services/cockpitService";
import { writeAudit } from "@/services/auditService";
import { AuditSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CockpitPage({
  searchParams,
}: {
  searchParams?: Promise<{ empresa?: string; segmento?: string; prioridade?: string; tipo?: string; periodo?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};
  const filters = {
    companyId: params.empresa || undefined,
    segment: params.segmento || undefined,
    level: params.prioridade || undefined,
    kind: params.tipo || undefined,
    period: parseCockpitPeriod(params.periodo),
  };

  try {
    const snapshot = await getCockpitSnapshot(session.user.id, filters);
    await writeAudit({
      actorId: session.user.id,
      action: "cockpit.viewed",
      entity: "Cockpit",
      origin: AuditSource.USER,
    });
    return (
      <AppShell
        title="Meu Cockpit"
        subtitle="Central de decisão multiempresa"
        userName={session.user.name}
      >
        <CockpitView snapshot={snapshot} filters={filters} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Meu Cockpit" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar o Cockpit." />
      </AppShell>
    );
  }
}
