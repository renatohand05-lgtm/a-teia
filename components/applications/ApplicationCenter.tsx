import Link from "next/link";
import { ApplicationSearch } from "@/components/applications/ApplicationSearch";
import {
  APPLICATION_EMPTY,
  APPLICATION_STATUS_LABELS,
  applicationDaysLeft,
  applicationStatusLabel,
  displayCenterKpi,
  evidenceSummaryLabel,
  experimentSummaryLabel,
  getApplicationNextAction,
  pageHref,
  resultSummaryLabel,
} from "@/lib/application-center";
import { TRANSFER_STATUSES } from "@/lib/playbook-transfer-engine";
import type { ApplicationListRow } from "@/lib/application-center";

type Kpis = {
  active: number | null;
  awaitingDecision: number | null;
  inExperiment: number | null;
  pendingResults: number | null;
  completed: number | null;
  insufficient: number | null;
};

export function ApplicationCenter({
  items,
  kpis,
  hasCoverage,
  page,
  pages,
  total,
  companies,
  playbooks,
  filters,
}: {
  items: ApplicationListRow[];
  kpis: Kpis;
  hasCoverage: boolean;
  page: number;
  pages: number;
  total: number;
  companies: Array<{ id: string; name: string; segment: string | null }>;
  playbooks: Array<{ id: string; title: string }>;
  filters: Record<string, string | undefined>;
}) {
  const segments = [...new Set(companies.map((item) => item.segment).filter(Boolean))] as string[];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "pagina") query.set(key, value);
  }
  const suffix = query.toString();

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--gold-soft)" }}>
          Aplicações
        </p>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">Central de aplicações</h1>
        <p className="max-w-[760px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          O que estamos tentando replicar, onde, em qual estágio e o que precisa acontecer agora.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Aplicações ativas" value={displayCenterKpi(kpis.active, hasCoverage)} />
        <Kpi label="Aguardando decisão" value={displayCenterKpi(kpis.awaitingDecision, hasCoverage)} />
        <Kpi label="Em experimento" value={displayCenterKpi(kpis.inExperiment, hasCoverage)} />
        <Kpi label="Resultados pendentes" value={displayCenterKpi(kpis.pendingResults, hasCoverage)} />
        <Kpi label="Concluídas" value={displayCenterKpi(kpis.completed, hasCoverage)} />
        <Kpi label="Dados insuficientes" value={displayCenterKpi(kpis.insufficient, hasCoverage)} />
      </div>

      <form className="flex flex-wrap gap-2 text-[12px]" action="/aplicacoes" aria-label="Filtros da central de aplicações">
        <ApplicationSearch defaultValue={filters.q} />
        <Select name="origem" value={filters.origem} label="Empresa origem" options={companies.map((item) => ({ value: item.id, label: item.name }))} />
        <Select name="destino" value={filters.destino} label="Empresa destino" options={companies.map((item) => ({ value: item.id, label: item.name }))} />
        <Select name="playbook" value={filters.playbook} label="Playbook" options={playbooks.map((item) => ({ value: item.id, label: item.title }))} />
        <Select name="segmento" value={filters.segmento} label="Segmento" options={segments.map((item) => ({ value: item, label: item }))} />
        <Select name="status" value={filters.status} label="Status" options={TRANSFER_STATUSES.map((item) => ({ value: item, label: APPLICATION_STATUS_LABELS[item] }))} />
        <Select
          name="compat"
          value={filters.compat}
          label="Compatibilidade"
          options={[
            { value: "parcial", label: "Parcial" },
            { value: "completa", label: "Completa" },
            { value: "alta", label: "Alta" },
            { value: "baixa", label: "Baixa" },
          ]}
        />
        <Select
          name="resultado"
          value={filters.resultado}
          label="Resultado"
          options={[
            { value: "pendente", label: "Pendente" },
            { value: "positivo", label: "Positivo" },
            { value: "negativo", label: "Negativo" },
            { value: "inconclusivo", label: "Inconclusivo" },
          ]}
        />
        <Select
          name="evidencia"
          value={filters.evidencia}
          label="Evidência"
          options={[
            { value: "local", label: "Local" },
            { value: "nenhuma", label: "Nenhuma" },
          ]}
        />
        <Select
          name="periodo"
          value={filters.periodo}
          label="Período"
          options={[
            { value: "30", label: "30 dias" },
            { value: "90", label: "90 dias" },
            { value: "365", label: "12 meses" },
          ]}
        />
        <Select
          name="ordem"
          value={filters.ordem}
          label="Ordenação"
          options={[
            { value: "recentes", label: "Mais recentes" },
            { value: "antigas", label: "Mais antigas" },
            { value: "compat_desc", label: "Maior compatibilidade" },
            { value: "compat_asc", label: "Menor compatibilidade" },
            { value: "prazo", label: "Prazo mais próximo" },
            { value: "acao", label: "Aguardando ação" },
          ]}
        />
        <button type="submit" className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)" }}>
          Filtrar
        </button>
      </form>

      {!items.length ? (
        <div className="surface-card p-6">
          <p className="font-bold">{APPLICATION_EMPTY.list}</p>
          <Link href="/playbooks" className="mt-3 inline-flex text-[13px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Abrir Playbooks
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
            <table className="w-full table-fixed text-left text-[13px]">
              <thead style={{ color: "var(--text-3)" }}>
                <tr className="text-[10px] uppercase tracking-[0.08em]">
                  <th className="px-3 py-3">Playbook</th>
                  <th className="px-3 py-3">Origem</th>
                  <th className="px-3 py-3">Destino</th>
                  <th className="hidden px-3 py-3 xl:table-cell">Compatibilidade</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="hidden px-3 py-3 xl:table-cell">KPI</th>
                  <th className="hidden px-3 py-3 xl:table-cell">Prazo</th>
                  <th className="hidden px-3 py-3 2xl:table-cell">Experimento</th>
                  <th className="hidden px-3 py-3 2xl:table-cell">Resultado</th>
                  <th className="hidden px-3 py-3 2xl:table-cell">Evidência</th>
                  <th className="hidden px-3 py-3 xl:table-cell">Responsável</th>
                  <th className="px-3 py-3">Próxima ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const next = getApplicationNextAction(item);
                  return (
                    <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-3">
                        <Link href={`/aplicacoes/${item.id}`} className="font-bold" style={{ color: "var(--gold-soft)" }}>
                          {item.playbookTitle}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{item.originCompanyName}</td>
                      <td className="px-3 py-3">
                        {item.destinationName}
                        <span className="block text-[11px]" style={{ color: "var(--text-3)" }}>{item.destinationSegment || "Sem dados"}</span>
                      </td>
                      <td className="hidden px-3 py-3 xl:table-cell">{item.compatibilityScore == null ? "Sem dados" : `${item.compatibilityScore}/100${item.scorePartial ? " parcial" : ""}`}</td>
                      <td className="px-3 py-3">{applicationStatusLabel(item.status)}</td>
                      <td className="hidden px-3 py-3 xl:table-cell">{item.kpi || "Sem dados"}</td>
                      <td className="hidden px-3 py-3 xl:table-cell">{applicationDaysLeft(item.horizonDays, item.experimentStartedAt)}</td>
                      <td className="hidden px-3 py-3 2xl:table-cell">{experimentSummaryLabel(item)}</td>
                      <td className="hidden px-3 py-3 2xl:table-cell">{resultSummaryLabel(item)}</td>
                      <td className="hidden px-3 py-3 2xl:table-cell">{evidenceSummaryLabel(item)}</td>
                      <td className="hidden px-3 py-3 xl:table-cell">{item.ownerName || "Sem dados"}</td>
                      <td className="px-3 py-3">{next.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {items.map((item) => {
              const next = getApplicationNextAction(item);
              return (
                <Link key={item.id} href={`/aplicacoes/${item.id}`} className="surface-card block p-4">
                  <p className="font-bold">{item.playbookTitle}</p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                    {item.originCompanyName} → {item.destinationName}
                  </p>
                  <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                    {applicationStatusLabel(item.status)} · {item.compatibilityScore == null ? "Sem dados" : `${item.compatibilityScore}/100`}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                    KPI {item.kpi || "sem dados"} · {applicationDaysLeft(item.horizonDays, item.experimentStartedAt)} · {item.ownerName || "Sem responsável"}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                    {experimentSummaryLabel(item)} · {resultSummaryLabel(item)} · {evidenceSummaryLabel(item)}
                  </p>
                  <p className="mt-2 text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>{next.label}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {pages > 1 ? (
        <nav className="flex flex-wrap items-center gap-3 text-[12px]" aria-label="Paginação de aplicações" style={{ color: "var(--text-3)" }}>
          <span>Página {page} de {pages} · {total} aplicações.</span>
          {page > 1 ? (
            <Link href={pageHref("/aplicacoes", suffix, page - 1)} style={{ color: "var(--gold-soft)" }}>Anterior</Link>
          ) : null}
          {page < pages ? (
            <Link href={pageHref("/aplicacoes", suffix, page + 1)} style={{ color: "var(--gold-soft)" }}>Próxima</Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="mt-1 text-[22px] font-black tabular-nums">{value}</p>
    </div>
  );
}

function Select({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value?: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value ?? "ALL"} aria-label={label} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
        <option value="ALL">{label}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}
