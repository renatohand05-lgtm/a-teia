import { AppShell } from "@/components/layout/AppShell";
import { CompanyCockpit } from "@/components/companies/CompanyCockpit";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { archiveCompanyAction, updateCompanyAction } from "@/app/empresas/actions";
import { requireOwnedCompany } from "@/lib/access";
import { getOnboarding } from "@/services/onboardingService";
import { getLatestDiagnosis, listDiagnoses } from "@/services/diagnosisService";

export const dynamic = "force-dynamic";

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);

  const [onboarding, latest, history] = await Promise.all([
    getOnboarding(userId, id),
    getLatestDiagnosis(userId, id),
    listDiagnoses(userId, id),
  ]);

  const boundUpdate = updateCompanyAction.bind(null, company.id);

  return (
    <AppShell title={company.name} subtitle="Central da empresa" userName={name}>
      <div className="mx-auto max-w-[1480px] space-y-8">
        <CompanyCockpit
          company={company}
          onboarding={onboarding}
          latest={latest}
          historyCount={history.length}
        />
        <section>
          <h2 className="mb-3 text-[16px] font-bold">Cadastro técnico</h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-2)" }}>
            Unidades e margem permanecem no cadastro Sprint 0. O onboarding operacional vive em rota própria.
          </p>
          {company.status === "ACTIVE" ? (
            <form action={archiveCompanyAction} className="mb-4">
              <input type="hidden" name="id" value={company.id} />
              <button
                type="submit"
                className="rounded-xl border px-3 py-2 text-[12px] font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Arquivar empresa
              </button>
            </form>
          ) : (
            <p className="mb-4 text-[12px]" style={{ color: "var(--text-3)" }}>
              Empresa arquivada
            </p>
          )}
          <CompanyForm company={company} action={boundUpdate} submitLabel="Salvar cadastro técnico" />
        </section>
      </div>
    </AppShell>
  );
}
