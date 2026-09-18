import type { SourceHierarchy } from "@/lib/research-config";
import type { NormalizedSource } from "@/lib/research-engine";
import type { ResearchQueryPlan } from "@/lib/research-query";

export type ExternalClaimType =
  | "EXAMPLE"
  | "FORMULA"
  | "REFERENCE"
  | "BENCHMARK"
  | "STATISTIC"
  | "OFFICIAL_DATA"
  | "OPINION"
  | "UNKNOWN";

export type SourceQualityLevel = "A" | "B" | "C" | "D" | "E";

export type SemanticPercent = {
  value: number;
  rangeMax?: number;
  context: string;
  ignoredReason?: "formula" | "multiplier" | "unrelated";
};

export type BenchmarkValidation = {
  claimType: ExternalClaimType;
  qualityLevel: SourceQualityLevel;
  benchmarkEligible: boolean;
  nationalEligible: boolean;
  displayType: string;
  usageReason: string;
  suspectedOutlier: boolean;
  values: number[];
  statedRange: { min: number; max: number } | null;
  hasSegmentSupport: boolean;
  hasGeographySupport: boolean;
  hasSampleSupport: boolean;
  hasMethodologySupport: boolean;
};

export type CitedExternalClaim = {
  text: string;
  sourceIds: string[];
  claimType: ExternalClaimType;
};

export type BenchmarkSynthesis = {
  summary: string;
  divergenceNote: string | null;
  divergent: boolean;
  nationalEligible: boolean;
  cited: CitedExternalClaim[];
  valuesUsed: number[];
};

const FORBIDDEN_NATIONAL =
  /m[eé]dia (brasileira|nacional|do mercado) (é|fica|varia)|benchmark brasileiro é|mercado trabalha em|cmv m[eé]dio saud[aá]vel|o ideal (é|fica) \d/i;

export function sourceIdOf(source: Pick<NormalizedSource, "url" | "title" | "domain">): string {
  return (source.url || `${source.domain ?? "src"}:${source.title}`).slice(0, 180);
}

export function extractSemanticPercents(text: string): SemanticPercent[] {
  const results: SemanticPercent[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*%/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const raw = match[1].replace(",", ".");
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) continue;
    const start = Math.max(0, match.index - 48);
    const end = Math.min(text.length, match.index + match[0].length + 48);
    const context = text.slice(start, end);
    const hay = context.toLowerCase();
    if (/multiplique por|multiplicar por|vezes 100|x\s*100|×\s*100|\*\s*100|por 100\b/.test(hay)) {
      results.push({ value, context, ignoredReason: "multiplier" });
      continue;
    }
    if (/\(([^)]+)\)\s*\*\s*100|f[oó]rmula/.test(hay) && value === 100) {
      results.push({ value, context, ignoredReason: "formula" });
      continue;
    }
    results.push({ value, context });
  }
  return results;
}

export function usablePercents(text: string): number[] {
  return extractSemanticPercents(text)
    .filter((item) => !item.ignoredReason)
    .map((item) => item.value);
}

export function classifyExternalClaim(text: string): ExternalClaimType {
  const hay = text.toLowerCase();
  if (
    /multiplique por 100|multiplicar por 100|\*\s*100|f[oó]rmula (do |de )?cmv|cmv\s*=\s*|divida .* 100/.test(hay)
  ) {
    return "FORMULA";
  }
  if (
    /exemplo (de )?(c[aá]lculo|pr[aá]tico)|calculadora|vamos (ao )?c[aá]lculo|supondo|se (a )?receita (for|é)|calcule o (cmv|indicador)|estoque inicial/.test(
      hay,
    )
  ) {
    return "EXAMPLE";
  }
  if (/acho que|na minha experi[eê]ncia|opini[aã]o|acredito que/.test(hay)) return "OPINION";
  if (/ibge|dado oficial|di[aá]rio oficial|portaria|instru[cç][aã]o normativa|banco central/.test(hay)) {
    return "OFFICIAL_DATA";
  }
  if (
    /pesquisa (realizada|com \d)|amostra de \d|estudo (encontrou|com \d)|m[eé]dia observada|em \d[\d.]* (restaurantes|empresas|estabelecimentos)/.test(
      hay,
    )
  ) {
    return "STATISTIC";
  }
  if (
    /benchmark|m[eé]dia (de|do|da|nacional|brasileira|setorial|do mercado)|percentual m[eé]dio (de|do|nacional)/.test(hay)
  ) {
    return "BENCHMARK";
  }
  if (/ideal|saud[aá]vel|pode variar|faixa t[ií]pica|recomendad|refer[eê]ncia|entre \d/.test(hay)) {
    return "REFERENCE";
  }
  if (/(\d+(?:[.,]\d+)?)\s*%/.test(text)) return "UNKNOWN";
  return "UNKNOWN";
}

