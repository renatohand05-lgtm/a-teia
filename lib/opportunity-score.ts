export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  IN_PROGRESS: "Em execução",
  VALIDATED: "Validada",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
};

export const EVIDENCE_LABELS: Record<string, string> = {
  HYPOTHESIS: "Hipótese",
  TESTING: "Em teste",
  PARTIAL_EVIDENCE: "Evidência parcial",
  VALIDATED_EVIDENCE: "Evidência validada",
};

export const ORIGIN_LABELS: Record<string, string> = {
  SUGGESTED: "Sugerida",
  MANUAL: "Manual",
};

export const PRIORITY_WEIGHTS = {
  severity: 0.25,
  impact: 0.2,
  urgency: 0.2,
  confidence: 0.15,
  speed: 0.1,
  ease: 0.1,
} as const;

export const PRIORITY_BANDS = [
  { min: 80, max: 100, label: "Alta prioridade", key: "high" as const },
  { min: 60, max: 79, label: "Média prioridade", key: "medium" as const },
  { min: 0, max: 59, label: "Baixa prioridade", key: "low" as const },
] as const;

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;
export const NEUTRAL_SCALE = 3;

export type PriorityBandKey = (typeof PRIORITY_BANDS)[number]["key"];

export type PriorityInput = {
  dimensionScore?: number | null;
  expectedImpact: number;
  urgency: number;
  confidence: number;
  effort: number;
  estimatedInvestment?: number | null;
  expectedMonthlyReturn?: number | null;
  paybackMonths?: number | null;
  dimensionLabel?: string | null;
};

export type PriorityResult = {
  score: number;
  band: (typeof PRIORITY_BANDS)[number]["label"];
  bandKey: PriorityBandKey;
  severity: number;
  impact: number;
  urgency: number;
  confidence: number;
  effort: number;
  ease: number;
  speed: number;
  paybackMonths: number | null;
  partial: boolean;
  reasons: string[];
};

export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return NEUTRAL_SCALE;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value)));
}

/** Nota 1 do diagnóstico = severidade 5; nota 5 = severidade 1. */
export function severityFromDimensionScore(dimensionScore?: number | null): number {
  if (dimensionScore == null || !Number.isFinite(dimensionScore)) return NEUTRAL_SCALE;
  return clampScale(6 - dimensionScore);
}

export function easeFromEffort(effort: number): number {
  return clampScale(6 - effort);
}

export function calculatePaybackMonths(
  investment?: number | null,
  monthlyReturn?: number | null,
): number | null {
  if (investment == null || monthlyReturn == null) return null;
  if (!Number.isFinite(investment) || !Number.isFinite(monthlyReturn)) return null;
  if (investment < 0 || monthlyReturn <= 0) return null;
  return Math.round((investment / monthlyReturn) * 100) / 100;
}

export function speedFromPayback(paybackMonths: number | null): { speed: number; partial: boolean } {
  if (paybackMonths == null) return { speed: NEUTRAL_SCALE, partial: true };
  if (paybackMonths <= 1) return { speed: 5, partial: false };
  if (paybackMonths <= 3) return { speed: 4, partial: false };
  if (paybackMonths <= 6) return { speed: 3, partial: false };
  if (paybackMonths <= 12) return { speed: 2, partial: false };
  return { speed: 1, partial: false };
}

export function classifyPriority(score: number): (typeof PRIORITY_BANDS)[number] {
  const clamped = Math.max(0, Math.min(100, score));
  return PRIORITY_BANDS.find((band) => clamped >= band.min && clamped <= band.max) ?? PRIORITY_BANDS[2];
}

export function calculatePriorityScore(input: PriorityInput): PriorityResult {
  const impact = clampScale(input.expectedImpact);
  const urgency = clampScale(input.urgency);
  const confidence = clampScale(input.confidence);
  const effort = clampScale(input.effort);
  const severity = severityFromDimensionScore(input.dimensionScore);
  const ease = easeFromEffort(effort);
  const paybackMonths =
    input.paybackMonths ?? calculatePaybackMonths(input.estimatedInvestment, input.expectedMonthlyReturn);
  const { speed, partial } = speedFromPayback(paybackMonths);

  const weighted =
    severity * PRIORITY_WEIGHTS.severity +
    impact * PRIORITY_WEIGHTS.impact +
    urgency * PRIORITY_WEIGHTS.urgency +
    confidence * PRIORITY_WEIGHTS.confidence +
    speed * PRIORITY_WEIGHTS.speed +
    ease * PRIORITY_WEIGHTS.ease;

  const score = Math.round(((weighted - 1) / 4) * 100);
  const band = classifyPriority(score);
  const label = input.dimensionLabel?.trim() || "a dimensão avaliada";

  const reasons = [
    severity >= 4
      ? `Gargalo crítico em ${label} (nota ${input.dimensionScore ?? "n/d"} → severidade ${severity}/5)`
      : severity <= 2
        ? `Dimensão ${label} já relativamente saudável (severidade ${severity}/5)`
        : `Severidade moderada em ${label} (${severity}/5)`,
    impact >= 4 ? "Impacto esperado alto" : impact <= 2 ? "Impacto esperado baixo" : "Impacto esperado médio",
    urgency >= 4 ? "Urgência alta" : urgency <= 2 ? "Urgência baixa" : "Urgência média",
    ease >= 4 ? "Baixo esforço" : ease <= 2 ? "Esforço elevado" : "Esforço médio",
    confidence >= 4 ? "Confiança alta" : confidence <= 2 ? "Confiança baixa" : "Confiança média",
    partial
      ? "Retorno financeiro ainda não validado — speed neutro (cálculo parcial)"
      : paybackMonths != null
        ? `Velocidade de retorno estimada: payback de ${paybackMonths} mês(es)`
        : "Velocidade de retorno informada",
  ];

  return {
    score: Math.max(0, Math.min(100, score)),
    band: band.label,
    bandKey: band.key,
    severity,
    impact,
    urgency,
    confidence,
    effort,
    ease,
    speed,
    paybackMonths,
    partial,
    reasons,
  };
}

export function rankOpportunities<T extends { score: number | null; title: string; createdAt?: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}
