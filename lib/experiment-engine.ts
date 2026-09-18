export const EXPERIMENT_DIRECTIONS = ["HIGHER_IS_BETTER", "LOWER_IS_BETTER"] as const;
export type ExperimentDirection = (typeof EXPERIMENT_DIRECTIONS)[number];

export const EXPERIMENT_CLASSIFICATIONS = [
  "VALIDATED",
  "PARTIALLY_VALIDATED",
  "INCONCLUSIVE",
  "REFUTED",
] as const;
export type ExperimentClassification = (typeof EXPERIMENT_CLASSIFICATIONS)[number];

export const EXPERIMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PLANNED: "Rascunho",
  READY: "Pronto para testar",
  RUNNING: "Em teste",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  ABANDONED: "Cancelado",
};

export const EXPERIMENT_CLASSIFICATION_LABELS: Record<ExperimentClassification, string> = {
  VALIDATED: "Validado",
  PARTIALLY_VALIDATED: "Parcialmente validado",
  INCONCLUSIVE: "Inconclusivo",
  REFUTED: "Refutado",
};

export const SUGGESTED_KPIS = [
  "Conversão %",
  "Ticket médio",
  "CMV %",
  "EBITDA %",
  "Clientes recorrentes",
  "Número de indicações",
  "Número de contratos",
  "Faturamento",
  "Pedidos",
  "Leads",
  "CAC",
  "Retenção",
] as const;

export function isDraftStatus(status: string): boolean {
  return status === "DRAFT" || status === "PLANNED";
}

export function isCancelledStatus(status: string): boolean {
  return status === "CANCELLED" || status === "ABANDONED";
}

