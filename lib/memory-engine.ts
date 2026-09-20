import { DIAGNOSTIC_DIMENSIONS, type DiagnosticDimensionKey, dimensionByKey } from "@/lib/diagnostic";
import type { ExperimentClassification } from "@/lib/experiment-engine";

export const MEMORY_ORIGINS = ["OBSERVATION", "EXPERIMENT_EVIDENCE", "MANUAL_LESSON"] as const;
export type MemoryOrigin = (typeof MEMORY_ORIGINS)[number];

export const MEMORY_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type MemoryConfidenceLevel = (typeof MEMORY_CONFIDENCE_LEVELS)[number];

export const MEMORY_STATUSES = ["PROPOSED", "APPROVED", "REJECTED"] as const;
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

export const MEMORY_POLARITIES = ["POSITIVE", "NEGATIVE", "INCONCLUSIVE"] as const;
export type MemoryPolarity = (typeof MEMORY_POLARITIES)[number];

export const MEMORY_ORIGIN_LABELS: Record<MemoryOrigin, string> = {
  OBSERVATION: "Observação",
  EXPERIMENT_EVIDENCE: "Evidência de experimento",
  MANUAL_LESSON: "Lição manual",
};

export const MEMORY_CONFIDENCE_LABELS: Record<MemoryConfidenceLevel, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const MEMORY_STATUS_LABELS: Record<MemoryStatus, string> = {
  PROPOSED: "Proposta",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

export const MEMORY_POLARITY_LABELS: Record<MemoryPolarity, string> = {
  POSITIVE: "Resultado positivo",
  NEGATIVE: "Resultado negativo",
  INCONCLUSIVE: "Inconclusivo",
};

/** Famílias estratégicas = taxonomia do diagnóstico 360°, sem duplicar o vocabulário. */
export const STRATEGIC_FAMILIES = DIAGNOSTIC_DIMENSIONS.map((item) => ({
  key: item.key,
  label: item.label,
}));

const FAMILY_ALIASES: Record<string, DiagnosticDimensionKey> = {
  aquisicao: "attraction",
  aquisicao_de_clientes: "attraction",
  conversao: "conversion",
  recorrencia: "recurrence",
  assinatura: "recurrence",
  retencao: "recurrence",
  fidelizacao: "recurrence",
  indicacao: "referral",
  ticket: "averageTicket",
  ticket_medio: "averageTicket",
  upsell: "averageTicket",
  cross_sell: "averageTicket",
  crosssell: "averageTicket",
  cmv: "finance",
  margem: "finance",
  precificacao: "finance",
  produtividade: "operations",
  eficiencia: "operations",
  automacao: "operations",
  parcerias: "attraction",
  expansao: "attraction",
};

export const MAX_MEMORY_SCORE_ADJUSTMENT = 15;

export type MemoryConfidenceInput = {
  origin: MemoryOrigin;
  experimentCompleted: boolean;
  hasBaseline: boolean;
  hasTarget: boolean;
  hasMeasuredResult: boolean;
  hasTraceableEvidence: boolean;
  classification: ExperimentClassification | null;
  humanApproved: boolean;
  repeatedValidationCount: number;
};

export type MemoryConfidenceResult = {
  level: MemoryConfidenceLevel;
  score: number;
  reasons: string[];
};

export type MemoryContext = {
  companyId: string | null;
  companyName?: string | null;
  segment: string | null;
  family: string | null;
  kpi: string | null;
  opportunityId: string | null;
  teamSize: number | null;
  units: number | null;
  objective?: string | null;
};

export type ContextComparison = {
  sameCompany: boolean;
  sameSegment: boolean;
  sameFamily: boolean;
  sameKpi: boolean;
  sameOpportunity: boolean;
  sameObjective: boolean;
  operationalBand: MemoryConfidenceLevel;
  kind: "EXACT" | "TRANSVERSAL" | "UNRELATED";
  reasons: string[];
};

export type TransferabilityInput = {
  source: MemoryContext;
  target: MemoryContext;
  evidenceQuality: ExperimentClassification | null;
};

export type TransferabilityResult = {
  score: number;
  band: MemoryConfidenceLevel;
  label: string;
  factors: string[];
  warning: string;
};

export type EvidenceMemorySource = {
  evidenceId: string;
  evidenceTitle: string;
  evidenceBody: string;
  classification: ExperimentClassification | null;
  experimentId: string | null;
  experimentTitle: string | null;
  hypothesis: string | null;
  opportunityId: string | null;
  strategyId: string | null;
  kpi: string | null;
  family: string | null;
  baseline: number | null;
  target: number | null;
  measuredResult: number | null;
  experimentCompleted: boolean;
  companyId: string;
  companyName: string;
  segment: string | null;
  teamSize: number | null;
  units: number | null;
  investment: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  conditions: string | null;
  testDescription: string | null;
};

export type BuiltMemoryDraft = {
  origin: MemoryOrigin;
  title: string;
  lesson: string;
  context: string;
  segment: string | null;
  kpi: string | null;
  family: string | null;
  baseline: number | null;
  target: number | null;
  measuredResult: number | null;
  classification: ExperimentClassification | null;
  polarity: MemoryPolarity;
  limitations: string;
  conditions: string | null;
  confidence: MemoryConfidenceResult;
  evidenceId: string;
  experimentId: string | null;
  opportunityId: string | null;
  strategyId: string | null;
  hypothesis: string | null;
  companyId: string;
  investment: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  canCreateValidated: boolean;
};

export type MemoryLike = {
  id?: string;
  companyId: string | null;
  family: string | null;
  kpi: string | null;
  polarity: MemoryPolarity | null;
  classification: ExperimentClassification | null;
  status?: MemoryStatus | null;
  origin?: MemoryOrigin | null;
  validated?: boolean;
  title?: string;
  lesson?: string;
  companyName?: string | null;
  segment?: string | null;
  baseline?: number | null;
  measuredResult?: number | null;
  confidence?: MemoryConfidenceLevel | null;
  opportunityId?: string | null;
};

export type RepetitionSummary = {
  total: number;
  positive: number;
  partial: number;
  inconclusive: number;
  refuted: number;
  label: string;
};

export type ScorePreview = {
  scoreBase: number;
  memoryAdjustment: number;
  scoreFinal: number;
  rankingChanged: false;
  explanation: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeMemoryText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function familyLabel(key: string | null | undefined): string {
  if (!key) return "Não classificada";
  return dimensionByKey(key)?.label ?? key;
}

export function resolveStrategicFamily(value: string | null | undefined): DiagnosticDimensionKey | null {
  if (!value) return null;
  if (dimensionByKey(value)) return value as DiagnosticDimensionKey;
  const alias = FAMILY_ALIASES[normalizeMemoryText(value)];
  return alias ?? null;
}

export function inferFamilyFromKpi(kpi: string | null | undefined): DiagnosticDimensionKey | null {
  const key = normalizeMemoryText(kpi);
  if (!key) return null;
  if (key.includes("indic")) return "referral";
  if (key.includes("convers")) return "conversion";
  if (key.includes("ticket") || key.includes("upsell") || key.includes("cross")) return "averageTicket";
  if (key.includes("recorr") || key.includes("assinat") || key.includes("retenc") || key.includes("fidel")) {
    return "recurrence";
  }
  if (key.includes("cmv") || key.includes("margem") || key.includes("ebitda") || key.includes("preco")) return "finance";
  if (key.includes("lead") || key.includes("aquis") || key.includes("trafego")) return "attraction";
  if (key.includes("produtiv") || key.includes("entrega") || key.includes("operac")) return "operations";
  return resolveStrategicFamily(kpi);
}

export function polarityFromClassification(classification: ExperimentClassification | null): MemoryPolarity {
  if (classification === "REFUTED") return "NEGATIVE";
  if (classification === "INCONCLUSIVE" || classification == null) return "INCONCLUSIVE";
  return "POSITIVE";
}

export function canCreateValidatedMemory(input: {
  origin?: MemoryOrigin | null;
  hasTraceableEvidence: boolean;
  experimentCompleted: boolean;
  hasMeasuredResult: boolean;
  classification?: ExperimentClassification | null;
}): boolean {
  if (!input.hasTraceableEvidence) return false;
  if (!input.experimentCompleted) return false;
  if (!input.hasMeasuredResult && !input.classification) return false;
  if (input.origin && input.origin !== "EXPERIMENT_EVIDENCE") return false;
  return true;
}

export function calculateMemoryConfidence(input: MemoryConfidenceInput): MemoryConfidenceResult {
  const reasons: string[] = [];

  if (input.origin === "OBSERVATION" || input.origin === "MANUAL_LESSON") {
    return {
      level: "LOW",
      score: 20,
      reasons: ["Observação ou lição manual não é aprendizado validado por evidência de experimento."],
    };
  }

  if (!input.hasTraceableEvidence) {
    return {
      level: "LOW",
      score: 10,
      reasons: ["Sem evidência rastreável vinculada ao experimento."],
    };
  }

  let score = 0;
  if (input.experimentCompleted) {
    score += 15;
    reasons.push("Experimento concluído.");
  }
  if (input.hasBaseline) {
    score += 15;
    reasons.push("Baseline disponível.");
  }
  if (input.hasTarget) {
    score += 10;
    reasons.push("Meta definida.");
  }
  if (input.hasMeasuredResult) {
    score += 15;
    reasons.push("Resultado medido.");
  }
  if (input.hasTraceableEvidence) {
    score += 20;
    reasons.push("Evidência rastreável.");
  }
  if (input.classification === "VALIDATED") {
    score += 15;
    reasons.push("Classificação: validado.");
  } else if (input.classification === "PARTIALLY_VALIDATED") {
    score += 8;
    reasons.push("Classificação: parcialmente validado.");
  } else if (input.classification === "REFUTED") {
    score += 12;
    reasons.push("Classificação: refutado — fracasso medido também é aprendizado.");
  } else if (input.classification === "INCONCLUSIVE") {
    reasons.push("Classificação: inconclusivo.");
  }
  if (input.humanApproved) {
    score += 10;
    reasons.push("Confirmação humana.");
  }
  if (input.repeatedValidationCount >= 1) {
    score += 8;
    reasons.push(`${input.repeatedValidationCount + 1} validações relacionadas.`);
  }
  if (input.repeatedValidationCount >= 2) {
    score += 7;
    reasons.push("Repetição reforça a confiança, sem transformar o aprendizado em verdade universal.");
  }

  score = clamp(score, 0, 100);

  const measuredClear =
    input.classification === "VALIDATED" || input.classification === "REFUTED" || input.classification === "PARTIALLY_VALIDATED";
  const singleValidation = input.repeatedValidationCount < 1;

  let level: MemoryConfidenceLevel = "LOW";
  if (!input.experimentCompleted || !input.hasMeasuredResult || input.classification === "INCONCLUSIVE") {
    level = "LOW";
    if (input.classification === "INCONCLUSIVE") {
      reasons.push("Teste inconclusivo permanece com confiança baixa.");
    }
  } else if (
    score >= 75 &&
    input.humanApproved &&
    !singleValidation &&
    measuredClear &&
    input.hasBaseline
  ) {
    level = "HIGH";
  } else if (score >= 45 && measuredClear) {
    level = "MEDIUM";
    if (singleValidation) {
      reasons.push("Uma única validação gera memória válida, mas não confiança máxima.");
    }
  }

  return { level, score, reasons };
}

export function compareMemoryContexts(source: MemoryContext, target: MemoryContext): ContextComparison {
  const sameCompany = Boolean(source.companyId && source.companyId === target.companyId);
  const sameSegment = Boolean(
    normalizeMemoryText(source.segment) && normalizeMemoryText(source.segment) === normalizeMemoryText(target.segment),
  );
  const sameFamily = Boolean(source.family && source.family === target.family);
  const sameKpi = Boolean(
    normalizeMemoryText(source.kpi) && normalizeMemoryText(source.kpi) === normalizeMemoryText(target.kpi),
  );
  const sameOpportunity = Boolean(source.opportunityId && source.opportunityId === target.opportunityId);
  const sameObjective = sameFamily || Boolean(
    normalizeMemoryText(source.objective) &&
      normalizeMemoryText(source.objective) === normalizeMemoryText(target.objective),
  );

  let operationalBand: MemoryConfidenceLevel = "LOW";
  if (isFiniteNumber(source.teamSize) && isFiniteNumber(target.teamSize) && source.teamSize > 0 && target.teamSize > 0) {
    const ratio = source.teamSize / target.teamSize;
    if (ratio >= 0.7 && ratio <= 1.3) operationalBand = "HIGH";
    else if (ratio >= 0.5 && ratio <= 2) operationalBand = "MEDIUM";
  } else if (isFiniteNumber(source.units) && isFiniteNumber(target.units) && source.units > 0 && target.units > 0) {
    const ratio = source.units / target.units;
    if (ratio >= 0.7 && ratio <= 1.3) operationalBand = "HIGH";
    else if (ratio >= 0.5 && ratio <= 2) operationalBand = "MEDIUM";
  }

  const reasons: string[] = [];
  if (sameCompany) reasons.push("Mesma empresa.");
  if (sameOpportunity) reasons.push("Mesma oportunidade.");
  if (sameFamily) reasons.push(`Mesma família estratégica (${familyLabel(source.family)}).`);
  if (sameKpi) reasons.push("Mesmo KPI.");
  if (sameSegment) reasons.push("Mesmo segmento.");
  if (!sameCompany && (sameFamily || sameKpi)) {
    reasons.push("Mecanismo semelhante em outro contexto — memória transversal.");
  }

  let kind: ContextComparison["kind"] = "UNRELATED";
  if (sameCompany && (sameOpportunity || (sameFamily && sameKpi))) kind = "EXACT";
  else if (sameFamily || sameKpi) kind = "TRANSVERSAL";

  if (kind === "UNRELATED") reasons.push("Contextos pouco relacionados.");
  return {
    sameCompany,
    sameSegment,
    sameFamily,
    sameKpi,
    sameOpportunity,
    sameObjective,
    operationalBand,
    kind,
    reasons,
  };
}

export function formatTransferabilityLabel(score: number): string {
  const safe = Number.isFinite(score) ? clamp(Math.round(score), 0, 100) : 0;
  return `Compatibilidade estratégica: ${safe}/100`;
}

export function calculateTransferability(input: TransferabilityInput): TransferabilityResult {
  const comparison = compareMemoryContexts(input.source, input.target);
  let score = 0;
  const factors: string[] = [];

  if (comparison.sameFamily) {
    score += 25;
    factors.push("Similaridade de mecanismo: mesma família estratégica.");
  }
  if (comparison.sameObjective) {
    score += 20;
    factors.push("Similaridade de objetivo: dimensão/objetivo alinhados.");
  }
  if (comparison.sameKpi) {
    score += 20;
    factors.push("Similaridade de KPI.");
  }
  if (comparison.sameSegment) {
    score += 15;
    factors.push("Similaridade de público/segmento.");
  } else {
    factors.push("Segmento diferente ou ausente — não inventado.");
  }
  if (comparison.operationalBand === "HIGH") {
    score += 10;
    factors.push("Similaridade operacional alta (porte comparável).");
  } else if (comparison.operationalBand === "MEDIUM") {
    score += 6;
    factors.push("Similaridade operacional média.");
  } else {
    factors.push("Similaridade operacional baixa ou sem dado de porte.");
  }

  if (input.evidenceQuality === "VALIDATED") {
    score += 10;
    factors.push("Qualidade da evidência: validada.");
  } else if (input.evidenceQuality === "REFUTED") {
    score += 8;
    factors.push("Qualidade da evidência: fracasso medido.");
  } else if (input.evidenceQuality === "PARTIALLY_VALIDATED") {
    score += 6;
    factors.push("Qualidade da evidência: parcial.");
  } else {
    factors.push("Qualidade da evidência limitada.");
  }

  score = clamp(score, 0, 100);
  const band: MemoryConfidenceLevel = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

  return {
    score,
    band,
    label: formatTransferabilityLabel(score),
    factors,
    warning:
      "Transferibilidade não é probabilidade de sucesso. Uma estratégia funcionar em uma empresa não significa que funcionará em outra.",
  };
}

function missingLabel(value: unknown, fallback = "não informado"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function buildSuggestedLesson(source: EvidenceMemorySource): string {
  const polarity = polarityFromClassification(source.classification);
  const kpi = source.kpi ?? "KPI";
  if (polarity === "POSITIVE") {
    if (isFiniteNumber(source.baseline) && isFiniteNumber(source.measuredResult)) {
      return `${source.experimentTitle ?? "O experimento"} funcionou: ${kpi} saiu de ${source.baseline} para ${source.measuredResult}.`;
    }
    return `${source.experimentTitle ?? "O experimento"} apresentou melhoria mensurável em ${kpi}.`;
  }
  if (polarity === "NEGATIVE") {
    if (isFiniteNumber(source.investment)) {
      return `${source.experimentTitle ?? "O experimento"} não funcionou: investimento realizado de ${source.investment} sem melhoria de ${kpi}.`;
    }
    return `${source.experimentTitle ?? "O experimento"} não melhorou ${kpi}. Fracasso medido também é aprendizado.`;
  }
  return `Teste inconclusivo em ${kpi}: baseline ou comparação insuficiente. A hipótese permanece hipótese.`;
}

export function buildMemoryFromEvidence(
  source: EvidenceMemorySource,
  extras?: { repeatedValidationCount?: number; humanApproved?: boolean },
): BuiltMemoryDraft {
  const family = source.family ?? inferFamilyFromKpi(source.kpi);
  const polarity = polarityFromClassification(source.classification);
  const canCreateValidated = canCreateValidatedMemory({
    origin: "EXPERIMENT_EVIDENCE",
    hasTraceableEvidence: Boolean(source.evidenceId),
    experimentCompleted: source.experimentCompleted,
    hasMeasuredResult: isFiniteNumber(source.measuredResult),
    classification: source.classification,
  });
  const confidence = calculateMemoryConfidence({
    origin: "EXPERIMENT_EVIDENCE",
    experimentCompleted: source.experimentCompleted,
    hasBaseline: isFiniteNumber(source.baseline),
    hasTarget: isFiniteNumber(source.target),
    hasMeasuredResult: isFiniteNumber(source.measuredResult),
    hasTraceableEvidence: Boolean(source.evidenceId),
    classification: source.classification,
    humanApproved: extras?.humanApproved ?? false,
    repeatedValidationCount: extras?.repeatedValidationCount ?? 0,
  });

  const contextParts = [
    `Empresa: ${source.companyName}.`,
    source.segment ? `Segmento: ${source.segment}.` : "Segmento: não informado.",
    family ? `Família estratégica: ${familyLabel(family)}.` : "Família estratégica: não classificada.",
    `KPI: ${missingLabel(source.kpi)}.`,
    `Baseline: ${missingLabel(source.baseline)}.`,
    `Meta: ${missingLabel(source.target)}.`,
    `Resultado: ${missingLabel(source.measuredResult)}.`,
  ];
  if (isFiniteNumber(source.teamSize)) contextParts.push(`Equipe: ${source.teamSize}.`);
  if (isFiniteNumber(source.units)) contextParts.push(`Unidades: ${source.units}.`);
  if (source.periodStart || source.periodEnd) {
    contextParts.push(`Período: ${missingLabel(source.periodStart)} → ${missingLabel(source.periodEnd)}.`);
  }
  if (isFiniteNumber(source.investment)) contextParts.push(`Investimento realizado: ${source.investment}.`);

  const limitations: string[] = [];
  if (!isFiniteNumber(source.baseline)) limitations.push("Baseline ausente — comparação limitada.");
  if (!isFiniteNumber(source.target)) limitations.push("Meta não definida.");
  if (source.classification === "INCONCLUSIVE") limitations.push("Resultado inconclusivo.");
  if (source.classification === "PARTIALLY_VALIDATED") limitations.push("Melhoria parcial — não generalizar.");
  limitations.push("Memória não é verdade universal. Sucesso em uma empresa não se transfere automaticamente.");

  return {
    origin: "EXPERIMENT_EVIDENCE",
    title: `Aprendizado · ${source.experimentTitle ?? source.evidenceTitle}`,
    lesson: buildSuggestedLesson(source),
    context: contextParts.join(" "),
    segment: source.segment,
    kpi: source.kpi,
    family,
    baseline: isFiniteNumber(source.baseline) ? source.baseline : null,
    target: isFiniteNumber(source.target) ? source.target : null,
    measuredResult: isFiniteNumber(source.measuredResult) ? source.measuredResult : null,
    classification: source.classification,
    polarity,
    limitations: limitations.join(" "),
    conditions: source.conditions ?? source.testDescription,
    confidence,
    evidenceId: source.evidenceId,
    experimentId: source.experimentId,
    opportunityId: source.opportunityId,
    strategyId: source.strategyId,
    hypothesis: source.hypothesis,
    companyId: source.companyId,
    investment: isFiniteNumber(source.investment) ? source.investment : null,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    canCreateValidated,
  };
}

export function detectConflictingMemories(memories: MemoryLike[]): Array<{ a: MemoryLike; b: MemoryLike; reason: string }> {
  const active = memories.filter((item) => item.status !== "REJECTED");
  const pairs: Array<{ a: MemoryLike; b: MemoryLike; reason: string }> = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      const sameFamily = Boolean(a.family && a.family === b.family);
      const sameKpi = Boolean(normalizeMemoryText(a.kpi) && normalizeMemoryText(a.kpi) === normalizeMemoryText(b.kpi));
      const opposite =
        (a.polarity === "POSITIVE" && b.polarity === "NEGATIVE") ||
        (a.polarity === "NEGATIVE" && b.polarity === "POSITIVE");
      if ((sameFamily || sameKpi) && opposite) {
        pairs.push({
          a,
          b,
          reason: "Evidências divergentes. Os dois contextos são preservados — um não sobrescreve o outro.",
        });
      }
    }
  }
  return pairs;
}

export function countEvidenceRepetition(items: Array<{ classification: ExperimentClassification | null }>): RepetitionSummary {
  const summary: RepetitionSummary = {
    total: items.length,
    positive: items.filter((item) => item.classification === "VALIDATED").length,
    partial: items.filter((item) => item.classification === "PARTIALLY_VALIDATED").length,
    inconclusive: items.filter((item) => item.classification === "INCONCLUSIVE").length,
    refuted: items.filter((item) => item.classification === "REFUTED").length,
    label: items.length === 1 ? "1 validação" : `${items.length} validações`,
  };
  return summary;
}

export function prioritizeRelatedMemories<T extends MemoryLike>(
  items: T[],
  target: MemoryContext,
): Array<T & { matchKind: ContextComparison["kind"]; transferability: TransferabilityResult }> {
  const ranked = items.map((item) => {
    const comparison = compareMemoryContexts(
      {
        companyId: item.companyId,
        segment: item.segment ?? null,
        family: item.family,
        kpi: item.kpi,
        opportunityId: item.opportunityId ?? null,
        teamSize: null,
        units: null,
      },
      target,
    );
    const transferability = calculateTransferability({
      source: {
        companyId: item.companyId,
        segment: item.segment ?? null,
        family: item.family,
        kpi: item.kpi,
        opportunityId: null,
        teamSize: null,
        units: null,
      },
      target,
      evidenceQuality: item.classification,
    });
    return { ...item, matchKind: comparison.kind, transferability };
  });
  ranked.sort((a, b) => {
    const order = { EXACT: 0, TRANSVERSAL: 1, UNRELATED: 2 };
    if (order[a.matchKind] !== order[b.matchKind]) return order[a.matchKind] - order[b.matchKind];
    return b.transferability.score - a.transferability.score;
  });
  return ranked;
}

export function previewMemoryScoreImpact(scoreBase: number, memories: MemoryLike[]): ScorePreview {
  if (!Number.isFinite(scoreBase)) {
    return {
      scoreBase: 0,
      memoryAdjustment: 0,
      scoreFinal: 0,
      rankingChanged: false,
      explanation: "Score base inválido. Ranking original preservado.",
    };
  }

  const approved = memories.filter(
    (item) =>
      item.status === "APPROVED" &&
      item.origin === "EXPERIMENT_EVIDENCE" &&
      item.validated !== false,
  );

  if (approved.length === 0) {
    return {
      scoreBase,
      memoryAdjustment: 0,
      scoreFinal: scoreBase,
      rankingChanged: false,
      explanation: "Sem evidência real validada: score original preservado.",
    };
  }

  const conflicts = detectConflictingMemories(approved);
  if (conflicts.length > 0) {
    return {
      scoreBase,
      memoryAdjustment: 0,
      scoreFinal: scoreBase,
      rankingChanged: false,
      explanation: "Evidências divergentes. Preview sem ajuste — o ranking original permanece.",
    };
  }

  let raw = 0;
  for (const item of approved) {
    const confidenceBoost = item.confidence === "HIGH" ? 1 : item.confidence === "MEDIUM" ? 0.7 : 0.4;
    if (item.polarity === "POSITIVE" && item.classification === "VALIDATED") raw += 12 * confidenceBoost;
    else if (item.polarity === "POSITIVE") raw += 6 * confidenceBoost;
    else if (item.polarity === "NEGATIVE") raw -= 10 * confidenceBoost;
  }

  const memoryAdjustment = clamp(Math.round(raw), -MAX_MEMORY_SCORE_ADJUSTMENT, MAX_MEMORY_SCORE_ADJUSTMENT);
  const scoreFinal = clamp(scoreBase + memoryAdjustment, 0, 100);

  return {
    scoreBase,
    memoryAdjustment,
    scoreFinal,
    rankingChanged: false,
    explanation:
      memoryAdjustment === 0
        ? "Memória relacionada sem força suficiente para preview de ajuste. Ranking original preservado."
        : `Preview de impacto (não aplicado ao ranking): base ${scoreBase}, ajuste de memória ${memoryAdjustment > 0 ? "+" : ""}${memoryAdjustment}, final ${scoreFinal}. Limite global ±${MAX_MEMORY_SCORE_ADJUSTMENT}.`,
  };
}

export function buildMemoryExplanation(memory: {
  companyName: string | null;
  family: string | null;
  kpi: string | null;
  baseline: number | null;
  measuredResult: number | null;
  polarity: MemoryPolarity | null;
  origin: MemoryOrigin | null;
  validated: boolean;
}): string {
  const company = memory.companyName ?? "uma empresa do portfólio";
  const family = familyLabel(memory.family);
  const kpi = memory.kpi ?? "o KPI acompanhado";
  if (memory.origin !== "EXPERIMENT_EVIDENCE") {
    return `Esta referência é uma ${MEMORY_ORIGIN_LABELS[memory.origin ?? "OBSERVATION"].toLowerCase()} registrada em ${company}, não um aprendizado validado por evidência.`;
  }
  if (isFiniteNumber(memory.baseline) && isFiniteNumber(memory.measuredResult)) {
    return `Esta recomendação está relacionada a um experimento ${memory.validated ? "validado" : "registrado"} em ${company}, no qual o mecanismo de ${family} moveu ${kpi} de ${memory.baseline} para ${memory.measuredResult}.`;
  }
  if (memory.polarity === "NEGATIVE") {
    return `Esta recomendação está relacionada a um experimento em ${company} no qual o mecanismo de ${family} não melhorou ${kpi}. Fracasso medido também é aprendizado.`;
  }
  return `Esta recomendação está relacionada a um experimento em ${company} sobre o mecanismo de ${family} e o KPI ${kpi}. Apenas valores persistidos são exibidos.`;
}
