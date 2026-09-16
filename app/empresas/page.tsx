import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CompanyCard } from "@/components/ui/CompanyCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { listCompanies } from "@/services/companyService";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    const companies = await listCompanies(session.user.id, true);
    const active = companies.filter((c) => c.status === "ACTIVE");
    const archived = companies.filter((c) => c.status === "ARCHIVED");

    return (
      <AppShell title="Empresas" subtitle="Cadastro, edição, visualização e arquivo" userName={session.user.name}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px]" style={{ color: "var(--text-2)" }}>
              {active.length} ativa{active.length === 1 ? "" : "s"} · persistidas no PostgreSQL
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
                <CompanyCard key={company.id} company={company} />
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
