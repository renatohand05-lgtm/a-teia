import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CompanyDirectory } from "@/components/companies/CompanyDirectory";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { MODULE_PICKER_LABELS, pathForModuleQuery } from "@/lib/company-nav";
import { listCompanyDirectory } from "@/services/companyService";

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
    const companies = await listCompanyDirectory(session.user.id, true);
    const active = companies.filter((company) => company.status === "ACTIVE");
    const archived = companies.filter((company) => company.status === "ARCHIVED");
    const moduleLabel = modulo ? MODULE_PICKER_LABELS[modulo] : null;

    if (modulo && active.length === 1) {
      const href = pathForModuleQuery(modulo, active[0].id);
      if (href) redirect(href);
    }

    return (
      <AppShell title="Empresas" subtitle="Carteira operacional" userName={session.user.name}>
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
              {active.length} empresa{active.length === 1 ? "" : "s"} monitorada{active.length === 1 ? "" : "s"}
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
            <CompanyDirectory
              companies={active}
              hrefFor={modulo ? (id) => pathForModuleQuery(modulo, id) ?? `/empresas/${id}` : undefined}
            />
          ) : (
            <EmptyState
              title="Nenhuma empresa cadastrada"
              body="Cadastre o primeiro negócio para montar a carteira."
              action={
                <Link href="/empresas/nova" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Cadastrar empresa
                </Link>
              }
            />
          )}

          {archived.length ? (
            <section className="mt-10">
              <h2 className="mb-3 text-[16px] font-bold">Arquivadas</h2>
              <CompanyDirectory companies={archived} />
            </section>
          ) : null}
        </div>
      </AppShell>
    );
  } catch {
    return (
      <AppShell title="Empresas" userName={session.user.name}>
        <ErrorState message="Não foi possível carregar as empresas." />
      </AppShell>
    );
  }
}
