import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryCard } from "@/components/companies/MemoryCard";
import { requireOwnedCompany } from "@/lib/access";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import { detectConflictingMemories } from "@/lib/memory-engine";
import { getMemorySummary, listCompanyMemories } from "@/services/memoryService";

export const dynamic = "force-dynamic";

export default async function EmpresaMemoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origem?: string; familia?: string; kpi?: string; classificacao?: string; confianca?: string; resultado?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const [items, summary] = await Promise.all([
    listCompanyMemories(userId, id, {
      origin: filters.origem,
      family: filters.familia,
      kpi: filters.kpi,
      classification: filters.classificacao,
      confidence: filters.confianca,
      polarity: filters.resultado,
    }),
    getMemorySummary(userId, id),
  ]);
  const kpis = [...new Set(items.map((item) => item.kpi).filter(Boolean))] as string[];
  const conflicts = detectConflictingMemories(items);

  return (
    <AppShell title="Memória estratégica" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Central da empresa
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href={`/memoria`} className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              Visão multiempresa
            </Link>
            <Link href={`/empresas/${id}/memoria/nova`} className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
              Registrar observação
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Mini label="Validados" value={String(summary.validated)} />
          <Mini label="Observações" value={String(summary.observations)} />
          <Mini label="Funcionou" value={String(summary.positive)} />
          <Mini label="Não funcionou" value={String(summary.negative)} />
          <Mini label="Inconclusivos" value={String(summary.inconclusive)} />
          <Mini label="Propostas" value={String(summary.proposed)} />
          <Mini label="Aprovados" value={String(summary.approved)} />
          <Mini label="Divergências" value={String(summary.conflicting)} />
        </section>

        {conflicts.length > 0 ? (
          <p className="rounded-xl border px-4 py-3 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            Evidências divergentes preservadas: {conflicts.length} par(es). Um aprendizado não sobrescreve o outro.
          </p>
        ) : null}

        <form className="flex flex-wrap gap-2 text-[12px]" action={`/empresas/${id}/memoria`}>
          <select name="origem" defaultValue={filters.origem ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todas as origens</option>
            <option value="EXPERIMENT_EVIDENCE">Evidência de experimento</option>
            <option value="OBSERVATION">Observação</option>
            <option value="MANUAL_LESSON">Lição manual</option>
          </select>
          <select name="familia" defaultValue={filters.familia ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todas as famílias</option>
            {DIAGNOSTIC_DIMENSIONS.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
          <select name="kpi" defaultValue={filters.kpi ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todos os KPIs</option>
            {kpis.map((kpi) => (
              <option key={kpi} value={kpi}>{kpi}</option>
            ))}
          </select>
          <select name="classificacao" defaultValue={filters.classificacao ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todas as classificações</option>
            <option value="VALIDATED">Validado</option>
            <option value="PARTIALLY_VALIDATED">Parcial</option>
            <option value="INCONCLUSIVE">Inconclusivo</option>
            <option value="REFUTED">Refutado</option>
          </select>
          <select name="confianca" defaultValue={filters.confianca ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Toda confiança</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
          </select>
          <select name="resultado" defaultValue={filters.resultado ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todos os resultados</option>
            <option value="POSITIVE">Funcionou</option>
            <option value="NEGATIVE">Não funcionou</option>
            <option value="INCONCLUSIVE">Inconclusivo</option>
          </select>
          <button className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>Filtrar</button>
        </form>

        {items.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Nenhuma memória neste filtro. Transforme uma evidência em aprendizado ou registre uma observação.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <MemoryCard key={item.id} href={`/empresas/${id}/memoria/${item.id}`} item={item} />
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