export function canProduceEvidence(status: string): boolean {
  return status === "COMPLETED";
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculateAbsoluteVariation(initial: number | null, final: number | null): number | null {
  if (!isFiniteNumber(initial) || !isFiniteNumber(final)) return null;
  return round4(final - initial);
}

export function calculatePercentageVariation(initial: number | null, final: number | null): number | null {
  if (!isFiniteNumber(initial) || !isFiniteNumber(final)) return null;
  if (initial === 0) return null;
  return round4(((final - initial) / Math.abs(initial)) * 100);
}

export function targetReached(
  finalValue: number,
  target: number,
  direction: ExperimentDirection,
): boolean {
  return direction === "LOWER_IS_BETTER" ? finalValue <= target : finalValue >= target;
}

export function improvedVersusBaseline(
  finalValue: number,
  baseline: number,
  direction: ExperimentDirection,
): boolean {
  return direction === "LOWER_IS_BETTER" ? finalValue < baseline : finalValue > baseline;
}

export type EvaluateExperimentInput = {
  baseline: number | null;
  target: number | null;
  finalValue: number | null;
  direction: ExperimentDirection;
  measurementCount: number;
  status: string;
};

export type EvaluateExperimentResult = {
  classification: ExperimentClassification;
  reason: string;
  absoluteVariation: number | null;
  percentageVariation: number | null;
  baselineMissing: boolean;
  sufficient: boolean;
};

export function evaluateExperimentResult(input: EvaluateExperimentInput): EvaluateExperimentResult {
  const absoluteVariation = calculateAbsoluteVariation(input.baseline, input.finalValue);
  const percentageVariation = calculatePercentageVariation(input.baseline, input.finalValue);
  const baselineMissing = input.baseline == null || !isFiniteNumber(input.baseline);

  if (input.status !== "COMPLETED") {
    return {
      classification: "INCONCLUSIVE",
      reason: "Somente experimento concluído com resultado medido pode ser classificado.",
      absoluteVariation,
      percentageVariation,
      baselineMissing,
      sufficient: false,
    };
  }

  if (input.finalValue == null || !isFiniteNumber(input.finalValue)) {
    return {
      classification: "INCONCLUSIVE",
      reason: "Dados insuficientes: resultado final não informado.",
      absoluteVariation,
      percentageVariation,
      baselineMissing,
      sufficient: false,
    };
  }

  if (input.measurementCount < 1) {
    return {
      classification: "INCONCLUSIVE",
      reason: "Dados insuficientes: nenhuma medição registrada durante o teste.",
      absoluteVariation,
      percentageVariation,
      baselineMissing,
      sufficient: false,
    };
  }

  if (baselineMissing) {
    return {
      classification: "INCONCLUSIVE",
      reason: "Resultado comparativo limitado — baseline não informado.",
      absoluteVariation,
      percentageVariation,
      baselineMissing: true,
      sufficient: false,
    };
  }

  const reached = input.target != null && isFiniteNumber(input.target)
    ? targetReached(input.finalValue, input.target, input.direction)
    : false;
  const improved = improvedVersusBaseline(input.finalValue, input.baseline as number, input.direction);

  if (reached) {
    return {
      classification: "VALIDATED",
      reason:
        input.direction === "LOWER_IS_BETTER"
          ? "Meta atingida ou superada (menor é melhor) com baseline e resultado medidos."
          : "Meta atingida ou superada (maior é melhor) com baseline e resultado medidos.",
      absoluteVariation,
      percentageVariation,
      baselineMissing: false,
      sufficient: true,
    };
  }

  if (improved) {
    return {
      classification: "PARTIALLY_VALIDATED",
      reason: input.target == null
        ? "Houve melhoria mensurável contra o baseline, mas a meta não foi definida."
        : "Houve melhoria mensurável contra o baseline, mas a meta não foi atingida.",
      absoluteVariation,
      percentageVariation,
      baselineMissing: false,
      sufficient: true,
    };
  }

  return {
    classification: "REFUTED",
    reason: "Resultado medido não mostrou melhoria ou piorou em relação ao baseline.",
    absoluteVariation,
    percentageVariation,
    baselineMissing: false,
    sufficient: true,
  };
}

export function calculateExperimentROI(
  realizedReturn: number | null,
  realizedInvestment: number | null,
): number | null {
  if (!isFiniteNumber(realizedReturn) || !isFiniteNumber(realizedInvestment)) return null;
  if (realizedInvestment <= 0) return null;
  return round4(((realizedReturn - realizedInvestment) / realizedInvestment) * 100);
}

export function calculateExperimentPayback(
  realizedInvestment: number | null,
  realizedReturn: number | null,
): number | null {
  if (!isFiniteNumber(realizedInvestment) || !isFiniteNumber(realizedReturn)) return null;
  if (realizedInvestment < 0 || realizedReturn <= 0) return null;
  return round4(realizedInvestment / realizedReturn);
}

export function hasSufficientEvidence(input: EvaluateExperimentInput): boolean {
  return evaluateExperimentResult(input).sufficient;
}

export function nextOpportunityEvidenceLevel(classifications: ExperimentClassification[]): "HYPOTHESIS" | "TESTING" | "PARTIAL_EVIDENCE" | "VALIDATED_EVIDENCE" {
  if (classifications.includes("VALIDATED")) return "VALIDATED_EVIDENCE";
  if (classifications.includes("PARTIALLY_VALIDATED")) return "PARTIAL_EVIDENCE";
  if (classifications.length > 0) return "TESTING";
  return "HYPOTHESIS";
}

export type EvidenceSummaryInput = {
  title: string;
  hypothesis: string;
  kpi: string;
  unit?: string | null;
  baseline: number | null;
  target: number | null;
  finalValue: number | null;
  classification: ExperimentClassification;
  reason: string;
  startedAt?: string | null;
  endedAt?: string | null;
  plannedInvestment: number | null;
  realizedInvestment: number | null;
  realizedReturn: number | null;
  source: string;
};

export function buildEvidenceSummary(input: EvidenceSummaryInput): string {
  const lines = [
    `O que foi testado: ${input.title}`,
    `Hipótese: ${input.hypothesis}`,
    `KPI: ${input.kpi}${input.unit ? ` (${input.unit})` : ""}`,
    `Baseline: ${input.baseline ?? "não informado"}`,
    `Meta: ${input.target ?? "não informada"}`,
    `Resultado: ${input.finalValue ?? "não informado"}`,
    `Classificação: ${EXPERIMENT_CLASSIFICATION_LABELS[input.classification]}`,
    `Motivo: ${input.reason}`,
    `Período: ${input.startedAt ?? "n/d"} → ${input.endedAt ?? "n/d"}`,
    `Investimento previsto: ${input.plannedInvestment ?? "não informado"}`,
    `Investimento realizado: ${input.realizedInvestment ?? "não informado"}`,
    `Retorno realizado: ${input.realizedReturn ?? "não informado"}`,
    `Fonte: ${input.source}`,
  ];
  return lines.join("\n");
}

export function estimateMeasuredImpact(input: {
  direction: ExperimentDirection;
  baseline: number | null;
  finalValue: number | null;
  revenueBase: number | null;
  unit?: string | null;
}): number | null {
  if (!isFiniteNumber(input.baseline) || !isFiniteNumber(input.finalValue) || !isFiniteNumber(input.revenueBase)) {
    return null;
  }
  if (input.revenueBase <= 0) return null;
  const unit = (input.unit ?? "").toLowerCase();
  const looksPercent = unit.includes("%") || unit.includes("percent");
  if (!looksPercent) return null;
  const deltaPoints = input.direction === "LOWER_IS_BETTER"
    ? input.baseline - input.finalValue
    : input.finalValue - input.baseline;
  return round4((deltaPoints / 100) * input.revenueBase);
}