export function qualityLevelFor(
  claimType: ExternalClaimType,
  sourceType: SourceHierarchy,
  extras: { methodology?: boolean; sample?: boolean; geography?: boolean },
): SourceQualityLevel {
  if (claimType === "EXAMPLE" || claimType === "FORMULA" || claimType === "OPINION") return "D";
  if (claimType === "UNKNOWN") return "E";
  if ((sourceType === "official" || sourceType === "regulator") && (claimType === "OFFICIAL_DATA" || extras.geography)) {
    return "A";
  }
  if ((claimType === "STATISTIC" || claimType === "BENCHMARK") && (extras.methodology || extras.sample || sourceType === "study")) {
    return "B";
  }
  if (claimType === "REFERENCE" || claimType === "BENCHMARK" || claimType === "STATISTIC") return "C";
  return "E";
}

export function displayTypeFor(claimType: ExternalClaimType, sourceType: SourceHierarchy): string {
  if (sourceType === "official" || sourceType === "regulator" || claimType === "OFFICIAL_DATA") return "FONTE OFICIAL";
  if (claimType === "STATISTIC" || sourceType === "study") return "ESTUDO SETORIAL";
  if (claimType === "BENCHMARK") return "BENCHMARK";
  if (claimType === "EXAMPLE" || claimType === "FORMULA") return "EXEMPLO";
  if (claimType === "REFERENCE") return "REFERÊNCIA ESPECIALIZADA";
  return "FONTE SECUNDÁRIA";
}

function textBlob(source: Pick<NormalizedSource, "title" | "snippet" | "domain" | "publisher">): string {
  return `${source.title} ${source.snippet} ${source.domain ?? ""} ${source.publisher ?? ""}`;
}

export function detectStatedRange(text: string): { min: number; max: number } | null {
  const usable = extractSemanticPercents(text).filter((item) => !item.ignoredReason);
  const patterns = [
    /entre\s+(\d+(?:[.,]\d+)?)\s*%?\s*e\s+(\d+(?:[.,]\d+)?)\s*%/i,
    /(\d+(?:[.,]\d+)?)\s*%?\s*[–\-]\s*(\d+(?:[.,]\d+)?)\s*%/,
    /(\d+(?:[.,]\d+)?)\s*%?\s+a\s+(\d+(?:[.,]\d+)?)\s*%/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const min = Number(match[1].replace(",", "."));
    const max = Number(match[2].replace(",", "."));
    if (Number.isFinite(min) && Number.isFinite(max) && max >= min && max <= 100) return { min, max };
  }
  if (usable.length === 1) return { min: usable[0].value, max: usable[0].value };
  if (usable.length === 2) {
    const min = Math.min(usable[0].value, usable[1].value);
    const max = Math.max(usable[0].value, usable[1].value);
    if (max - min <= 25) return { min, max };
  }
  return null;
}

export function isSuspectedOutlier(values: number[], all: number[]): boolean {
  const usable = all.filter((item) => item < 90);
  if (!values.length) return false;
  if (values.some((item) => item >= 90) && usable.length && Math.max(...usable) <= 50) return true;
  if (usable.length >= 2) {
    const median = [...usable].sort((a, b) => a - b)[Math.floor(usable.length / 2)];
    return values.some((item) => item >= 90 || (median > 0 && item > median * 2.2));
  }
  return values.some((item) => item >= 95);
}

