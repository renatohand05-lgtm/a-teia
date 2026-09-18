import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ExperimentForm } from "@/components/companies/ExperimentForm";
import { requireOwnedCompany } from "@/lib/access";
import { getOpportunity } from "@/services/opportunityService";
import { getExecutionPlan } from "@/services/executionService";

export const dynamic = "force-dynamic";

export default async function NovoExperimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ opportunityId?: string; planId?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const opportunity = query.opportunityId ? await getOpportunity(userId, id, query.opportunityId) : null;
  const plan = query.planId ? await getExecutionPlan(userId, id, query.planId) : null;

  return (
    <AppShell title="Novo experimento" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={`/empresas/${id}/experimentos`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Carteira de experimentos
        </Link>
        {opportunity ? (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Origem: oportunidade <b style={{ color: "var(--text-1)" }}>{opportunity.title}</b>. Continua sendo hipótese até existir evidência medida.
          </p>
        ) : null}
        {plan ? (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Origem: plano 30/60/90 <b style={{ color: "var(--text-1)" }}>{plan.title}</b>.
          </p>
        ) : null}
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <ExperimentForm
            companyId={id}
            opportunityId={opportunity?.id}
            actionPlanId={plan?.id}
            defaultTitle={opportunity ? `Teste · ${opportunity.title}` : plan ? `Teste · ${plan.title}` : undefined}
            defaultHypothesis={opportunity?.hypothesis ?? plan?.summary ?? undefined}
          />
        </section>
      </div>
    </AppShell>
  );
}
