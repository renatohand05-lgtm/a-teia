import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { requireOwnedCompany } from "@/lib/access";
import { getOpportunity } from "@/services/opportunityService";
import { createExecutionPlanAction } from "@/app/empresas/execution-actions";

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

  const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";
  return (
    <AppShell title="Novo plano 30/60/90" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={`/empresas/${id}/execucao`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>← Voltar à execução</Link>
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>Oportunidade de origem</div>
          <h2 className="mt-2 text-xl font-black">{opportunity.title}</h2>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{opportunity.hypothesis ?? opportunity.problemStatement}</p>
          <p className="mt-3 text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>Score {opportunity.priorityScore}/100 · ainda é hipótese até existir evidência real.</p>
        </section>

        <form action={createExecutionPlanAction} className="space-y-4 rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <input type="hidden" name="companyId" value={id} />
          <input type="hidden" name="opportunityId" value={opportunity.id} />
          <label className="block text-[12px] font-bold">Título do plano
            <input name="title" required defaultValue={`Plano 90 dias — ${opportunity.title}`} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="block text-[12px] font-bold">Resumo
            <textarea name="summary" rows={2} defaultValue={opportunity.problemStatement ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="block text-[12px] font-bold">0–30 dias · Corrigir
            <textarea name="goal30" required rows={3} placeholder="Defina dados mínimos, responsável, KPI, limite financeiro e primeiro teste." className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="block text-[12px] font-bold">31–60 dias · Tração
            <textarea name="goal60" required rows={3} placeholder="Ajuste a execução usando os primeiros resultados e avance o KPI." className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="block text-[12px] font-bold">61–90 dias · Escalar
            <textarea name="goal90" required rows={3} placeholder="Escale apenas o que mostrou evidência, preservando caixa e operação." className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
          </label>
          <button type="submit" className="rounded-xl px-5 py-3 text-[13px] font-black" style={{ background: "var(--gold)", color: "#111" }}>Criar plano e iniciar execução</button>
        </form>
      </div>
    </AppShell>
  );
}
