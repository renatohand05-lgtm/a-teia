"use client";

import Link from "next/link";
import { neighborPeriod, periodLongLabel, samePeriod } from "@/lib/financial-ui";
import { periodHref, periodLabel, type YearMonth } from "@/lib/period";

export function FinancialPeriodSelector({
  companyId,
  period,
  available,
  suffix = "",
}: {
  companyId: string;
  period: YearMonth;
  available: YearMonth[];
  suffix?: string;
}) {
  const base = `/empresas/${companyId}/financeiro${suffix}`;
  const previous = neighborPeriod(available, period, -1);
  const next = neighborPeriod(available, period, 1);
  const currentKey = `${period.periodYear}-${period.periodMonth}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <p className="font-semibold">{periodLongLabel(period)}</p>
      {previous ? (
        <Link href={periodHref(base, previous)} className="rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
          ← {periodLabel(previous)}
        </Link>
      ) : null}
      {available.length ? (
        <label className="flex items-center gap-2">
          <span className="sr-only">Competência existente</span>
          <select
            value={available.some((item) => samePeriod(item, period)) ? currentKey : ""}
            onChange={(event) => {
              if (!event.target.value) return;
              const [year, month] = event.target.value.split("-").map(Number);
              if (year && month) window.location.assign(periodHref(base, { periodYear: year, periodMonth: month }));
            }}
            className="rounded-lg border bg-transparent px-2 py-1.5"
            style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
            aria-label="Competência existente"
          >
            {!available.some((item) => samePeriod(item, period)) ? <option value="">Sem DRE nesta competência</option> : null}
            {available.map((item) => (
              <option key={`${item.periodYear}-${item.periodMonth}`} value={`${item.periodYear}-${item.periodMonth}`}>
                {periodLabel(item)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {next ? (
        <Link href={periodHref(base, next)} className="rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
          {periodLabel(next)} →
        </Link>
      ) : null}
    </div>
  );
}
