import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approveStrategyAction,
  convertStrategyAction,
  rejectStrategyAction,
  reviewStrategyAction,
} from "@/app/conexoes/actions";
import { ConfirmForm } from "@/components/connections/ConfirmForm";
import { AppShell } from "@/components/layout/AppShell";
import { connectionClassLabel } from "@/lib/connection-engine";
import { formatBRL } from "@/lib/format";
import { STRATEGY_EFFORT_LABELS, STRATEGY_RISK_LABELS, strategyStatusLabel } from "@/lib/strategy-engine";
import { playbookEligibilityFromStrategy } from "@/lib/playbook-engine";
import { getStrategy, previewStrategyOpportunity } from "@/services/strategyService";
import { getPlaybookForStrategy } from "@/services/playbookService";
import { createPlaybookFromStrategyAction } from "@/app/playbooks/actions";

export const dynamic = "force-dynamic";

export default async function StrategyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ converter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const query = (await searchParams) ?? {};
  let strategy;
  try {
    strategy = await getStrategy(session.user.id, id);
  } catch {
    notFound();
  }
  const review = previewStrategyOpportunity(strategy);
  const converting = query.converter === "1";
  const relatedPlaybook = await getPlaybookForStrategy(session.user.id, strategy.id);
  const playbookEligible = playbookEligibilityFromStrategy({
    status: strategy.status,
    evidenceCount: strategy.evidenceIds.length,
  });

  return (
    <AppShell title="Estratégia cruzada" subtitle={`${strategy.originName} → ${strategy.destinationName ?? "Portfólio"}`} userName={session.user.name}>
      <div className="mx-auto max-w-[880px] space-y-5">
        <section className="surface-card p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--gold-soft)" }}>{strategyStatusLabel(strategy.status)}</p>
          <h1 className="mt-2 text-[24px] font-extrabold">{strategy.title}</h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            Origem da recomendação: {connectionClassLabel(strategy.recommendationOrigin)}. Não é evidência do destino.
          </p>
        </section>
        <section className="surface-card grid gap-3 p-5 text-[13px] sm:grid-cols-2" style={{ color: "var(--text-2)" }}>
          <p><b>Problema:</b> {strategy.problem || "Sem dados"}</p>
          <p><b>Hipótese:</b> {strategy.hypothesis || "Sem dados"}</p>
          <p><b>Público:</b> {strategy.audience || "Sem dados"}</p>
          <p><b>Proposta de valor:</b> {strategy.valueProposition || "Sem dados"}</p>
          <p><b>KPI principal:</b> {strategy.primaryKpi || "Sem dados"}</p>
          <p><b>KPI secundário:</b> {strategy.secondaryKpi || "Sem dados"}</p>
          <p><b>Investimento:</b> {strategy.estimatedInvestment == null ? "Sem dados" : formatBRL(strategy.estimatedInvestment)}</p>
          <p><b>Esforço:</b> {STRATEGY_EFFORT_LABELS[strategy.effort]}</p>
          <p><b>Prazo de teste:</b> {strategy.testHorizonDays == null ? "Sem dados" : `${strategy.testHorizonDays} dias`}</p>
          <p><b>Risco:</b> {STRATEGY_RISK_LABELS[strategy.risk]}</p>
        </section>
        <section className="surface-card p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>Playbook relacionado</p>
          {relatedPlaybook ? (
            <>
              <Link href={`/playbooks/${relatedPlaybook.id}`} className="mt-2 inline-flex font-bold" style={{ color: "var(--gold-soft)" }}>
                {relatedPlaybook.title}
              </Link>
              {relatedPlaybook.multiContextNote ? (
                <p className="mt-2">{relatedPlaybook.multiContextNote}</p>
              ) : null}
            </>
          ) : playbookEligible.eligible ? (
            <p className="mt-2">Há resultado medido na origem. Criar playbook nasce como rascunho — a IA não valida.</p>
          ) : (
            <p className="mt-2">Strategy sem resultado medido não vira playbook validado. {playbookEligible.reasons.join(" · ")}</p>
          )}
        </section>

        {converting ? (
          <section className="surface-card p-5">
            <h2 className="m-0 text-[16px] font-bold">Revisão antes de criar oportunidade</h2>
            <ul className="mt-3 space-y-1 text-[13px]" style={{ color: "var(--text-2)" }}>
              <li>Problema: {review.problem}</li>
              <li>Hipótese: {review.hypothesis}</li>
              <li>KPI: {review.kpi}</li>
              <li>Investimento: {review.investment === "Sem dados" ? "Sem dados" : formatBRL(Number(review.investment))}</li>
              <li>Risco: {review.risk}</li>
              <li>Evidência existente: {review.evidence}</li>
              <li>Dados ausentes: {review.missing.length ? review.missing.join(", ") : "nenhum crítico"}</li>
            </ul>
            <div className="mt-4">
              <ConfirmForm
                action={convertStrategyAction}
                hidden={{ strategyId: strategy.id }}
                label="Confirmar criação"
                message="Criar a oportunidade no destino? Ela nascerá como hipótese e não copiará evidência da origem."
              />
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <form action={reviewStrategyAction.bind(null, strategy.id)}>
            <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Revisar</button>
          </form>
          <ConfirmForm action={approveStrategyAction} hidden={{ strategyId: strategy.id }} label="Aprovar" message="Aprovar esta estratégia? A IA não executa e não move dinheiro." />
          <ConfirmForm action={rejectStrategyAction} hidden={{ strategyId: strategy.id }} label="Rejeitar" message="Rejeitar esta estratégia?" tone="danger" />
          {!strategy.opportunityId ? (
            <Link href={`/estrategias/${strategy.id}?converter=1`} className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
              Transformar em oportunidade
            </Link>
          ) : (
            <Link href={`/empresas/${strategy.destinationCompanyId ?? strategy.companyId}/oportunidades/${strategy.opportunityId}`} className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
              Ver oportunidade
            </Link>
          )}
          {!relatedPlaybook && playbookEligible.eligible ? (
            <ConfirmForm action={createPlaybookFromStrategyAction} hidden={{ strategyId: strategy.id }} label="Criar playbook" message="Criar playbook a partir desta estratégia? Ele nascerá como rascunho, não validado pela IA." />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
