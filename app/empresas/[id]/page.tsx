import Link from "next/link";
import { updateCompanyAction } from "@/app/empresas/actions";
import { ArchiveCompanyForm } from "@/components/companies/ArchiveCompanyForm";
import { CompanyCockpit } from "@/components/companies/CompanyCockpit";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { CompanyHeader } from "@/components/companies/CompanyHeader";
import { OpportunityOverview } from "@/components/companies/OpportunityOverview";
import { AppShell } from "@/components/layout/AppShell";
import { nextCockpitAction } from "@/lib/cockpit";
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
  const next = nextCockpitAction({
    companyId: company.id,
    companyName: company.name,
    hasCompany: true,
    hasDiagnosis: Boolean(latest),
    opportunityCount: summary.totalCount,
    prioritizedOpportunityCount: summary.activeCount,
    planCount: execution.totalPlans,
    financialCount: financeSummary ? 1 : 0,
    experimentActiveCount: experimentSummary.active,
    experimentCompletedCount: experimentSummary.completed,
    evidenceCount: experimentSummary.completed,
    evidenceValidatedCount: experimentSummary.validated,
    memoryValidatedCount: memorySummary.validated,
    attention: execution.overdueTasks > 0,
  });

  return (
    <AppShell title={company.name} subtitle="Central da empresa" userName={name}>
      <div className="mx-auto max-w-[1480px] space-y-8">
        <CompanyHeader
          company={company}
          nextTitle={next.title}
          nextHref={next.href}
          nextCta={next.cta}
        />
        <CompanyCockpit
          company={company}
          onboarding={onboarding}
          latest={latest}
          historyCount={history.length}
          finance={financeSummary}
          opportunities={{ total: summary.totalCount, active: summary.activeCount }}
          execution={{
            totalPlans: execution.totalPlans,
            activePlans: execution.activePlans,
            overdueTasks: execution.overdueTasks,
          }}
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
              <p className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>Automações</p>
              <h2 className="mt-1 text-[18px] font-black">Alertas e rotinas desta empresa</h2>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                Regras determinísticas. A IA não ativa nada sozinha.
              </p>
            </div>
            <Link href={`/automacoes?empresa=${company.id}`} className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
              Criar automação
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>Execução estratégica</div>
              <h2 className="mt-1 text-[18px] font-black">Planos 30/60/90</h2>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                {execution.activePlans} ativos · {execution.averageProgress}% de progresso médio · {execution.overdueTasks} tarefas atrasadas
              </p>
            </div>
            <Link href={`/empresas/${company.id}/execucao`} className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
              Abrir execução
            </Link>
          </div>
        </section>

        <section id="cadastro">
          <h2 className="mb-3 text-[16px] font-bold">Editar cadastro</h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-2)" }}>
            Complete os dados quando fizer sentido. O onboarding continua em rota própria.
          </p>
          {company.status === "ACTIVE" ? (
            <div className="mb-4">
              <ArchiveCompanyForm companyId={company.id} />
            </div>
          ) : (
            <p className="mb-4 text-[12px]" style={{ color: "var(--text-3)" }}>
              Empresa arquivada. Os dados foram preservados.
            </p>
          )}
          <CompanyForm company={company} action={boundUpdate} submitLabel="Salvar cadastro" />
        </section>
      </div>
    </AppShell>
  );
}
