import { currentPeriod, firstDayOfPeriod, nextPeriod, periodLabel, previousPeriod, type YearMonth } from "@/lib/period";

export type CockpitPeriodKey = "atual" | "anterior" | "30d" | "90d";

export const COCKPIT_PERIOD_OPTIONS: Array<{ value: CockpitPeriodKey; label: string }> = [
  { value: "atual", label: "Mês atual" },
  { value: "anterior", label: "Mês anterior" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
];

export function parseCockpitPeriod(raw?: string | null): CockpitPeriodKey {
  if (raw === "anterior" || raw === "30d" || raw === "90d") return raw;
  return "atual";
}

export function competenceMonthsForPeriod(key: CockpitPeriodKey, now = new Date()): YearMonth[] {
  const current = currentPeriod(now);
  if (key === "atual") return [current];
  if (key === "anterior") return [previousPeriod(current)];
  const days = key === "30d" ? 30 : 90;
  const from = new Date(now.getTime() - days * 86_400_000);
  const months: YearMonth[] = [];
  let cursor: YearMonth = { periodMonth: from.getMonth() + 1, periodYear: from.getFullYear() };
  const end = current;
  while (cursor.periodYear < end.periodYear || (cursor.periodYear === end.periodYear && cursor.periodMonth <= end.periodMonth)) {
    months.push(cursor);
    cursor = nextPeriod(cursor);
  }
  return months;
}

export function matchesCompetence(row: YearMonth, key: CockpitPeriodKey, now = new Date()): boolean {
  return competenceMonthsForPeriod(key, now).some(
    (item) => item.periodMonth === row.periodMonth && item.periodYear === row.periodYear,
  );
}

export function periodWindow(key: CockpitPeriodKey, now = new Date()): { from: Date; to: Date } {
  if (key === "atual") {
    return { from: firstDayOfPeriod(currentPeriod(now)), to: now };
  }
  if (key === "anterior") {
    const previous = previousPeriod(currentPeriod(now));
    return { from: firstDayOfPeriod(previous), to: new Date(firstDayOfPeriod(currentPeriod(now)).getTime() - 1) };
  }
  const days = key === "30d" ? 30 : 90;
  return { from: new Date(now.getTime() - days * 86_400_000), to: now };
}

export function inPeriodWindow(iso: string | Date | null | undefined, key: CockpitPeriodKey, now = new Date()): boolean {
  if (!iso) return false;
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const { from, to } = periodWindow(key, now);
  return date >= from && date <= to;
}

export function periodAffectsMetric(metric: "finance" | "experiments" | "alerts" | "companies" | "memories" | "cadastro"): boolean {
  return metric === "finance" || metric === "experiments" || metric === "alerts";
}

export function cockpitPeriodCaption(key: CockpitPeriodKey, now = new Date()): string {
  const months = competenceMonthsForPeriod(key, now);
  if (key === "atual" || key === "anterior") {
    return months[0] ? `Competência ${periodLabel(months[0])}` : "Competência";
  }
  if (months.length === 1) return `Competências que cruzam a janela · ${periodLabel(months[0]!)}`;
  return `Competências que cruzam a janela · ${periodLabel(months[0]!)} a ${periodLabel(months[months.length - 1]!)}`;
}

export function periodOptionLabel(key: CockpitPeriodKey): string {
  return COCKPIT_PERIOD_OPTIONS.find((item) => item.value === key)?.label ?? "Mês atual";
}
