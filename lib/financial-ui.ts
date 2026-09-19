import { isInformed, type DreResult, type Money } from "@/lib/financial-engine";
import { MONTH_LABELS, type YearMonth } from "@/lib/period";

export const DRE_ESSENTIALS = ["grossRevenue", "cogs", "payroll"] as const;

export const CALCULATION_HELP: Record<string, string> = {
  cogs: "CMV é o custo da mercadoria ou produto vendido no período. Percentual sobre a receita líquida.",
  grossMargin: "Margem bruta = receita líquida − CMV. Só é definitiva com receita e CMV informados.",
  ebitda: "EBITDA operacional desta DRE. Não é caixa disponível.",
  breakEven: "Ponto de equilíbrio = custos fixos ÷ margem de contribuição. Sem CMV, impostos ou receita, não calculamos.",
  gap: "Gap = realizado − meta. Negativo significa que ainda falta alcançar a meta.",
  cash: "EBITDA mede resultado operacional. Caixa mede entrada e saída financeiras do período.",
};

export function periodLongLabel({ periodMonth, periodYear }: YearMonth): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[periodMonth - 1] ?? MONTH_LABELS[periodMonth - 1]} de ${periodYear}`;
}

export function dreCoverage(dre: DreResult): {
  filled: number;
  total: number;
  definitive: boolean;
  label: string;
} {
  const total = DRE_ESSENTIALS.length;
  const filled = DRE_ESSENTIALS.filter((key) => dre.informed[key]).length;
  return {
    filled,
    total,
    definitive: filled === total,
    label: filled === total ? "Dados essenciais preenchidos" : `Dados incompletos — ${filled} de ${total} essenciais`,
  };
}

export function displayMoney(value: Money, informed = isInformed(value)): string {
  if (!informed || value == null) return "Sem dados";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function displayPercent(value: Money): string {
  if (value == null) return "Sem dados";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function moneyWithPercent(absolute: Money, percent: Money, informed = isInformed(absolute)): {
  money: string;
  percent: string;
} {
  return { money: displayMoney(absolute, informed), percent: displayPercent(percent) };
}

export function variation(current: Money, previous: Money): { amount: number; percent: number | null } | null {
  if (!isInformed(current) || !isInformed(previous)) return null;
  const amount = Math.round((current - previous) * 100) / 100;
  const percent = previous === 0 ? null : Math.round((amount / Math.abs(previous)) * 1000) / 10;
  return { amount, percent };
}

export function samePeriod(a: YearMonth, b: YearMonth): boolean {
  return a.periodMonth === b.periodMonth && a.periodYear === b.periodYear;
}

export function sortPeriods(periods: YearMonth[]): YearMonth[] {
  return [...periods].sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth);
}

export function neighborPeriod(periods: YearMonth[], current: YearMonth, direction: -1 | 1): YearMonth | null {
  const ordered = sortPeriods(periods);
  const index = ordered.findIndex((item) => samePeriod(item, current));
  if (index < 0) return null;
  return ordered[index + direction] ?? null;
}
