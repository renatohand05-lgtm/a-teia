import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryCard } from "@/components/companies/MemoryCard";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import { listCompanies } from "@/services/companyService";
import { listOwnerMemories } from "@/services/memoryService";

export const dynamic = "force-dynamic";

export default async function MemoriaGlobalPage({
  searchParams,
}: {
  searchParams: Promise<{
    empresa?: string;
    segmento?: string;
    familia?: string;
    kpi?: string;
    classificacao?: string;
    confianca?: string;
    resultado?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const filters = await searchParams;
  const [companies, items] = await Promise.all([
    listCompanies(session.user.id, true),
    listOwnerMemories(session.user.id, {
      companyId: filters.empresa && filters.empresa !== "ALL" ? filters.empresa : undefined,
      segment: filters.segmento,
      family: filters.familia,
      kpi: filters.kpi,
      classification: filters.classificacao,
      confidence: filters.confianca,
      polarity: filters.resultado,
    }),
  ]);
  const kpis = [...new Set(items.map((item) => item.kpi).filter(Boolean))] as string[];
  const segments = [...new Set(companies.map((item) => item.segment).filter(Boolean))] as string[];

  return (
    <AppShell title="Memória transversal" subtitle="Aprendizados das suas empresas" userName={session.user.name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          Memória não é verdade universal. Sucesso em uma empresa não significa automaticamente sucesso em outra.
        </p>
        <form className="flex flex-wrap gap-2 text-[12px]" action="/memoria">
          <select name="empresa" defaultValue={filters.empresa ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todas as empresas</option>
            {companies.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select name="segmento" defaultValue={filters.segmento ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="ALL">Todos os segmentos</option>
            {segments.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
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
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Os aprendizados validados da sua operação aparecerão aqui.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <MemoryCard
                key={item.id}
                href={item.companyId ? `/empresas/${item.companyId}/memoria/${item.id}` : "/memoria"}
                item={item}
                extra={item.segment ?? undefined}
                sameCompany={false}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