export function validateBenchmarkClaim(
  source: NormalizedSource,
  plan: Pick<ResearchQueryPlan, "segment" | "country" | "metric" | "intent">,
): BenchmarkValidation {
  const text = textBlob(source);
  const hay = text.toLowerCase();
  const claimType = classifyExternalClaim(text);
  const values = usablePercents(text);
  const hasSegmentSupport = Boolean(
    plan.segment &&
      (hay.includes(plan.segment.toLowerCase()) ||
        (plan.segment === "restaurantes" && /restaur|food|alimenta|hambur/.test(hay))),
  );
  const hasGeographySupport = /brasil|brazil|nacional/.test(hay);
  const hasSampleSupport = /amostra|pesquisa com \d|em \d[\d.]* (restaurantes|empresas|estabelecimentos)/.test(hay);
  const hasMethodologySupport = /metodolog|amostra|pesquisa realizada|estudo (com|de|encontrou)/.test(hay);
  const suspectedOutlier = isSuspectedOutlier(values, values);
  const qualityLevel = qualityLevelFor(claimType, source.sourceType, {
    methodology: hasMethodologySupport,
    sample: hasSampleSupport,
    geography: hasGeographySupport,
  });
  const strongType = claimType === "BENCHMARK" || claimType === "STATISTIC" || claimType === "OFFICIAL_DATA";
  const benchmarkEligible =
    strongType && !suspectedOutlier && (hasSegmentSupport || hasGeographySupport) && qualityLevel !== "D" && qualityLevel !== "E";
  const nationalEligible =
    benchmarkEligible &&
    hasGeographySupport &&
    hasSegmentSupport &&
    (hasSampleSupport || hasMethodologySupport || source.sourceType === "official" || source.sourceType === "study");
  const displayType = displayTypeFor(claimType, source.sourceType);
  const usageReason = nationalEligible
    ? "Afirma média/faixa com recorte de segmento e geografia. Não é evidência interna."
    : benchmarkEligible
      ? "Usada como referência de média declarada pela fonte, sem consolidar média nacional oficial."
      : claimType === "REFERENCE"
        ? "Usada como referência prática, não média nacional."
        : claimType === "EXAMPLE" || claimType === "FORMULA"
          ? "Exemplo ou fórmula. Não entra na síntese de benchmark."
          : "Contexto insuficiente para promover a benchmark.";

  return {
    claimType,
    qualityLevel,
    benchmarkEligible,
    nationalEligible,
    displayType,
    usageReason,
    suspectedOutlier,
    values,
    statedRange: detectStatedRange(text),
    hasSegmentSupport,
    hasGeographySupport,
    hasSampleSupport,
    hasMethodologySupport,
  };
}

export function hasForbiddenNationalLanguage(text: string): boolean {
  return FORBIDDEN_NATIONAL.test(text);
}

