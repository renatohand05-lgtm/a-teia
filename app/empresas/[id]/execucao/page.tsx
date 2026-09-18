import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireOwnedCompany } from "@/lib/access";
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

  return (
    <AppShell title="Execução 30/60/90" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Central da empresa
          </Link>
          <span className="text-[12px]" style={{ color: "var(--text-3)" }}>
            Oportunidade → decisão → plano → tarefa
          </span>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Planos", summary.totalPlans],
            ["Ativos", summary.activePlans],
            ["Progresso médio", `${summary.averageProgress}%`],
            ["Tarefas atrasadas", summary.overdueTasks],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="text-[10px] uppercase tracking-[.14em] sm:text-[11px]" style={{ color: "var(--text-3)" }}>
                {label}
              </div>
              <div className="mt-2 text-2xl font-black sm:text-3xl">{value}</div>
            </div>
          ))}
        </section>

        {queued.length > 0 ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Prontas para virar plano</h2>
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
                    Score {opportunity.priorityScore}/100 · {opportunity.sourceDimensionLabel}
                  </div>
                  <div className="mt-3 text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                    Criar plano 30/60/90 →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
              Nenhuma oportunidade na fila. Abra o ranking, prepare uma hipótese e volte para montar o 30/60/90.
            </p>
            <Link href={`/empresas/${id}/oportunidades`} className="mt-3 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
              Ver oportunidades →
            </Link>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-[16px] font-black">Carteira de execução</h2>
          {plans.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <p className="font-bold">Nenhum plano criado ainda.</p>
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                Marque uma oportunidade como “preparar para plano” e transforme a hipótese em execução.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/empresas/${id}/execucao/${plan.id}`}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black">{plan.title}</div>
                      <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                        {plan.opportunityTitle ?? "Plano independente"}
                      </div>
                      {plan.overdueCount > 0 ? (
                        <div className="mt-2 text-[11px] font-bold text-[#f09a93]">{plan.overdueCount} tarefa(s) atrasada(s)</div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black">{plan.progress}%</div>
                      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>
                        execução
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
