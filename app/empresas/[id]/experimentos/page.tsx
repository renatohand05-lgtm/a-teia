import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ExperimentClassBadge, ExperimentStatusBadge } from "@/components/companies/ExperimentStage";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL, formatPercent } from "@/lib/format";
import { getExperimentSummary, listExperiments } from "@/services/experimentService";

export const dynamic = "force-dynamic";

export default async function ExperimentosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; classificacao?: string; kpi?: string; oportunidade?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const [items, summary] = await Promise.all([
    listExperiments(userId, id, {
      status: filters.status ?? "ALL",
      classification: filters.classificacao ?? "ALL",
      kpi: filters.kpi ?? "ALL",
      opportunityId: filters.oportunidade ?? "ALL",
    }),
    getExperimentSummary(userId, id),
  ]);
  const kpis = [...new Set(items.map((item) => item.kpi).filter(Boolean))] as string[];

  return (
    <AppShell title="Experimentos" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Central da empresa
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href={`/empresas/${id}/experimentos?status=COMPLETED`} className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              Evidências
            </Link>
            <Link href={`/empresas/${id}/experimentos/novo`} className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
              Novo experimento
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Mini label="Ativos" value={String(summary.active)} />
          <Mini label="Concluídos" value={String(summary.completed)} />
          <Mini label="Validados" value={String(summary.validated)} />
          <Mini label="Parciais" value={String(summary.partial)} />
          <Mini label="Inconclusivos" value={String(summary.inconclusive)} />
          <Mini label="Refutados" value={String(summary.refuted)} />
          <Mini label="Investimento realizado" value={formatBRL(summary.realizedInvestment || null)} />
          <Mini label="ROI real" value={summary.roi != null ? formatPercent(summary.roi) : "Sem realizado"} />
        </section>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Retorno realizado: {formatBRL(summary.realizedReturn || null)}. Esperado não entra nesta conta.
        </p>

        <form className="flex flex-wrap gap-2 text-[12px]" action={`/empresas/${id}/experimentos`}>
          <select name="status" defaultValue={filters.status ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="READY">Pronto</option>
            <option value="RUNNING">Em teste</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select name="classificacao" defaultValue={filters.classificacao ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todas as classificações</option>
            <option value="VALIDATED">Validado</option>
            <option value="PARTIALLY_VALIDATED">Parcialmente validado</option>
            <option value="INCONCLUSIVE">Inconclusivo</option>
            <option value="REFUTED">Refutado</option>
          </select>
          <select name="kpi" defaultValue={filters.kpi ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todos os KPIs</option>
            {kpis.map((kpi) => (
              <option key={kpi} value={kpi}>{kpi}</option>
            ))}
          </select>
          <button className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>Filtrar</button>
        </form>

        {items.length === 0 ? (
          <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)" }}>
            <p className="font-bold">Nenhum experimento neste filtro.</p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Hipótese sem medição não é evidência. Crie um teste a partir de uma oportunidade ou plano.
            </p>
            <Link href={`/empresas/${id}/experimentos/novo`} className="mt-3 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
              Novo experimento →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link key={item.id} href={`/empresas/${id}/experimentos/${item.id}`} className="block rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black">{item.title}</div>
                    <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                      {item.hypothesis}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ExperimentStatusBadge status={item.status} />
                      <ExperimentClassBadge classification={item.classification} />
                      {item.evidence.length > 0 ? (
                        <span className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase" style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}>
                          Evidência rastreável
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
                      KPI {item.kpi ?? "—"} · Baseline {item.baseline ?? "não informado"} · Meta {item.target ?? "não informada"} · Atual {item.latestMeasurement ?? item.finalValue ?? "—"}
                      {item.opportunityTitle ? ` · ${item.opportunityTitle}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-[12px]" style={{ color: "var(--text-3)" }}>
                    {item.plannedEndAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(item.plannedEndAt)) : "Sem prazo"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-[10px] uppercase tracking-[.12em]" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-2 text-[16px] font-black">{value}</div>
    </div>
  );
}