export function synthesizeBenchmark(input: {
  companyName: string;
  metricLabel: string;
  internalValue: number | null;
  sources: Array<NormalizedSource & { validation?: BenchmarkValidation }>;
  plan: Pick<ResearchQueryPlan, "segment" | "country" | "metric" | "intent">;
}): BenchmarkSynthesis {
  const classified = input.sources.map((source) => ({
    source,
    id: sourceIdOf(source),
    validation: source.validation ?? validateBenchmarkClaim(source, input.plan),
  }));
  const cited: CitedExternalClaim[] = [];
  const eligible = classified.filter(
    (item) =>
      (item.validation.benchmarkEligible ||
        item.validation.claimType === "REFERENCE" ||
        item.validation.claimType === "BENCHMARK" ||
        item.validation.claimType === "STATISTIC" ||
        item.validation.claimType === "OFFICIAL_DATA") &&
      !item.validation.suspectedOutlier &&
      item.validation.claimType !== "EXAMPLE" &&
      item.validation.claimType !== "FORMULA",
  );
  const national = classified.filter((item) => item.validation.nationalEligible);
  const ranges = eligible
    .map((item) => item.validation.statedRange)
    .filter((item): item is { min: number; max: number } => Boolean(item));
  const valuesUsed = eligible.flatMap((item) => {
    if (item.validation.statedRange) return [item.validation.statedRange.min, item.validation.statedRange.max];
    return item.validation.values.filter((value) => value < 90);
  });

  const internal =
    input.internalValue == null ? `${input.metricLabel} da ${input.companyName} não informado` : `${input.metricLabel} da ${input.companyName}: ${formatPct(input.internalValue)}`;

  if (!input.sources.length) {
    return {
      summary: `${internal}. Não encontrei fonte suficientemente confiável para afirmar uma média nacional de CMV para este segmento.`,
      divergenceNote: null,
      divergent: false,
      nationalEligible: false,
      cited: [],
      valuesUsed: [],
    };
  }

  for (const item of eligible) {
    const range = item.validation.statedRange;
    if (!range) continue;
    const label = range.min === range.max ? `${range.min}%` : `${range.min}–${range.max}%`;
    cited.push({
      text: `${item.source.title}: ${label} (${item.validation.displayType})`,
      sourceIds: [item.id],
      claimType: item.validation.claimType,
    });
  }

  const uniqueRanges = uniqueRangeLabels(ranges);
  const quoted = uniqueRanges.join("; ");
  const divergent = uniqueRanges.length > 1;
  let divergenceNote: string | null = null;
  if (divergent) {
    const parts = classified
      .filter((item) => item.validation.statedRange && item.validation.claimType !== "EXAMPLE" && item.validation.claimType !== "FORMULA")
      .map((item) => {
        const range = item.validation.statedRange!;
        const label = range.min === range.max ? `${range.min}%` : `${range.min}–${range.max}%`;
        return `${item.validation.displayType} cita ${label}`;
      });
    const discarded = classified.filter(
      (item) => item.validation.claimType === "EXAMPLE" || item.validation.claimType === "FORMULA" || item.validation.suspectedOutlier,
    ).length;
    divergenceNote = `${eligible.length} fonte(s) relevantes com faixas diferentes. ${parts.join(". ")}${discarded ? ` ${discarded} conteúdo(s) tratado(s) como exemplo/outlier, não como média.` : ""} Nenhuma faixa combinada foi inventada.`;
  }

  const nearby =
    input.internalValue != null &&
    valuesUsed.length > 0 &&
    valuesUsed.some((value) => Math.abs(value - input.internalValue!) <= 8);

  let summary: string;
  if (!national.length && eligible.length) {
    summary = `${internal}. As fontes consultadas citam ${quoted || "referências práticas"}, mas não há sustentação suficiente para afirmar uma média nacional.`;
    if (nearby && input.internalValue != null) {
      summary += ` O ${input.metricLabel} de ${formatPct(input.internalValue)} está dentro das referências encontradas. Isso é uma comparação indicativa, não uma validação estatística.`;
    }
  } else if (national.length) {
    if (national.length === 1) {
      summary = `${internal}. Uma fonte afirma ${quoted || "uma média setorial"} com recorte geográfico. Não generalizar como média nacional sem outras confirmações e metodologia.`;
    } else if (divergent) {
      summary = `${internal}. Fontes relevantes apresentam valores diferentes (${quoted}). Nenhuma média única foi escolhida. Isso não é estatística oficial consolidada.`;
    } else {
      summary = `${internal}. Fontes com recorte de segmento e geografia citam ${quoted}. Sem amostra ampla compartilhada, não consolidar como média nacional oficial.`;
    }
  } else {
    summary = `${internal}. Não encontrei fonte suficientemente confiável para afirmar uma média nacional de CMV para este segmento.`;
  }
  if (divergent && !/valores diferentes/i.test(summary)) {
    summary += " Fontes apresentam valores diferentes.";
  }

  if (hasForbiddenNationalLanguage(summary)) {
    summary = `${internal}. Não encontrei evidência suficiente para afirmar uma média nacional.`;
  }

  return {
    summary,
    divergenceNote,
    divergent,
    nationalEligible: national.length > 0,
    cited,
    valuesUsed,
  };
}

function uniqueRangeLabels(ranges: Array<{ min: number; max: number }>): string[] {
  return [...new Set(ranges.map((item) => (item.min === item.max ? `${item.min}%` : `${item.min}–${item.max}%`)))];
}

function formatPct(value: number): string {
  return `${Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",")}%`;
}

export function guardBenchmarkNarrative(narrative: string, synthesis: BenchmarkSynthesis): string | null {
  if (hasForbiddenNationalLanguage(narrative) && !synthesis.nationalEligible) return null;
  if (/0\s*%\s*[–\-]\s*100\s*%|28\s*%\s*[–\-]\s*100\s*%/.test(narrative)) return null;
  return narrative;
}

export function relevantInternalKinds(question: string): RegExp {
  if (/\bcmv\b|custo da mercadoria|food cost|cogs/i.test(question)) {
    return /cmv|faturamento|receita|margem/i;
  }
  if (/ebitda/i.test(question)) return /ebitda|margem|receita/i;
  if (/\bcac\b|ltv|roi|ticket/i.test(question)) return /cac|ltv|roi|ticket|receita/i;
  return /./;
}
