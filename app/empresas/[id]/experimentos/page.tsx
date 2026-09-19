import Link from "next/link";
import { assistantHref } from "@/lib/assistant-ui";
import { contextualAssistantPrompt } from "@/lib/journey-ui";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/States";
import { ExperimentClassBadge, ExperimentStatusBadge } from "@/components/companies/ExperimentStage";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL, formatDateBR } from "@/lib/format";
import { displayRecordCount, experimentNextAction, formatExperimentNumber } from "@/lib/experiment-ui";
import { getExperimentSummary, listExperiments } from "@/services/experimentService";

export const dynamic = "force-dynamic";

export default async function ExperimentosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; classificacao?: string; kpi?: string; oportunidade?: string; ano?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const year = filters.ano ? Number(filters.ano) : undefined;
  const filtered = Boolean(filters.status || filters.classificacao || filters.kpi || filters.oportunidade || filters.ano);
  const [items, summary] = await Promise.all([
    listExperiments(userId, id, {
      status: filters.status ?? "ALL",
      classification: filters.classificacao ?? "ALL",
      kpi: filters.kpi ?? "ALL",
      opportunityId: filters.oportunidade ?? "ALL",
      year: Number.isFinite(year) ? year : undefined,
    }),
    getExperimentSummary(userId, id),
  ]);
  const kpis = [...new Set(items.map((item) => item.kpi).filter(Boolean))] as string[];
  const hasCoverage = summary.total > 0;
  const years = summary.years;

  return (
    <AppShell title="Experimentos" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Central da empresa
          </Link>
          <Link href={assistantHref(id, contextualAssistantPrompt("experimento"))} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Analisar com IA
          </Link>
          <Link href={`/empresas/${id}/experimentos/novo`} className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
            {hasCoverage ? "Novo experimento" : "Criar primeiro experimento"}
          </Link>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Em andamento" value={displayRecordCount(hasCoverage, summary.active)} />
          <Mini label="Concluídos" value={displayRecordCount(hasCoverage, summary.completed)} />
          <Mini label="Meta atingida neste teste" value={displayRecordCount(hasCoverage, summary.validated)} />
          <Mini label="Investimento realizado" value={hasCoverage ? formatBRL(summary.realizedInvestment || null) : "Sem dados"} />
        </section>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Hipótese em teste não é evidência. Meta atingida descreve este teste — não vira aprendizado sozinha.
        </p>

        <form className="flex flex-wrap gap-2 text-[12px]" action={`/empresas/${id}/experimentos`} aria-label="Filtros de experimentos">
          <select name="status" defaultValue={filters.status ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} aria-label="Status">
            <option value="ALL">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="READY">Planejado</option>
            <option value="RUNNING">Em andamento</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select name="ano" defaultValue={filters.ano ?? ""} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} aria-label="Período">
            <option value="">Todos os períodos</option>
            {years.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select name="classificacao" defaultValue={filters.classificacao ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} aria-label="Leitura">
            <option value="ALL">Todas as leituras</option>
            <option value="VALIDATED">Meta atingida</option>
            <option value="PARTIALLY_VALIDATED">Parcial</option>
            <option value="INCONCLUSIVE">Inconclusivo</option>
            <option value="REFUTED">Não melhorou</option>
          </select>
          <select name="kpi" defaultValue={filters.kpi ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} aria-label="KPI">
            <option value="ALL">Todos os KPIs</option>
            {kpis.map((kpi) => (
              <option key={kpi} value={kpi}>{kpi}</option>
            ))}
          </select>
          <button className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>Filtrar</button>
        </form>

        {items.length === 0 ? (
          <EmptyState
            title={filtered ? "Nenhum experimento neste filtro." : "Você ainda não está validando nenhuma hipótese."}
            body={filtered ? "Ajuste o filtro ou crie um novo teste." : "Um experimento criado ou em andamento não prova nada. Só resultado medido gera evidência."}
            action={
              <Link href={`/empresas/${id}/experimentos/novo`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                Criar primeiro experimento
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const next = experimentNextAction({
                status: item.status,
                hasFinalResult: item.finalValue != null,
                hasEvidence: item.evidence.length > 0,
                hasMemory: false,
                companyId: id,
                experimentId: item.id,
              });
              return (
                <Link key={item.id} href={`/empresas/${id}/experimentos/${item.id}`} className="block rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black">{item.title}</div>
                      <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>{item.hypothesis}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ExperimentStatusBadge status={item.status} />
                        <ExperimentClassBadge classification={item.classification} />
                        {item.evidence.length > 0 ? (
                          <span className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase" style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}>
                            Resultado disponível para avaliação
                          </span>
                        ) : null}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3" style={{ color: "var(--text-2)" }}>
                        <Fact label="Empresa" value={company.name} />
                        <Fact label="KPI" value={item.kpi ?? "Não informado"} />
                        <Fact label="Meta" value={formatExperimentNumber(item.target, item.kpiUnit)} />
                        <Fact label="Investimento" value={formatBRL(item.plannedInvestment)} />
                        <Fact label="Início" value={formatDateBR(item.startedAt)} />
                        <Fact label="Término previsto" value={formatDateBR(item.plannedEndAt)} />
                        <Fact label="Responsável" value={item.createdByName ?? "Conta da empresa"} />
                        <Fact label="Resultado" value={item.finalValue != null ? formatExperimentNumber(item.finalValue, item.kpiUnit) : "Ainda não medido"} />
                        <Fact label="Próximo passo" value={next.label} />
                      </dl>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd>{value}</dd>
    </div>
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
