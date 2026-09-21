import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { strategyStatusLabel } from "@/lib/strategy-engine";
import { listOwnerStrategies } from "@/services/strategyService";

export const dynamic = "force-dynamic";

export default async function EstrategiasPage({
  searchParams,
}: {
  searchParams?: Promise<{ empresa?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = (await searchParams) ?? {};
  try {
    const items = await listOwnerStrategies(session.user.id, {
      companyId: params.empresa && params.empresa !== "ALL" ? params.empresa : undefined,
      status: params.status,
    });
    return (
      <AppShell title="Estratégias" subtitle="Estratégias cruzadas da carteira" userName={session.user.name}>
        <div className="mx-auto max-w-[1100px] space-y-5">
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Uma estratégia cruzada continua hipótese até ser testada. Evidência de uma empresa não migra automaticamente.
          </p>
          {items.length === 0 ? (
            <EmptyState
              title="Nenhuma estratégia cruzada"
              body="Estratégia nasce de uma conexão analisada. Nada entra em execução sem confirmação humana."
              action={
                <Link href="/conexoes" className="inline-flex rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
                  Ver conexões
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <Link key={item.id} href={`/estrategias/${item.id}`} className="surface-card block p-4">
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                    {item.originName} → {item.destinationName ?? "Portfólio"} · {strategyStatusLabel(item.status)}
                  </p>
                  <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{item.hypothesis}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Estratégias" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar as estratégias." />
      </AppShell>
    );
  }
}
