import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { CalculationHelp } from "@/components/ui/CalculationHelp";
import { requireOwnedCompany } from "@/lib/access";
import { decisionStatusLabel, executionStatusLabel } from "@/lib/execution";
import { displayPlanProgress, EXECUTION_HELP, groupExecutionTasks, horizonPhase } from "@/lib/execution-ui";
import { displayEvidence } from "@/lib/opportunity-ui";
import { formatBRL } from "@/lib/format";
import { getExecutionPlan } from "@/services/executionService";
import { changeExecutionTaskStatusAction } from "@/app/empresas/execution-actions";
import { ExecutionFinanceForm } from "@/components/companies/ExecutionFinanceForm";

export const dynamic = "force-dynamic";

const TASK_ACTIONS: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.DONE,
];

export default async function PlanoPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const plan = await getExecutionPlan(userId, id, planId);
  if (!plan) redirect(`/empresas/${id}/execucao`);

  const progress = displayPlanProgress(plan.tasks.map((task) => task.status));
  const groups = groupExecutionTasks(plan.tasks);
  const evidenceLabel = displayEvidence(plan.opportunityEvidenceLevel);

  return (
    <AppShell title="Plano 30/60/90" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href={`/empresas/${id}/execucao`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Carteira de planos 30/60/90
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
                30 corrigir · 60 tração · 90 escalar
              </div>
              <h1 className="mt-2 text-2xl font-black">{plan.title}</h1>
              <dl className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2" style={{ color: "var(--text-2)" }}>
                <Meta label="Objetivo" value={plan.summary || plan.title} />
                <Meta label="Empresa" value={company.name} />
                <Meta label="Origem" value={plan.opportunityTitle ?? "Plano independente"} />
                <Meta label="Horizonte" value={`${plan.horizonDays ?? 90} dias`} />
                <Meta
                  label="Status"
                  value={plan.decisionStatus ? decisionStatusLabel(plan.decisionStatus) : "Em execução"}
                />
                <Meta label="Responsável" value={plan.ownerId === userId ? (name ?? "Conta da empresa") : "Conta da empresa"} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <RiskBadge label="Hipótese em execução" tone="warn" />
                <RiskBadge label={evidenceLabel} tone="warn" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black">{progress.percent != null ? `${progress.percent}%` : "—"}</div>
              <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>
                {progress.label}
              </div>
              {plan.overdueCount > 0 ? (
                <div className="mt-2 text-[11px] font-bold text-[#f09a93]">{plan.overdueCount} atrasada(s)</div>
              ) : null}
            </div>
          </div>
          <CalculationHelp label="Progresso" text={EXECUTION_HELP.progress} />
          {plan.progress === 100 ? (
            <p className="mt-4 text-[12px]" style={{ color: "var(--text-2)" }}>
              Tarefas concluídas. Executamos o plano — isso ainda não prova que a hipótese funcionou.
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Investimento estimado" value={formatBRL(plan.estimatedInvestment)} />
            <Mini label="Retorno estimado" value={formatBRL(plan.expectedMonthlyReturn)} />
            <Mini label="Custo realizado" value={formatBRL(plan.realizedCost)} />
            <Mini label="Retorno realizado" value={formatBRL(plan.realizedReturn)} />
          </div>
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
            Previsto é estimativa. Realizado só aparece se você informar — nunca é copiado do esperado.
          </p>
          <div className="mt-4">
            <ExecutionFinanceForm
              companyId={id}
              planId={plan.id}
              realizedCost={plan.realizedCost}
              realizedReturn={plan.realizedReturn}
            />
          </div>
          <Link
            href={`/empresas/${id}/experimentos/novo?planId=${plan.id}${plan.opportunityId ? `&opportunityId=${plan.opportunityId}` : ""}`}
            className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            Criar experimento
          </Link>
        </section>

        {plan.tasks.length === 0 ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="font-bold">Plano ainda sem tarefas.</p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Sem tarefas não há progresso. Planos novos já nascem com 30, 60 e 90 dias.
            </p>
            {plan.opportunityId ? (
              <Link
                href={`/empresas/${id}/execucao/novo?opportunityId=${plan.opportunityId}`}
                className="mt-3 inline-block text-[12px] font-bold"
                style={{ color: "var(--gold-soft)" }}
              >
                Revisar origem da oportunidade
              </Link>
            ) : (
              <Link href={`/empresas/${id}/oportunidades`} className="mt-3 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                Revisar oportunidades
              </Link>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-[12px] md:grid-cols-4" style={{ color: "var(--text-2)" }}>
              <Count label="Em andamento" value={groups.inProgress.length} />
              <Count label="Atrasadas" value={groups.overdue.length} warn={groups.overdue.length > 0} />
              <Count label="Próximas" value={groups.upcoming.length} />
              <Count label="Concluídas" value={groups.done.length} />
            </div>
            {plan.tasks.map((task, index) => {
              const phase = horizonPhase(index);
              return (
                <div key={task.id} className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <div className="text-[11px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--gold-soft)" }}>
                        {phase.title}
                      </div>
                      <h2 className="mt-1 text-[17px] font-black">{task.title}</h2>
                      <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                        {phase.focus}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6" style={{ color: "var(--text-2)" }}>
                        {task.details}
                      </p>
                      <p className="mt-3 text-[12px]" style={{ color: "var(--text-2)" }}>
                        Quem: {plan.ownerId === userId ? (name ?? "Conta da empresa") : "Conta da empresa"}
                        {task.dueAt
                          ? ` · Quando: ${new Intl.DateTimeFormat("pt-BR").format(new Date(task.dueAt))}`
                          : ""}
                        {` · Status: ${executionStatusLabel(task.status)}`}
                        {task.overdue ? " · Atrasada" : ""}
                      </p>
                    </div>
                    <div className="text-[12px] font-bold">{task.overdue ? "Atrasada" : executionStatusLabel(task.status)}</div>
                  </div>
                  <form action={changeExecutionTaskStatusAction} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="companyId" value={id} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="taskId" value={task.id} />
                    {TASK_ACTIONS.map((status) => (
                      <button
                        key={status}
                        name="status"
                        value={status}
                        type="submit"
                        className="rounded-lg border px-3 py-2 text-[11px] font-bold"
                        style={{
                          borderColor: "var(--border)",
                          color: status === task.status ? "var(--gold-soft)" : "var(--text-2)",
                        }}
                      >
                        {executionStatusLabel(status)}
                      </button>
                    ))}
                  </form>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function Count({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="text-[16px] font-black" style={{ color: warn ? "#f09a93" : undefined }}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-1 text-[13px] font-bold">{value}</div>
    </div>
  );
}
