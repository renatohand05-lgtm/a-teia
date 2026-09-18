import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ExecutionPlanForm } from "@/components/companies/ExecutionPlanForm";
import { requireOwnedCompany } from "@/lib/access";
import { getOpportunity } from "@/services/opportunityService";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NovoPlanoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ opportunityId?: string }>;
}) {
  const { id } = await params;
  const { opportunityId } = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  if (!opportunityId) redirect(`/empresas/${id}/execucao`);
  const opportunity = await getOpportunity(userId, id, opportunityId);
  if (!opportunity) redirect(`/empresas/${id}/execucao`);

  return (
    <AppShell title="Novo plano 30/60/90" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5 px-1">
        <Link href={`/empresas/${id}/execucao`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Voltar à execução
        </Link>
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
            Oportunidade de origem
          </div>
          <h2 className="mt-2 text-xl font-black">{opportunity.title}</h2>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            {opportunity.hypothesis ?? opportunity.problemStatement}
          </p>
          <p className="mt-3 text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Score {opportunity.priorityScore}/100 · HIPÓTESE — não é evidência validada.
          </p>
        </section>
        <ExecutionPlanForm
          companyId={id}
          opportunityId={opportunity.id}
          defaultTitle={`Plano 90 dias — ${opportunity.title}`}
          defaultSummary={opportunity.problemStatement ?? ""}
        />
      </div>
    </AppShell>
  );
}
