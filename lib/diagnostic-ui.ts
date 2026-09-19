import {
  DIAGNOSTIC_DIMENSIONS,
  DIAGNOSTIC_MAX_SCORE,
  isDiagnosticScore,
} from "@/lib/diagnostic";

export const DIAGNOSTIC_SCALE = [
  { value: 1, label: "Crítico" },
  { value: 2, label: "Fraco" },
  { value: 3, label: "Em desenvolvimento" },
  { value: 4, label: "Bom" },
  { value: 5, label: "Forte" },
] as const;

export function scaleLabel(score: number | null | undefined): string {
  if (score == null || !isDiagnosticScore(score)) return "Sem dados";
  return DIAGNOSTIC_SCALE.find((item) => item.value === score)?.label ?? `${score}`;
}

export function diagnosisCoverage(dimensions: Array<{ key: string; score: number | null | undefined }>): {
  filled: number;
  total: number;
  complete: boolean;
  label: string;
} {
  const total = DIAGNOSTIC_DIMENSIONS.length;
  const filled = dimensions.filter((item) => typeof item.score === "number" && isDiagnosticScore(item.score)).length;
  return {
    filled,
    total,
    complete: filled === total,
    label: filled === total ? "Diagnóstico completo" : `Diagnóstico incompleto — ${filled} de ${total} dimensões avaliadas.`,
  };
}

export function displayDiagnosisScore(overallScore: number | null | undefined, complete: boolean): number | null {
  if (!complete || overallScore == null) return null;
  return overallScore;
}

export function diagnosisDelta(current: number | null, previous: number | null): {
  value: number;
  label: string;
} | null {
  if (current == null || previous == null) return null;
  const value = current - previous;
  if (value === 0) return { value: 0, label: "estável" };
  return { value, label: `${value > 0 ? "+" : ""}${value} pontos` };
}

export function bottleneckSummary(bottlenecks: Array<{ label: string; score: number }>): {
  title: string;
  note: string;
} {
  if (!bottlenecks.length) {
    return { title: "Sem gargalo calculado", note: "É preciso um diagnóstico completo." };
  }
  if (bottlenecks.length === 1) {
    return {
      title: bottlenecks[0]!.label,
      note: `Nota ${bottlenecks[0]!.score}/${DIAGNOSTIC_MAX_SCORE}. Inferência pela menor nota — não é evidência.`,
    };
  }
  return {
    title: bottlenecks.map((item) => item.label).join(" · "),
    note: `${bottlenecks.length} gargalos com a mesma pontuação (${bottlenecks[0]!.score}/${DIAGNOSTIC_MAX_SCORE}). Empate preservado.`,
  };
}

export function financeIsBottleneck(bottlenecks: Array<{ key: string }>): boolean {
  return bottlenecks.some((item) => item.key === "finance");
}
