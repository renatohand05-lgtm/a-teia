import { updateCompanyAction } from "@/app/empresas/actions";
import { ArchiveCompanyForm } from "@/components/companies/ArchiveCompanyForm";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { RestoreCompanyForm } from "@/components/companies/RestoreCompanyForm";
import { AppShell } from "@/components/layout/AppShell";
import { requireOwnedCompany } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, company } = await requireOwnedCompany(id);
  const boundUpdate = updateCompanyAction.bind(null, company.id);

  return (
    <AppShell title="Cadastro" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-6">
        <section>
          <h2 className="mb-2 text-[18px] font-bold">Editar cadastro</h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-2)" }}>
            Complete os dados quando fizer sentido. O onboarding continua em rota própria.
          </p>
          {company.status === "ACTIVE" ? (
            <div className="mb-4">
              <ArchiveCompanyForm companyId={company.id} />
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                Empresa arquivada. Os dados foram preservados. Isto não é exclusão.
              </p>
              <RestoreCompanyForm companyId={company.id} />
            </div>
          )}
          <CompanyForm company={company} action={boundUpdate} submitLabel="Salvar cadastro" />
        </section>
      </div>
    </AppShell>
  );
}
