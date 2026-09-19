import {
  EXPERIMENT_CLASSIFICATION_LABELS,
  isCancelledStatus,
  isDraftStatus,
  targetReached,
  type ExperimentDirection,
} from "@/lib/experiment-engine";

/** Mapeamento visual. Não altera o enum do banco. */
export const DISPLAY_EXPERIMENT_STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  PLANNED: "Planejado",
  READY: "Planejado",
  RUNNING: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  ABANDONED: "Cancelado",
};

export const EXPERIMENT_PROGRESS_STAGES = [
  "Planejado",
  "Em andamento",
  "Resultado registrado",
  "Evidência avaliada",
] as const;

export type ExperimentProgressStage = (typeof EXPERIMENT_PROGRESS_STAGES)[number];

export function displayExperimentStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return DISPLAY_EXPERIMENT_STATUS[status] ?? "—";
}

export function displayClassification(classification: string | null | undefined): string {
  if (!classification) return "Sem leitura ainda";
  return EXPERIMENT_CLASSIFICATION_LABELS[classification as keyof typeof EXPERIMENT_CLASSIFICATION_LABELS] ?? "—";
}

export function currentExperimentStage(input: {
  status: string;
  hasMeasurements: boolean;
  hasFinalResult: boolean;
  hasEvidence: boolean;
}): ExperimentProgressStage {
  if (input.hasEvidence && input.hasFinalResult) return "Evidência avaliada";
  if (input.hasFinalResult || input.status === "COMPLETED") return "Resultado registrado";
  if (input.status === "RUNNING" || input.hasMeasurements) return "Em andamento";
  return "Planejado";
}

export type TargetComparison = {
  metaLabel: string;
  resultLabel: string;
  differenceLabel: string | null;
  situation: string;
  comparable: boolean;
};

export function formatExperimentNumber(value: number | null | undefined, unit?: string | null): string {
  if (value == null || !Number.isFinite(value)) return "Não informado";
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function compareTargetVsResult(input: {
  target: number | null;
  result: number | null;
  direction: ExperimentDirection;
  unit?: string | null;
}): TargetComparison {
  const unit = input.unit?.trim() || "";
  const looksPercent = unit.includes("%");
  const metaPrefix = input.direction === "LOWER_IS_BETTER" ? "≤" : "≥";

  if (input.target == null || !Number.isFinite(input.target)) {
    return {
      metaLabel: "Meta não definida",
      resultLabel: formatExperimentNumber(input.result, unit || null),
      differenceLabel: null,
      situation: "Comparação limitada — sem meta.",
      comparable: false,
    };
  }
  if (input.result == null || !Number.isFinite(input.result)) {
    return {
      metaLabel: `${metaPrefix} ${formatExperimentNumber(input.target, unit || null)}`,
      resultLabel: "Resultado não medido",
      differenceLabel: null,
      situation: "Comparação limitada — sem resultado medido.",
      comparable: false,
    };
  }

  const diff = input.direction === "LOWER_IS_BETTER" ? input.target - input.result : input.result - input.target;
  const reached = targetReached(input.result, input.target, input.direction);
  const rounded = Number(diff.toFixed(2));
  const sign = rounded > 0 ? "+" : "";
  const differenceLabel = looksPercent
    ? `${sign}${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.`
    : `${sign}${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;

  return {
    metaLabel: `${metaPrefix} ${formatExperimentNumber(input.target, unit || null)}`,
    resultLabel: formatExperimentNumber(input.result, unit || null),
    differenceLabel,
    situation: reached ? "Acima ou na meta deste teste." : "Ainda não atingiu a meta deste teste.",
    comparable: true,
  };
}

export type EvidenceStrength = {
  label: string;
  limited: boolean;
  factors: string[];
};

export function evidenceStrength(input: {
  kpi?: string | null;
  target?: number | null;
  result?: number | null;
  endedAt?: string | null;
  measurementCount: number;
  repetitionCount?: number | null;
}): EvidenceStrength {
  const factors: string[] = [];
  if (input.kpi) factors.push("KPI definido antes do teste");
  if (input.target != null) factors.push("Meta definida");
  if (input.result != null) factors.push("Resultado mensurado");
  if (input.endedAt) factors.push("Período encerrado");
  if (input.measurementCount > 1) factors.push(`${input.measurementCount} medições no histórico`);
  if (input.repetitionCount && input.repetitionCount > 1) factors.push("Há repetição registrada");

  const essentials = Boolean(input.kpi && input.target != null && input.result != null && input.endedAt);
  if (!essentials) {
    return { label: "Evidência limitada.", limited: true, factors };
  }
  return { label: "Leitura possível com os dados registrados.", limited: false, factors };
}

export function displayRecordCount(hasCoverage: boolean, value: number): string {
  if (!hasCoverage) return "Sem dados";
  return String(value);
}

export function experimentNextAction(input: {
  status: string;
  hasFinalResult: boolean;
  hasEvidence: boolean;
  hasMemory: boolean;
  companyId: string;
  experimentId: string;
}): { label: string; href?: string; kind: "start" | "measure" | "result" | "learn" | "review" } {
  const base = `/empresas/${input.companyId}/experimentos/${input.experimentId}`;
  if (isCancelledStatus(input.status)) return { label: "Revisar experimento", href: base, kind: "review" };
  if (isDraftStatus(input.status) || input.status === "READY") {
    return { label: "Iniciar teste", href: base, kind: "start" };
  }
  if (input.status === "RUNNING") {
    return { label: "Registrar resultado", href: `${base}/resultado`, kind: "result" };
  }
  if (input.hasEvidence && !input.hasMemory) {
    return { label: "Registrar aprendizado", href: base, kind: "learn" };
  }
  return { label: "Revisar experimento", href: base, kind: "review" };
}

export function financialImpactLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Impacto financeiro não medido.";
  return `Impacto financeiro observado: ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
}
