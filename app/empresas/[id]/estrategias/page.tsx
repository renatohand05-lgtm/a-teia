import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/States";
import { strategyStatusLabel } from "@/lib/strategy-engine";
import { getCompany } from "@/services/companyService";
import { listOwnerStrategies } from "@/services/strategyService";

export const dynamic = "force-dynamic";

export default async function CompanyStrategiesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const company = await getCompany(session.user.id, id);
  if (!company) notFound();
  const items = await listOwnerStrategies(session.user.id, { companyId: id });
  return (
    <AppShell title="Estratégias" subtitle={company.name} userName={session.user.name}>
      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma estratégia nesta empresa"
          body="Conexões analisadas podem gerar estratégias cruzadas. Elas permanecem hipótese até o teste."
          action={<Link href={`/conexoes?empresa=${id}`} className="font-bold" style={{ color: "var(--gold-soft)" }}>Ver conexões</Link>}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Link key={item.id} href={`/estrategias/${item.id}`} className="surface-card block p-4">
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>{strategyStatusLabel(item.status)}</p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
