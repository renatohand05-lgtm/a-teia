export const SCENARIO_MULTIPLIERS = {
  CONSERVATIVE: 0.7,
  BASE: 1,
  AGGRESSIVE: 1.3,
} as const;

export type ScenarioKey = keyof typeof SCENARIO_MULTIPLIERS;

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  CONSERVATIVE: "Conservador",
  BASE: "Base",
  AGGRESSIVE: "Agressivo",
};

export const VARIABLE_DRE_KEYS = ["deductions", "cogs", "marketing", "delivery"] as const;
export const FIXED_DRE_KEYS = [
  "payroll",
  "rent",
  "water",
  "energy",
  "internet",
  "accounting",
  "maintenance",
  "otherOpex",
] as const;

export type Money = number | null;

export type DreInput = {
  grossRevenue: Money;
  deductions: Money;
  cogs: Money;
  payroll: Money;
  rent: Money;
  water: Money;
  energy: Money;
  internet: Money;
  marketing: Money;
  delivery: Money;
  accounting: Money;
  maintenance: Money;
  otherOpex: Money;
  salesCount: Money;
};

export type DreLineKey = Exclude<keyof DreInput, "salesCount"> | "netRevenue" | "grossMargin" | "ebitda";

export type DreResult = {
  input: DreInput;
  grossRevenue: Money;
  deductions: Money;
  netRevenue: Money;
  cogs: Money;
  grossMargin: Money;
  operatingCosts: number;
  fixedCosts: number;
  variableCosts: number;
  ebitda: Money;
  informed: Record<keyof DreInput, boolean>;
  missing: string[];
};

export type FinancialRatios = {
  cogsPercent: Money;
  grossMarginPercent: Money;
  payrollPercent: Money;
  marketingPercent: Money;
  ebitdaPercent: Money;
  averageTicket: Money;
};

export type ContributionMarginResult = {
  rate: Money;
  percent: Money;
  missing: string[];
};

export type BreakEvenResult = {
  value: Money;
  contribution: ContributionMarginResult;
  fixedCosts: number;
  missing: string[];
};

export type RequiredRevenueInput = {
  desiredProfit: number;
  cogsPercent: number;
  taxPercent: number;
  deliveryPercent: number;
  otherVariablePercent: number;
  fixedCosts: number;
};

export type RequiredRevenueResult = {
  value: Money;
  contribution: ContributionMarginResult;
  missing: string[];
};

export type ScenarioResult = {
  key: ScenarioKey;
  label: string;
  multiplier: number;
  dre: DreResult;
  ratios: FinancialRatios;
};

export type ComparisonDirection = "higher_is_better" | "lower_is_better";

export type TargetComparison = {
  actual: Money;
  target: Money;
  difference: Money;
  differencePercent: Money;
  status: string | null;
  direction: ComparisonDirection;
};

export function isInformed(value: Money): value is number {
  return value != null && Number.isFinite(value);
}

export function moneyOrZero(value: Money): number {
  return isInformed(value) ? value : 0;
}

