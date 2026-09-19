import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/States";
import { CalculationHelp } from "@/components/ui/CalculationHelp";
import { requireOwnedCompany } from "@/lib/access";
import { displayAverageProgress, displayPlanProgress, EXECUTION_HELP, groupExecutionPlans } from "@/lib/execution-ui";
import { getExecutionSummary, listExecutionPlans } from "@/services/executionService";
import { listOpportunities } from "@/services/opportunityService";

export const dynamic = "force-dynamic";

export default async function ExecucaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const [plans, summary, opportunities] = await Promise.all([
    listExecutionPlans(userId, id),
    getExecutionSummary(userId, id),
    listOpportunities(userId, id),
  ]);
  const queued = opportunities.filter((item) => item.queuedForPlan);
  const groups = groupExecutionPlans(plans);
  const primaryHref = queued[0]
    ? `/empresas/${id}/execucao/novo?opportunityId=${queued[0].id}`
    : `/empresas/${id}/oportunidades`;
  const primaryLabel = queued[0] ? "Criar plano" : "Revisar oportunidades";

  return (
    <AppShell title="Execução 30/60/90" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Central da empresa
          </Link>
          <Link
            href={primaryHref}
            className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            {primaryLabel}
          </Link>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Planos", String(summary.totalPlans)],
            ["Em andamento", String(summary.activePlans)],
            ["Progresso médio", displayAverageProgress(summary.totalPlans, summary.averageProgress)],
            ["Tarefas atrasadas", String(summary.overdueTasks)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="text-[10px] uppercase tracking-[.14em] sm:text-[11px]" style={{ color: "var(--text-3)" }}>
                {label}
              </div>
              <div className="mt-2 text-2xl font-black sm:text-3xl">{value}</div>
            </div>
          ))}
        </section>
        <CalculationHelp label="Progresso" text={EXECUTION_HELP.progress} />

        {queued.length > 0 ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Prontas para virar plano</h2>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
              Criar o plano registra a decisão humana de executar. Continua sendo hipótese até haver evidência.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {queued.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  href={`/empresas/${id}/execucao/novo?opportunityId=${opportunity.id}`}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="font-bold">{opportunity.title}</div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                    Score {opportunity.priorityScore}/100{opportunity.scorePartial ? " · parcial" : ""} ·{" "}
                    {opportunity.sourceDimensionLabel}
                  </div>
                  <div className="mt-3 text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                    Revisar e criar plano →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-5">
          <h2 className="text-[16px] font-black">Carteira de execução</h2>
          {plans.length === 0 ? (
            <EmptyState
              title="Nenhum plano em execução."
              body="Transforme uma hipótese priorizada em 30/60/90. Executar não prova que funcionou."
              action={
                <Link href={`/empresas/${id}/oportunidades`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Revisar oportunidades
                </Link>
              }
            />
          ) : (
            <>
              <PlanGroup title="Atrasadas" items={groups.overdue} companyId={id} />
              <PlanGroup title="Em andamento" items={groups.inProgress} companyId={id} />
              <PlanGroup title="Concluídas" items={groups.done} companyId={id} />
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PlanGroup({
  title,
  items,
  companyId,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listExecutionPlans>>;
  companyId: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {title}
      </h3>
      <div className="grid gap-3">
        {items.map((plan) => {
          const progress = displayPlanProgress(plan.tasks.map((task) => task.status));
          return (
            <Link
              key={plan.id}
              href={`/empresas/${companyId}/execucao/${plan.id}`}
              className="rounded-2xl border p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black">{plan.title}</div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                    {plan.opportunityTitle ?? "Plano independente"} · 30/60/90
                  </div>
                  {plan.overdueCount > 0 ? (
                    <div className="mt-2 text-[11px] font-bold text-[#f09a93]">{plan.overdueCount} tarefa(s) atrasada(s)</div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-xl font-black">{progress.percent != null ? `${progress.percent}%` : "—"}</div>
                  <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>
                    {progress.label}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
