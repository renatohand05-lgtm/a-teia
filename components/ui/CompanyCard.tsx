import Link from "next/link";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { formatBRL, formatPercent } from "@/lib/format";
import type { CompanyDTO } from "@/services/companyService";

export function CompanyCard({ company, href }: { company: CompanyDTO; href?: string }) {
  return (
    <Link
      href={href ?? `/empresas/${company.id}`}
      className="surface-card block p-5 transition hover:-translate-y-0.5"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--gold-soft)" }}>
            {company.segment || "Segmento não informado"}
          </p>
          <h3 className="m-0 mt-1 text-[16px] font-bold">{company.name}</h3>
        </div>
        {company.isDemo ? <DemoBadge /> : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
        <div>
          <span className="block text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
            Faturamento
          </span>
          {formatBRL(company.revenueMonthly)}
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
            Margem
          </span>
          {formatPercent(company.marginPercent)}
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
            Equipe
          </span>
          {company.teamSize ?? "—"}
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
            Unidades
          </span>
          {company.units ?? "—"}
        </div>
      </div>
    </Link>
  );
}
