import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OpportunityRanking } from "@/components/companies/OpportunityRanking";
import { requireOwnedCompany } from "@/lib/access";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import { opportunityStatusSchema } from "@/lib/validations";
import { listOpportunities } from "@/services/opportunityService";
import type { OpportunityOrigin, OpportunityStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    dimensao?: string;
    origem?: string;
    financeiro?: string;
    score?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const minScore = query.score ? Number(query.score) : undefined;
  const items = await listOpportunities(userId, id, {
    status: isStatus(query.status) ? query.status : "ALL",
    dimension: query.dimensao || "ALL",
    origin: isOrigin(query.origem) ? query.origem : "ALL",
    financial: query.financeiro === "with" || query.financeiro === "without" ? query.financeiro : "ALL",
    minScore: Number.isFinite(minScore) ? minScore : undefined,
  });

  return (
    <AppShell title="Oportunidades" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${company.id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Voltar à empresa
          </Link>
          <div className="flex flex-wrap gap-2">
            <Ghost href={`/empresas/${company.id}/oportunidades/gerar`}>Gerar do diagnóstico</Ghost>
            <Gold href={`/empresas/${company.id}/oportunidades/nova`}>Nova oportunidade</Gold>
          </div>
        </div>

        <form className="surface-card grid gap-3 p-4 md:grid-cols-5" method="get">
          <Select
            name="status"
            label="Status"
            defaultValue={query.status ?? "ALL"}
            options={[
              ["ALL", "Todos"],
              ["DRAFT", "Rascunho"],
              ["ACTIVE", "Ativa"],
              ["IN_PROGRESS", "Em execução"],
              ["VALIDATED", "Validada"],
              ["REJECTED", "Rejeitada"],
              ["ARCHIVED", "Arquivada"],
            ]}
          />
          <Select
            name="dimensao"
            label="Dimensão"
            defaultValue={query.dimensao ?? "ALL"}
            options={[["ALL", "Todas"], ...DIAGNOSTIC_DIMENSIONS.map((item) => [item.key, item.label])]}
          />
          <Select
            name="origem"
            label="Fonte"
            defaultValue={query.origem ?? "ALL"}
            options={[
              ["ALL", "Todas"],
              ["SUGGESTED", "Sugerida"],
              ["MANUAL", "Manual"],
            ]}
          />
          <Select
            name="financeiro"
            label="Financeiro"
            defaultValue={query.financeiro ?? "ALL"}
            options={[
              ["ALL", "Todos"],
              ["with", "Com estimativa"],
              ["without", "Sem estimativa"],
            ]}
          />
          <Select
            name="score"
            label="Score mínimo"
            defaultValue={query.score ?? ""}
            options={[
              ["", "Qualquer"],
              ["80", "Alta (80+)"],
              ["60", "Média (60+)"],
              ["0", "Todas as faixas"],
            ]}
          />
          <div className="md:col-span-5">
            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-[12px] font-bold"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              Filtrar ranking
            </button>
          </div>
        </form>

        <OpportunityRanking companyId={company.id} items={items} />
      </div>
    </AppShell>
  );
}

function isStatus(value?: string): value is OpportunityStatus {
  return opportunityStatusSchema.safeParse(value).success;
}

function isOrigin(value?: string): value is OpportunityOrigin {
  return value === "SUGGESTED" || value === "MANUAL";
}

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<string[] | [string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-2 py-2 text-[12px]"
        style={{ background: "rgba(255,255,255,.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
      >
        {options.map(([value, text]) => (
          <option key={`${name}-${value}`} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Gold({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
      style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
    >
      {children}
    </Link>
  );
}

function Ghost({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl border px-4 py-2.5 text-[13px] font-bold"
      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
    >
      {children}
    </Link>
  );
}
