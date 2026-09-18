export const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

export type YearMonth = {
  periodMonth: number;
  periodYear: number;
};

export function currentPeriod(now = new Date()): YearMonth {
  return { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() };
}

export function isValidPeriod(month: number, year: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export function parsePeriod(search: { mes?: string; ano?: string }, now = new Date()): YearMonth {
  const month = Number(search.mes);
  const year = Number(search.ano);
  if (isValidPeriod(month, year)) return { periodMonth: month, periodYear: year };
  return currentPeriod(now);
}

export function periodLabel({ periodMonth, periodYear }: YearMonth): string {
  return `${MONTH_LABELS[periodMonth - 1] ?? periodMonth}/${periodYear}`;
}

export function previousPeriod({ periodMonth, periodYear }: YearMonth): YearMonth {
  if (periodMonth === 1) return { periodMonth: 12, periodYear: periodYear - 1 };
  return { periodMonth: periodMonth - 1, periodYear };
}

export function periodHref(base: string, period: YearMonth): string {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}mes=${period.periodMonth}&ano=${period.periodYear}`;
}

export function firstDayOfPeriod({ periodMonth, periodYear }: YearMonth): Date {
  return new Date(periodYear, periodMonth - 1, 1);
}
