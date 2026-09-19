import Link from "next/link";
import { FinancialPeriodSelector } from "@/components/companies/FinancialPeriodSelector";
import { periodHref, type YearMonth } from "@/lib/period";

const LINKS = [
  ["", "Resultado"],
  ["/dre", "DRE"],
  ["/fluxo-caixa", "Fluxo de caixa"],
  ["/cenarios", "Cenários"],
  ["/metas", "Metas"],
] as const;

export function FinancialNav({
  companyId,
  period,
  current,
  availablePeriods = [],
}: {
  companyId: string;
  period: YearMonth;
  current: "resultado" | "dre" | "fluxo" | "cenarios" | "metas";
  availablePeriods?: YearMonth[];
}) {
  const keys = ["resultado", "dre", "fluxo", "cenarios", "metas"] as const;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {LINKS.map(([suffix, label], index) => {
          const active = keys[index] === current;
          return (
            <Link
              key={label}
              href={periodHref(`/empresas/${companyId}/financeiro${suffix}`, period)}
              className="rounded-xl border px-3 py-2 text-[12px] font-bold"
              style={{
                borderColor: active ? "rgba(232,191,122,.45)" : "var(--border)",
                color: active ? "var(--gold-soft)" : "var(--text-2)",
                background: active ? "rgba(232,191,122,.08)" : "transparent",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <FinancialPeriodSelector
        companyId={companyId}
        period={period}
        available={availablePeriods}
        suffix={current === "dre" ? "/dre" : current === "fluxo" ? "/fluxo-caixa" : current === "cenarios" ? "/cenarios" : current === "metas" ? "/metas" : ""}
      />
    </div>
  );
}

export function moneyOrMissing(value: number | null | undefined, informed = value != null): string {
  if (!informed || value == null) return "Sem dados";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function percentOrMissing(value: number | null | undefined): string {
  if (value == null) return "Sem dados";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
