import Link from "next/link";
import {
  PLAYBOOK_FAMILIES,
  PLAYBOOK_STATUSES,
  VALIDATED_PLAYBOOK_COPY,
  playbookFamilyLabel,
  playbookStatusLabel,
} from "@/lib/playbook-engine";
import type { PlaybookDTO } from "@/services/playbookService";

type Kpis = {
  playbooks: number;
  validated: number;
  review: number;
  originCompanies: number;
  families: number;
  testing: number;
};

export function PlaybookLibrary({
  playbooks,
  kpis,
  page,
  pages,
  total,
  companies,
  filters,
}: {
  playbooks: PlaybookDTO[];
  kpis: Kpis;
  page: number;
  pages: number;
  total: number;
  companies: Array<{ id: string; name: string; segment: string | null }>;
  filters: Record<string, string | undefined>;
}) {
  const segments = [...new Set(companies.map((item) => item.segment).filter(Boolean))] as string[];
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--gold-soft)" }}>
          Playbooks
        </p>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">Biblioteca de playbooks</h1>
        <p className="max-w-[720px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Aprendizados estruturados para reutilizar o que já foi testado — sem transformar experiência em certeza.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Playbooks" value={kpis.playbooks} />
        <Kpi label="Validados" value={kpis.validated} />
        <Kpi label="Em revisão" value={kpis.review} />
        <Kpi label="Empresas de origem" value={kpis.originCompanies} />
        <Kpi label="Famílias estratégicas" value={kpis.families} />
        <Kpi label="Reutilizações em teste" value={kpis.testing} />
      </div>

      <form className="flex flex-wrap gap-2 text-[12px]" action="/playbooks">
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
          {PLAYBOOK_FAMILIES.map((item) => (
            <option key={item} value={item}>{playbookFamilyLabel(item)}</option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Todos os status</option>
          {PLAYBOOK_STATUSES.map((item) => (
            <option key={item} value={item}>{playbookStatusLabel(item)}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)" }}>
          Filtrar
        </button>
      </form>

      {!playbooks.length ? (
        <div className="surface-card p-6">
          <p className="font-bold">Nenhum playbook ainda</p>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            Playbook nasce de aprendizado com evidência. Ele registra o que foi feito — não garante resultado em outra empresa.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
            <table className="w-full min-w-[880px] text-left text-[13px]">
              <thead style={{ color: "var(--text-3)" }}>
                <tr className="text-[10px] uppercase tracking-[0.08em]">
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Família</th>
                  <th className="px-3 py-3">Origem</th>
                  <th className="px-3 py-3">Segmento</th>
                  <th className="px-3 py-3">KPI</th>
                  <th className="px-3 py-3">Resultado</th>
                  <th className="px-3 py-3">Confiança</th>
                  <th className="px-3 py-3">Aplicações</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {playbooks.map((item) => (
                  <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-3">
                      <Link href={`/playbooks/${item.id}`} className="font-bold" style={{ color: "var(--gold-soft)" }}>
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{playbookFamilyLabel(item.family)}</td>
                    <td className="px-3 py-3">{item.originCompanyName}</td>
                    <td className="px-3 py-3">{item.originSegment || "Sem dados"}</td>
                    <td className="px-3 py-3">{item.primaryKpi || "Sem dados"}</td>
                    <td className="px-3 py-3">{item.observedResult == null ? "Sem dados" : String(item.observedResult)}</td>
                    <td className="px-3 py-3">{item.confidence == null ? "Sem dados" : item.confidence}</td>
                    <td className="px-3 py-3">{item.applicationCount}</td>
                    <td className="px-3 py-3">{playbookStatusLabel(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {playbooks.map((item) => (
              <Link key={item.id} href={`/playbooks/${item.id}`} className="surface-card block p-4">
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                  {playbookFamilyLabel(item.family)} · {item.originCompanyName} · {playbookStatusLabel(item.status)}
                </p>
                <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                  {item.primaryKpi || "KPI não informado"} · {item.observedResult == null ? "resultado não medido neste registro" : item.observedResult}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {pages > 1 ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Página {page} de {pages} · {total} playbooks.{" "}
          {page < pages ? (
            <Link href={`/playbooks?pagina=${page + 1}`} style={{ color: "var(--gold-soft)" }}>Próxima</Link>
          ) : null}
        </p>
      ) : null}

      <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{VALIDATED_PLAYBOOK_COPY}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="mt-1 text-[22px] font-black tabular-nums">{value}</p>
    </div>
  );
}
