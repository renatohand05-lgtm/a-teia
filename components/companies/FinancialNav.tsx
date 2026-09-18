import Link from "next/link";
import { periodHref, periodLabel, type YearMonth } from "@/lib/period";

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
}: {
  companyId: string;
  period: YearMonth;
  current: "resultado" | "dre" | "fluxo" | "cenarios" | "metas";
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
      <PeriodSwitch companyId={companyId} period={period} current={current} />
    </div>
  );
}

function PeriodSwitch({
  companyId,
  period,
  current,
}: {
  companyId: string;
  period: YearMonth;
  current: "resultado" | "dre" | "fluxo" | "cenarios" | "metas";
}) {
  const suffix =
    current === "dre"
      ? "/dre"
      : current === "fluxo"
        ? "/fluxo-caixa"
        : current === "cenarios"
          ? "/cenarios"
          : current === "metas"
            ? "/metas"
            : "";
  const action = `/empresas/${companyId}/financeiro${suffix}`;
  return (
    <form action={action} className="flex items-center gap-2 text-[12px]">
      <span style={{ color: "var(--text-3)" }}>{periodLabel(period)}</span>
      <input type="number" name="mes" min={1} max={12} defaultValue={period.periodMonth} className="w-14 rounded-lg border bg-transparent px-2 py-1" style={{ borderColor: "var(--border)" }} />
      <input type="number" name="ano" min={2000} max={2100} defaultValue={period.periodYear} className="w-20 rounded-lg border bg-transparent px-2 py-1" style={{ borderColor: "var(--border)" }} />
      <button type="submit" className="rounded-lg border px-2 py-1 font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
        Ir
      </button>
    </form>
  );
}

export function moneyOrMissing(value: number | null | undefined, informed = value != null): string {
  if (!informed || value == null) return "Sem dado informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function percentOrMissing(value: number | null | undefined): string {
  if (value == null) return "Sem dado informado";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
