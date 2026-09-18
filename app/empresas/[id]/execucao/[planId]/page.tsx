import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { requireOwnedCompany } from "@/lib/access";
import { decisionStatusLabel, executionStatusLabel } from "@/lib/execution";
import { EVIDENCE_LABELS } from "@/lib/opportunity-score";
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

  const evidenceLabel = plan.opportunityEvidenceLevel
    ? EVIDENCE_LABELS[plan.opportunityEvidenceLevel] ?? plan.opportunityEvidenceLevel
    : "Hipótese";

  return (
    <AppShell title="Plano de execução" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href={`/empresas/${id}/execucao`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Carteira de execução
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
                90 dias
              </div>
              <h1 className="mt-2 text-2xl font-black">{plan.title}</h1>
              {plan.opportunityTitle ? (
                <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                  Origem: {plan.opportunityTitle}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <RiskBadge label="HIPÓTESE · ação" tone="warn" />
                <RiskBadge label={`Evidência · ${evidenceLabel}`} tone="warn" />
                {plan.decisionStatus ? <RiskBadge label={`Decisão · ${decisionStatusLabel(plan.decisionStatus)}`} /> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black">{plan.progress}%</div>
              <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>
                concluído
              </div>
              {plan.overdueCount > 0 ? (
                <div className="mt-2 text-[11px] font-bold text-[#f09a93]">{plan.overdueCount} atrasada(s)</div>
              ) : null}
            </div>
          </div>
          {plan.summary ? (
            <p className="mt-4 text-[13px] leading-6" style={{ color: "var(--text-2)" }}>
              {plan.summary}
            </p>
          ) : null}
          {plan.progress === 100 ? (
            <p className="mt-4 text-[12px]" style={{ color: "var(--text-2)" }}>
              Resultado da execução: tarefas concluídas. Isso registra o plano como executado — ainda não é evidência validada de causa ou ROI.
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Investimento previsto" value={formatBRL(plan.estimatedInvestment)} />
            <Mini label="Retorno esperado" value={formatBRL(plan.expectedMonthlyReturn)} />
            <Mini label="Custo realizado" value={formatBRL(plan.realizedCost)} />
            <Mini label="Retorno realizado" value={formatBRL(plan.realizedReturn)} />
          </div>
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
            Previsto é HIPÓTESE FINANCEIRA. Realizado só aparece se você informar — nunca é copiado do esperado.
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
            className="mt-4 inline-flex rounded-xl border px-4 py-2.5 text-[13px] font-bold"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Testar este plano com um experimento
          </Link>
        </section>

        <section className="space-y-3">
          {plan.tasks.map((task, index) => (
            <div key={task.id} className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <div className="text-[11px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--gold-soft)" }}>
                    Fase {index + 1}
                  </div>
                  <h2 className="mt-1 text-[17px] font-black">{task.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6" style={{ color: "var(--text-2)" }}>
                    {task.details}
                  </p>
                  {task.dueAt ? (
                    <p className="mt-3 text-[11px]" style={{ color: task.overdue ? "#f09a93" : "var(--text-3)" }}>
                      Prazo: {new Intl.DateTimeFormat("pt-BR").format(new Date(task.dueAt))}
                      {task.overdue ? " · atrasada" : ""}
                    </p>
                  ) : null}
                </div>
                <div className="text-[12px] font-bold">{executionStatusLabel(task.status)}</div>
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
          ))}
        </section>
      </div>
    </AppShell>
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