export function ratioPercent(numerator: Money, denominator: Money): Money {
  if (!isInformed(numerator) || !isInformed(denominator) || denominator === 0) return null;
  return round2((numerator / denominator) * 100);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateDRE(input: DreInput): DreResult {
  const informed = {
    grossRevenue: isInformed(input.grossRevenue),
    deductions: isInformed(input.deductions),
    cogs: isInformed(input.cogs),
    payroll: isInformed(input.payroll),
    rent: isInformed(input.rent),
    water: isInformed(input.water),
    energy: isInformed(input.energy),
    internet: isInformed(input.internet),
    marketing: isInformed(input.marketing),
    delivery: isInformed(input.delivery),
    accounting: isInformed(input.accounting),
    maintenance: isInformed(input.maintenance),
    otherOpex: isInformed(input.otherOpex),
    salesCount: isInformed(input.salesCount),
  };

  const missing: string[] = [];
  if (!informed.grossRevenue) missing.push("receita bruta");

  const netRevenue = informed.grossRevenue ? moneyOrZero(input.grossRevenue) - moneyOrZero(input.deductions) : null;
  const grossMargin = netRevenue != null ? netRevenue - moneyOrZero(input.cogs) : null;
  const variableCosts =
    moneyOrZero(input.deductions) + moneyOrZero(input.cogs) + moneyOrZero(input.marketing) + moneyOrZero(input.delivery);
  const fixedCosts = FIXED_DRE_KEYS.reduce((sum, key) => sum + moneyOrZero(input[key]), 0);
  const operatingCosts =
    moneyOrZero(input.payroll) +
    moneyOrZero(input.rent) +
    moneyOrZero(input.water) +
    moneyOrZero(input.energy) +
    moneyOrZero(input.internet) +
    moneyOrZero(input.marketing) +
    moneyOrZero(input.delivery) +
    moneyOrZero(input.accounting) +
    moneyOrZero(input.maintenance) +
    moneyOrZero(input.otherOpex);
  const ebitda = grossMargin != null ? grossMargin - operatingCosts : null;

  return {
    input,
    grossRevenue: informed.grossRevenue ? input.grossRevenue : null,
    deductions: informed.deductions ? input.deductions : null,
    netRevenue: netRevenue != null ? round2(netRevenue) : null,
    cogs: informed.cogs ? input.cogs : null,
    grossMargin: grossMargin != null ? round2(grossMargin) : null,
    operatingCosts: round2(operatingCosts),
    fixedCosts: round2(fixedCosts),
    variableCosts: round2(variableCosts),
    ebitda: ebitda != null ? round2(ebitda) : null,
    informed,
    missing,
  };
}

export function calculateFinancialRatios(dre: DreResult): FinancialRatios {
  const net = dre.netRevenue;
  return {
    cogsPercent: ratioPercent(dre.input.cogs, net),
    grossMarginPercent: ratioPercent(dre.grossMargin, net),
    payrollPercent: ratioPercent(dre.input.payroll, net),
    marketingPercent: ratioPercent(dre.input.marketing, net),
    ebitdaPercent: ratioPercent(dre.ebitda, net),
    averageTicket:
      isInformed(dre.input.salesCount) && dre.input.salesCount > 0 && isInformed(dre.netRevenue)
        ? round2(dre.netRevenue / dre.input.salesCount)
        : null,
  };
}

export function calculateContributionMargin(rates: {
  cogsPercent: number;
  taxPercent: number;
  deliveryPercent?: number;
  otherVariablePercent?: number;
}): ContributionMarginResult {
  const missing: string[] = [];
  const parts = [rates.cogsPercent, rates.taxPercent, rates.deliveryPercent ?? 0, rates.otherVariablePercent ?? 0];
  if (parts.some((part) => !Number.isFinite(part))) {
    return { rate: null, percent: null, missing: ["percentuais finitos"] };
  }
  const rate = 1 - parts.reduce((sum, part) => sum + part, 0) / 100;
  if (!Number.isFinite(rate)) return { rate: null, percent: null, missing: ["margem de contribuição"] };
  if (rate <= 0) missing.push("margem de contribuição positiva");
  return {
    rate: rate > 0 ? round2(rate * 10000) / 10000 : null,
    percent: rate > 0 ? round2(rate * 100) : null,
    missing,
  };
}

export function contributionRatesFromDre(dre: DreResult): {
  cogsPercent: number | null;
  taxPercent: number | null;
  deliveryPercent: number | null;
  otherVariablePercent: number | null;
  missing: string[];
} {
  const missing: string[] = [];
  if (!isInformed(dre.grossRevenue) || dre.grossRevenue <= 0) missing.push("receita bruta");
  const gross = moneyOrZero(dre.grossRevenue);
  const taxPercent = isInformed(dre.input.deductions) && gross > 0 ? (dre.input.deductions / gross) * 100 : null;
  const cogsPercent = isInformed(dre.input.cogs) && isInformed(dre.netRevenue) && dre.netRevenue > 0
    ? (dre.input.cogs / dre.netRevenue) * 100
    : null;
  const deliveryPercent = isInformed(dre.input.delivery) && isInformed(dre.netRevenue) && dre.netRevenue > 0
    ? (dre.input.delivery / dre.netRevenue) * 100
    : null;
  const otherVariablePercent = isInformed(dre.input.marketing) && isInformed(dre.netRevenue) && dre.netRevenue > 0
    ? (dre.input.marketing / dre.netRevenue) * 100
    : null;
  if (taxPercent == null) missing.push("deduções / impostos");
  if (cogsPercent == null) missing.push("CMV");
  return { cogsPercent, taxPercent, deliveryPercent, otherVariablePercent, missing };
}

export function calculateBreakEven(dre: DreResult): BreakEvenResult {
  const rates = contributionRatesFromDre(dre);
  const missing = [...rates.missing];
  if (rates.cogsPercent == null || rates.taxPercent == null) {
    return {
      value: null,
      contribution: { rate: null, percent: null, missing },
      fixedCosts: dre.fixedCosts,
      missing,
    };
  }
  const contribution = calculateContributionMargin({
    cogsPercent: rates.cogsPercent,
    taxPercent: rates.taxPercent,
    deliveryPercent: rates.deliveryPercent ?? 0,
    otherVariablePercent: rates.otherVariablePercent ?? 0,
  });
  missing.push(...contribution.missing);
  if (contribution.rate == null || contribution.rate <= 0) {
    return { value: null, contribution, fixedCosts: dre.fixedCosts, missing };
  }
  return {
    value: round2(dre.fixedCosts / contribution.rate),
    contribution,
    fixedCosts: dre.fixedCosts,
    missing,
  };
}

export function calculateRequiredRevenue(input: RequiredRevenueInput): RequiredRevenueResult {
  const missing: string[] = [];
  const fields: Array<[string, number]> = [
    ["lucro desejado", input.desiredProfit],
    ["CMV %", input.cogsPercent],
    ["impostos %", input.taxPercent],
    ["delivery %", input.deliveryPercent],
    ["outros variáveis %", input.otherVariablePercent],
    ["custos fixos", input.fixedCosts],
  ];
  for (const [label, value] of fields) {
    if (!Number.isFinite(value)) missing.push(label);
  }
  if (missing.length) {
    return { value: null, contribution: { rate: null, percent: null, missing }, missing };
  }
  const contribution = calculateContributionMargin({
    cogsPercent: input.cogsPercent,
    taxPercent: input.taxPercent,
    deliveryPercent: input.deliveryPercent,
    otherVariablePercent: input.otherVariablePercent,
  });
  if (contribution.rate == null || contribution.rate <= 0) {
    return { value: null, contribution, missing: contribution.missing };
  }
  return {
    value: round2((input.fixedCosts + input.desiredProfit) / contribution.rate),
    contribution,
    missing: [],
  };
}

function scaleMoney(value: Money, multiplier: number): Money {
  return isInformed(value) ? round2(value * multiplier) : null;
}

export function calculateScenario(input: DreInput, key: ScenarioKey): ScenarioResult {
  const multiplier = SCENARIO_MULTIPLIERS[key];
  const scaled: DreInput = {
    ...input,
    grossRevenue: scaleMoney(input.grossRevenue, multiplier),
    deductions: scaleMoney(input.deductions, multiplier),
    cogs: scaleMoney(input.cogs, multiplier),
    marketing: scaleMoney(input.marketing, multiplier),
    delivery: scaleMoney(input.delivery, multiplier),
  };
  const dre = calculateDRE(scaled);
  return {
    key,
    label: SCENARIO_LABELS[key],
    multiplier,
    dre,
    ratios: calculateFinancialRatios(dre),
  };
}

export function calculateAllScenarios(input: DreInput): ScenarioResult[] {
  return (Object.keys(SCENARIO_MULTIPLIERS) as ScenarioKey[]).map((key) => calculateScenario(input, key));
}

export function calculatePayback(investment: Money, monthlyReturn: Money): Money {
  if (!isInformed(investment) || !isInformed(monthlyReturn)) return null;
  if (investment < 0 || monthlyReturn <= 0) return null;
  return round2(investment / monthlyReturn);
}

export function calculateROI(investment: Money, monthlyReturn: Money): Money {
  if (!isInformed(investment) || !isInformed(monthlyReturn)) return null;
  if (investment <= 0) return null;
  return round2(((monthlyReturn * 12 - investment) / investment) * 100);
}

export function compareTargetVsActual(
  actual: Money,
  target: Money,
  direction: ComparisonDirection,
): TargetComparison {
  if (!isInformed(actual) || !isInformed(target)) {
    return {
      actual: isInformed(actual) ? actual : null,
      target: isInformed(target) ? target : null,
      difference: null,
      differencePercent: null,
      status: null,
      direction,
    };
  }
  const difference = round2(actual - target);
  const differencePercent = target === 0 ? null : round2((difference / target) * 100);
  const reached = direction === "higher_is_better" ? actual >= target : actual <= target;
  const status =
    direction === "higher_is_better"
      ? reached
        ? "Atingiu a meta"
        : "Abaixo da meta"
      : reached
        ? "Dentro da meta"
        : "Acima da meta";
  return { actual, target, difference, differencePercent, status, direction };
}

export function emptyDreInput(): DreInput {
  return {
    grossRevenue: null,
    deductions: null,
    cogs: null,
    payroll: null,
    rent: null,
    water: null,
    energy: null,
    internet: null,
    marketing: null,
    delivery: null,
    accounting: null,
    maintenance: null,
    otherOpex: null,
    salesCount: null,
  };
}

export type CashMovement = {
  direction: "INFLOW" | "OUTFLOW";
  amount: number;
  occurredAt: Date | string;
};

export type CashMonth = {
  periodMonth: number;
  periodYear: number;
  inflows: number;
  outflows: number;
  operatingBalance: number;
  accumulatedBalance: number;
};

export function summarizeCashFlow(movements: CashMovement[], seed = 0): CashMonth[] {
  const buckets = new Map<string, { periodMonth: number; periodYear: number; inflows: number; outflows: number }>();
  for (const item of movements) {
    const date = typeof item.occurredAt === "string" ? new Date(item.occurredAt) : item.occurredAt;
    if (Number.isNaN(date.getTime()) || !Number.isFinite(item.amount)) continue;
    const periodMonth = date.getMonth() + 1;
    const periodYear = date.getFullYear();
    const key = `${periodYear}-${periodMonth}`;
    const current = buckets.get(key) ?? { periodMonth, periodYear, inflows: 0, outflows: 0 };
    if (item.direction === "INFLOW") current.inflows += item.amount;
    else current.outflows += item.amount;
    buckets.set(key, current);
  }
  const ordered = [...buckets.values()].sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth);
  let accumulated = seed;
  return ordered.map((item) => {
    const operatingBalance = round2(item.inflows - item.outflows);
    accumulated = round2(accumulated + operatingBalance);
    return {
      periodMonth: item.periodMonth,
      periodYear: item.periodYear,
      inflows: round2(item.inflows),
      outflows: round2(item.outflows),
      operatingBalance,
      accumulatedBalance: accumulated,
    };
  });
}
