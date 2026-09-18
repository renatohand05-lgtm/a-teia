import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CompanyCard } from "@/components/ui/CompanyCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { MODULE_PICKER_LABELS, pathForModuleQuery } from "@/lib/company-nav";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { modulo } = await searchParams;

  try {
    const companies = await listCompanies(session.user.id, true);
    const active = companies.filter((company) => company.status === "ACTIVE");
    const archived = companies.filter((company) => company.status === "ARCHIVED");
    const moduleLabel = modulo ? MODULE_PICKER_LABELS[modulo] : null;

    if (modulo && active.length === 1) {
      const href = pathForModuleQuery(modulo, active[0].id);
      if (href) redirect(href);
    }

    return (
      <AppShell title="Empresas" subtitle="Cadastro, edição, visualização e arquivo" userName={session.user.name}>
        <div className="mx-auto max-w-[1480px]">
          {moduleLabel ? (
            <div
              className="mb-5 rounded-2xl border px-4 py-3 text-[13px]"
              style={{ borderColor: "rgba(232,191,122,.28)", background: "rgba(232,191,122,.08)", color: "var(--text-2)" }}
            >
              Selecione uma empresa para abrir <b style={{ color: "var(--gold-soft)" }}>{moduleLabel}</b>.
            </div>
          ) : null}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px]" style={{ color: "var(--text-2)" }}>
              {active.length} ativa{active.length === 1 ? "" : "s"} na carteira
            </p>
            <Link
              href="/empresas/nova"
              className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
              style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
            >
              Nova empresa
            </Link>
          </div>

          {active.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {active.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  href={modulo ? pathForModuleQuery(modulo, company.id) ?? `/empresas/${company.id}` : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma empresa cadastrada"
              body="O Cockpit permanece vazio até existir pelo menos um negócio real (ou DEMO identificado)."
              action={
                <Link href="/empresas/nova" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Cadastrar agora
                </Link>
              }
            />
          )}

          {archived.length ? (
            <section className="mt-10">
              <h2 className="mb-3 text-[16px] font-bold">Arquivadas</h2>
              <div className="grid gap-4 opacity-70 md:grid-cols-2 xl:grid-cols-3">
                {archived.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Empresas" userName={session.user.name}>
        <ErrorState message="Falha ao ler empresas no banco." />
      </AppShell>
    );
  }
}
