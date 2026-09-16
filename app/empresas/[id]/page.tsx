import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { archiveCompanyAction, updateCompanyAction } from "@/app/empresas/actions";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { getCompany } from "@/services/companyService";

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const company = await getCompany(session.user.id, id);
  if (!company) notFound();

  const boundUpdate = updateCompanyAction.bind(null, company.id);

  return (
    <AppShell title={company.name} subtitle={company.segment ?? "Empresa"} userName={session.user.name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {company.isDemo ? <DemoBadge /> : null}
            {company.status === "ARCHIVED" ? (
              <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
                Arquivada
              </span>
            ) : null}
          </div>
          {company.status === "ACTIVE" ? (
            <form action={archiveCompanyAction}>
              <input type="hidden" name="id" value={company.id} />
              <button
                type="submit"
                className="rounded-xl border px-3 py-2 text-[12px] font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Arquivar
              </button>
            </form>
          ) : null}
        </div>
        <CompanyForm company={company} action={boundUpdate} submitLabel="Salvar alterações" />
      </div>
    </AppShell>
  );
}
