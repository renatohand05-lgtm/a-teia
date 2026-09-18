import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CompanyCockpit } from "@/components/companies/CompanyCockpit";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { OpportunityOverview } from "@/components/companies/OpportunityOverview";
import { archiveCompanyAction, updateCompanyAction } from "@/app/empresas/actions";
import { requireOwnedCompany } from "@/lib/access";
import { getOnboarding } from "@/services/onboardingService";
import { getLatestDiagnosis, listDiagnoses } from "@/services/diagnosisService";
import { getOpportunitySummary, getTopOpportunities } from "@/services/opportunityService";
import { getExecutionSummary } from "@/services/executionService";
import { getFinancialMiniSummary } from "@/services/financialService";
import { getExperimentSummary } from "@/services/experimentService";
import { getMemorySummary } from "@/services/memoryService";

export const dynamic = "force-dynamic";

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);

  const [onboarding, latest, history, summary, top, execution, finance, experimentSummary, memorySummary] = await Promise.all([
    getOnboarding(userId, id),
    getLatestDiagnosis(userId, id),
    listDiagnoses(userId, id),
    getOpportunitySummary(userId, id),
    getTopOpportunities(userId, id, 3),
    getExecutionSummary(userId, id),
    getFinancialMiniSummary(userId, id),
    getExperimentSummary(userId, id),
    getMemorySummary(userId, id),
  ]);
  const financeSummary = finance
    ? {
        revenue: finance.dre.grossRevenue,
        ebitda: finance.dre.ebitda,
        ebitdaPercent: finance.ratios.ebitdaPercent,
        cogsPercent: finance.ratios.cogsPercent,
        breakEven: finance.breakEven.value,
        revenueGap: finance.comparisons.revenue.difference,
      }
    : null;

  const boundUpdate = updateCompanyAction.bind(null, company.id);

  return (
    <AppShell title={company.name} subtitle="Central da empresa" userName={name}>
      <div className="mx-auto max-w-[1480px] space-y-8">
        <CompanyCockpit
          company={company}
          onboarding={onboarding}
          latest={latest}
          historyCount={history.length}
          finance={financeSummary}
          experiments={{
            active: experimentSummary.active,
            completed: experimentSummary.completed,
            validated: experimentSummary.validated,
            inconclusive: experimentSummary.inconclusive,
          }}
          memory={{
            validated: memorySummary.validated,
            recent: memorySummary.recent.map((item) => ({ id: item.id, title: item.title })),
            conflicting: memorySummary.conflicting,
            transferableCount: memorySummary.transferableCount,
          }}
        />
        <OpportunityOverview companyId={company.id} summary={summary} top={top} />

        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>Execução estratégica</div>
              <h2 className="mt-1 text-[18px] font-black">Planos 30/60/90</h2>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                {execution.activePlans} ativos · {execution.averageProgress}% de progresso médio · {execution.overdueTasks} tarefas atrasadas
              </p>
            </div>
            <Link href={`/empresas/${company.id}/execucao`} className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
              Abrir execução →
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-bold">Cadastro técnico</h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-2)" }}>
            Unidades e margem permanecem no cadastro técnico. O onboarding operacional vive em rota própria.
          </p>
          {company.status === "ACTIVE" ? (
            <form action={archiveCompanyAction} className="mb-4">
              <input type="hidden" name="id" value={company.id} />
              <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                Arquivar empresa
              </button>
            </form>
          ) : (
            <p className="mb-4 text-[12px]" style={{ color: "var(--text-3)" }}>Empresa arquivada</p>
          )}
          <CompanyForm company={company} action={boundUpdate} submitLabel="Salvar cadastro técnico" />
        </section>
      </div>
    </AppShell>
  );
}
