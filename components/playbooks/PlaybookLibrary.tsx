import Link from "next/link";
import {
  PLAYBOOK_EMPTY,
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

const MATURITIES = ["SEM_MEDICAO", "EXPERIMENTAL", "REPLICADO", "MULTICONTEXTO"] as const;

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
  const kpisList = [...new Set(playbooks.map((item) => item.primaryKpi).filter(Boolean))] as string[];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "pagina") query.set(key, value);
  }
  const suffix = query.toString();
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

      <form className="flex flex-wrap gap-2 text-[12px]" action="/playbooks" aria-label="Filtros da biblioteca de playbooks">
        <select name="empresa" defaultValue={filters.empresa ?? "ALL"} aria-label="Empresa origem" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Empresa origem</option>
          {companies.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select name="segmento" defaultValue={filters.segmento ?? "ALL"} aria-label="Segmento origem" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Segmento origem</option>
          {segments.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select name="familia" defaultValue={filters.familia ?? "ALL"} aria-label="Família" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Família</option>
          {PLAYBOOK_FAMILIES.map((item) => (
            <option key={item} value={item}>{playbookFamilyLabel(item)}</option>
          ))}
        </select>
        <select name="kpi" defaultValue={filters.kpi ?? "ALL"} aria-label="KPI" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">KPI</option>
          {kpisList.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select name="maturidade" defaultValue={filters.maturidade ?? "ALL"} aria-label="Maturidade" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Maturidade</option>
          {MATURITIES.map((item) => (
            <option key={item} value={item}>{item.replace("_", " ")}</option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? "ALL"} aria-label="Status" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Status</option>
          {PLAYBOOK_STATUSES.map((item) => (
            <option key={item} value={item}>{playbookStatusLabel(item)}</option>
          ))}
        </select>
        <select name="aplicacoes" defaultValue={filters.aplicacoes ?? "ALL"} aria-label="Aplicações" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Aplicações</option>
          <option value="com">Com aplicações</option>
          <option value="sem">Sem aplicações</option>
        </select>
        <select name="empresas" defaultValue={filters.empresas ?? "ALL"} aria-label="Empresas testadas" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Empresas</option>
          <option value="2+">2+ empresas</option>
        </select>
        <select name="segmentos" defaultValue={filters.segmentos ?? "ALL"} aria-label="Segmentos testados" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Segmentos</option>
          <option value="2+">2+ segmentos</option>
        </select>
        <select name="ordem" defaultValue={filters.ordem ?? "recentes"} aria-label="Ordenação" className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="recentes">Recentes</option>
          <option value="aplicados">Mais aplicados</option>
          <option value="cobertura">Maior cobertura</option>
          <option value="diversidade">Maior diversidade</option>
        </select>
        <button type="submit" className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)" }}>
          Filtrar
        </button>
      </form>

      {!playbooks.length ? (
        <div className="surface-card p-6">
          <p className="font-bold">{PLAYBOOK_EMPTY.title}</p>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            Playbook nasce de aprendizado com evidência. Ele registra o que foi feito — não garante resultado em outra empresa.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-left text-[13px]">
              <thead style={{ color: "var(--text-3)" }}>
                <tr className="text-[10px] uppercase tracking-[0.08em]">
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">Família</th>
                  <th className="px-3 py-3">Origem</th>
                  <th className="px-3 py-3">KPI</th>
                  <th className="px-3 py-3">Maturidade</th>
                  <th className="px-3 py-3">Aplicações</th>
                  <th className="px-3 py-3">Empresas</th>
                  <th className="px-3 py-3">Segmentos</th>
                  <th className="px-3 py-3">Atualização</th>
                  <th className="px-3 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {playbooks.map((item) => (
                  <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-3">
                      <Link href={`/playbooks/${item.id}`} className="font-bold" style={{ color: "var(--gold-soft)" }}>{item.title}</Link>
                    </td>
                    <td className="px-3 py-3">{playbookFamilyLabel(item.family)}</td>
                    <td className="px-3 py-3">{item.originCompanyName}</td>
                    <td className="px-3 py-3">{item.primaryKpi || "Sem dados"}</td>
                    <td className="px-3 py-3">{item.maturity.replace("_", " ")}</td>
                    <td className="px-3 py-3">{item.applicationCount}</td>
                    <td className="px-3 py-3">{item.testedCompanies}</td>
                    <td className="px-3 py-3">{item.testedSegments}</td>
                    <td className="px-3 py-3">{item.updatedAt.slice(0, 10)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/playbooks/${item.id}`} className="font-bold" style={{ color: "var(--gold-soft)" }}>Abrir</Link>
                        <Link href={`/playbooks/${item.id}?aplicar=1`}>Testar em empresa</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {playbooks.map((item) => (
              <article key={item.id} className="surface-card p-4">
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                  {playbookFamilyLabel(item.family)} · {item.originCompanyName} · {item.maturity.replace("_", " ")}
                </p>
                <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                  {item.primaryKpi || "KPI não informado"} · {item.applicationCount} aplicações · {item.testedCompanies} empresas · {item.testedSegments} segmentos
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/playbooks/${item.id}`} className="rounded-lg border px-3 py-1 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}>Abrir</Link>
                  <Link href={`/playbooks/${item.id}?aplicar=1`} className="rounded-lg border px-3 py-1 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Testar em empresa</Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {pages > 1 ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Página {page} de {pages} · {total} playbooks.{" "}
          {page < pages ? (
            <Link href={`/playbooks?${suffix}${suffix ? "&" : ""}pagina=${page + 1}`} style={{ color: "var(--gold-soft)" }}>Próxima</Link>
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
