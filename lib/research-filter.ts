import { SOURCE_HIERARCHY_RANK, type SourceHierarchy } from "@/lib/research-config";
import {
  classifyExternalClaim,
  qualityLevelFor,
  validateBenchmarkClaim,
  type SourceQualityLevel,
} from "@/lib/research-claims";
import type { NormalizedSource } from "@/lib/research-engine";
import type { ResearchQueryPlan, ResearchTopicIntent } from "@/lib/research-query";
import {
  AGGREGATOR_DOMAINS,
  CALCULATOR_HINTS,
  DIRECTORY_HINTS,
  HOMONYM_ORG_SUFFIXES,
  detectMetricsInText,
} from "@/lib/research-terms";

export type SourceRejectReason =
  | "homonym"
  | "aggregator"
  | "directory"
  | "segment_mismatch"
  | "geography_mismatch"
  | "duplicate"
  | "low_relevance"
  | "example_only"
  | "no_metric_context"
  | "outlier_context"
  | "untrusted_source"
  | "semantic_mismatch"
  | "low_semantic_relevance";

export type ScoredSource = NormalizedSource & {
  relevanceScore: number;
  rejectReason?: SourceRejectReason;
  numericClaim?: "benchmark" | "example" | "unclear";
  claimType?: string;
  qualityLevel?: string;
  benchmarkEligible?: boolean;
  nationalEligible?: boolean;
  suspectedOutlier?: boolean;
  usageReason?: string;
  displayType?: string;
};

export type FilterResult = {
  accepted: ScoredSource[];
  rejected: ScoredSource[];
};

const MIN_ACCEPT = 38;
const MIN_SEMANTIC = 4;
const QUALITY_RANK: Record<SourceQualityLevel, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
const PRIMARY_CLAIMS = new Set(["OFFICIAL_DATA", "STATISTIC", "BENCHMARK", "REFERENCE"]);
const TECHNICAL_CLAIMS = new Set(["EXAMPLE", "FORMULA"]);
const OFF_TOPIC =
  /\bkart\b|futebol|campeonato de|copa brasil de|stock car|esporte a motor|celebridade|assassinato|homic[ií]dio|\bpol[ií]cia\b|elei[cç][aã]o|novela|\bbbb\b|reality show|f[oó]rmula 1|\bnba\b|\bnfl\b/i;

export function classifyNumericClaim(text: string): "benchmark" | "example" | "unclear" {
  const claim = classifyExternalClaim(text);
  if (claim === "EXAMPLE" || claim === "FORMULA") return "example";
  if (claim === "BENCHMARK" || claim === "STATISTIC" || claim === "OFFICIAL_DATA") return "benchmark";
  return "unclear";
}

export function isAggregatorDomain(domain: string | null): boolean {
  if (!domain) return false;
  return AGGREGATOR_DOMAINS.some((item) => domain === item || domain.endsWith(`.${item}`));
}

export function isDirectoryListing(text: string): boolean {
  const hay = text.toLowerCase();
  return DIRECTORY_HINTS.some((item) => hay.includes(item));
}

export function isCalculatorPage(text: string): boolean {
  const hay = text.toLowerCase();
  return CALCULATOR_HINTS.some((item) => hay.includes(item)) || /calculadora/.test(hay);
}

export function isAcronymHomonym(text: string, query: string): boolean {
  const metrics = detectMetricsInText(query);
  if (!metrics.length) return false;
  const hay = text.toLowerCase();
  return metrics.some((metric) => {
    const hasExpansion = metric.expansions.some((exp) => hay.includes(exp.toLowerCase()));
    const acronymRe = new RegExp(`\\b${escapeReg(metric.acronym)}\\b`, "i");
    if (!acronymRe.test(text)) return false;
    if (hasExpansion) return false;
    const org = new RegExp(
      `\\b${escapeReg(metric.acronym)}\\s+(${HOMONYM_ORG_SUFFIXES.join("|")})\\b`,
      "i",
    );
    if (org.test(text)) return true;
    const contextHit = metric.contextHints.some((hint) => hay.includes(hint.toLowerCase()));
    const financeHit =
      /custo|mercadoria|vendida|food\s?cost|\bcogs\b|margem|percentual|benchmark|m[eé]di[oa]|faixa|setor|calcular|c[aá]lculo|\d+(?:[.,]\d+)?\s*%/.test(
        hay,
      );
    return !contextHit && !financeHit;
  });
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blob(source: Pick<NormalizedSource, "title" | "snippet" | "domain" | "publisher">): string {
  return `${source.title} ${source.snippet} ${source.domain ?? ""} ${source.publisher ?? ""}`.toLowerCase();
}

function hasMetricSignal(text: string, plan: ResearchQueryPlan): boolean {
  const hay = text.toLowerCase();
  const metrics = detectMetricsInText(`${plan.query} ${plan.original} ${plan.metric ?? ""}`);
  if (metrics.some((metric) => new RegExp(`\\b${escapeReg(metric.acronym)}\\b`, "i").test(text))) return true;
  if (metrics.some((metric) => metric.expansions.some((exp) => hay.includes(exp.toLowerCase())))) return true;
  if (plan.metric === "CMV" || /\bcmv\b/i.test(`${plan.query} ${plan.original}`)) {
    return /custo da mercadoria|food\s?cost|\bcogs\b|ficha t[eé]cnica|mercadoria vendida/.test(hay);
  }
  if (plan.metric === "EBITDA" || /ebitda/i.test(`${plan.query} ${plan.original}`)) {
    return /ebitda|lucro antes de juros/.test(hay);
  }
  if (plan.metric === "CAC" || /\bcac\b/i.test(`${plan.query} ${plan.original}`)) {
    return /custo de aquisi[cç][aã]o|customer acquisition/.test(hay);
  }
  return false;
}

function hasSegmentSignal(text: string, plan: ResearchQueryPlan): boolean {
  const hay = text.toLowerCase();
  if (plan.segment && hay.includes(plan.segment.toLowerCase())) return true;
  if (plan.segment === "restaurantes") return /restaur|food|alimenta|hambur|lanchonete|bares?|food.?service/.test(hay);
  if (plan.segment === "oficinas") return /oficina|autope[cç]a|mec[aâ]nic/.test(hay);
  if (plan.segment) {
    const token = plan.segment.toLowerCase().replace(/s$/, "");
    if (token.length > 3 && hay.includes(token)) return true;
  }
  return false;
}

function hasOperationalSignal(text: string, plan: ResearchQueryPlan): boolean {
  const hay = text.toLowerCase();
  const metrics = detectMetricsInText(`${plan.query} ${plan.original} ${plan.metric ?? ""}`);
  if (metrics.some((metric) => metric.contextHints.some((hint) => hay.includes(hint.toLowerCase())))) return true;
  if (plan.metric === "CMV" || /\bcmv\b/i.test(`${plan.query} ${plan.original}`)) {
    return /estoque|compras|ficha t[eé]cnica|margem|custo|desperd[ií]cio|card[aá]pio/.test(hay);
  }
  return /indicador|kpi|percentual|benchmark|m[eé]dia|faixa|custo|margem/.test(hay);
}

export function isSemanticallyRelevantSource(
  source: Pick<NormalizedSource, "title" | "snippet" | "domain" | "publisher">,
  plan: ResearchQueryPlan,
): { relevant: boolean; score: number; reason?: SourceRejectReason } {
  const title = source.title ?? "";
  const snippet = source.snippet ?? "";
  const titleOff = OFF_TOPIC.test(title);
  const snippetOff = OFF_TOPIC.test(snippet);
  const titleLinked = hasMetricSignal(title, plan) || hasSegmentSignal(title, plan);
  if (titleOff && !titleLinked) {
    return { relevant: false, score: 0, reason: "semantic_mismatch" };
  }
  if (snippetOff && !titleLinked && !hasMetricSignal(snippet, plan) && !hasSegmentSignal(snippet, plan)) {
    return { relevant: false, score: 0, reason: "semantic_mismatch" };
  }

  let score = 0;
  if (hasMetricSignal(title, plan)) score += 3;
  if (hasMetricSignal(snippet, plan)) score += 2;
  if (hasSegmentSignal(title, plan)) score += 3;
  if (hasSegmentSignal(snippet, plan)) score += 2;
  if (hasOperationalSignal(`${title} ${snippet}`, plan)) score += 2;
  if (/benchmark|m[eé]dia|faixa|estudo|pesquisa|refer[eê]ncia/.test(`${title} ${snippet}`.toLowerCase())) score += 1;
  if (titleOff) score -= 6;
  if (snippetOff && !hasMetricSignal(snippet, plan)) score -= 3;
  if (!hasMetricSignal(`${title} ${snippet}`, plan) && !hasSegmentSignal(`${title} ${snippet}`, plan)) {
    return { relevant: false, score, reason: "low_semantic_relevance" };
  }
  if (score < MIN_SEMANTIC) return { relevant: false, score, reason: "low_semantic_relevance" };
  return { relevant: true, score };
}

export function isPrimarySourceClaim(claimType?: string, numericClaim?: string): boolean {
  if (numericClaim === "example") return false;
  if (!claimType) return true;
  return PRIMARY_CLAIMS.has(claimType);
}

export function scoreSourceRelevance(source: NormalizedSource, plan: ResearchQueryPlan): number {
  const text = blob(source);
  const validation = validateBenchmarkClaim(source, plan);
  let score = 20;
  const expansions = plan.expandedTerms.map((item) => item.toLowerCase());
  if (expansions.some((term) => term.length > 3 && text.includes(term))) score += 28;
  if (plan.metric && new RegExp(`\\b${escapeReg(plan.metric)}\\b`, "i").test(`${source.title} ${source.snippet}`)) {
    score += 10;
  }
  if (plan.segment && text.includes(plan.segment.toLowerCase())) score += 16;
  if (plan.segment === "restaurantes" && /restaur|food|alimenta|hambur|food.?service/.test(text)) score += 10;
  if (plan.country && /brasil|brazil/.test(plan.country.toLowerCase()) && /brasil|brazil|sebrae|nacional/.test(text)) {
    score += 12;
  }
  if (plan.intent === "BENCHMARK" && /benchmark|m[eé]dia|faixa|refer[eê]ncia|estudo|pesquisa|relat[oó]rio/.test(text)) {
    score += 14;
  }
  const qualityBoost: Record<SourceHierarchy, number> = {
    official: 18,
    regulator: 16,
    primary: 12,
    study: 10,
    business: 6,
    press: 4,
    secondary: 0,
    community: -6,
  };
  score += qualityBoost[source.sourceType];
  if (validation.claimType === "STATISTIC" || validation.claimType === "OFFICIAL_DATA") score += 12;
  if (validation.claimType === "BENCHMARK") score += 8;
  if (validation.hasMethodologySupport) score += 8;
  if (source.freshness === "recente") score += 6;
  if (source.freshness === "historica") score -= 2;
  if (isAggregatorDomain(source.domain)) score -= 40;
  if (isDirectoryListing(text)) score -= 30;
  if (isCalculatorPage(text) || validation.claimType === "EXAMPLE" || validation.claimType === "FORMULA") score -= 24;
  if (isAcronymHomonym(`${source.title} ${source.snippet} ${source.domain ?? ""}`, plan.query)) score -= 50;
  if (plan.country && /estados unidos|united states|\busa\b|europa|índia|\bindia\b/.test(text) && !/brasil|brazil/.test(text)) {
    score -= 18;
  }
  if (plan.segment === "restaurantes" && /software|informatics|teknoloji|saas|erp gen[eé]rico/.test(text) && !/restaur|food|custo da mercadoria/.test(text)) {
    score -= 20;
  }
  if (validation.suspectedOutlier) score -= 15;
  const semantic = isSemanticallyRelevantSource(source, plan);
  if (!semantic.relevant) score = Math.min(score, 20);
  if (semantic.reason === "semantic_mismatch") score = Math.min(score, 10);
  return Math.max(0, Math.min(100, score));
}

export function filterRelevantSources(sources: NormalizedSource[], plan: ResearchQueryPlan): FilterResult {
  const rejected: ScoredSource[] = [];
  const accepted: ScoredSource[] = [];
  const seenDomains = new Set<string>();

  for (const source of sources) {
    const text = blob(source);
    const validation = validateBenchmarkClaim(source, plan);
    const numericClaim = classifyNumericClaim(`${source.title} ${source.snippet}`);
    const relevanceScore = scoreSourceRelevance(source, plan);
    const scored: ScoredSource = {
      ...source,
      relevanceScore,
      numericClaim,
      claimType: validation.claimType,
      qualityLevel: validation.qualityLevel,
      benchmarkEligible: validation.benchmarkEligible,
      nationalEligible: validation.nationalEligible,
      suspectedOutlier: validation.suspectedOutlier,
      usageReason: validation.usageReason,
      displayType: validation.displayType,
      confidenceLabel: validation.displayType,
    };

    if (isAggregatorDomain(source.domain)) {
      rejected.push({ ...scored, rejectReason: "aggregator" });
      continue;
    }
    if (isDirectoryListing(text)) {
      rejected.push({ ...scored, rejectReason: "directory" });
      continue;
    }
    if (isAcronymHomonym(`${source.title} ${source.snippet} ${source.domain ?? ""}`, `${plan.query} ${plan.original}`)) {
      rejected.push({ ...scored, rejectReason: "homonym" });
      continue;
    }
    const semantic = isSemanticallyRelevantSource(source, plan);
    if (!semantic.relevant) {
      rejected.push({ ...scored, rejectReason: semantic.reason ?? "low_semantic_relevance" });
      continue;
    }
    if (
      plan.intent === "BENCHMARK" &&
      !/c[aá]lculo|f[oó]rmula|calculadora|como calcular/.test(plan.original) &&
      (TECHNICAL_CLAIMS.has(validation.claimType) || isCalculatorPage(text))
    ) {
      rejected.push({ ...scored, rejectReason: "example_only" });
      continue;
    }
    if (plan.segment === "restaurantes" && /oficina|software house|tecnologia da informa/.test(text) && !/restaur|food|alimenta/.test(text)) {
      rejected.push({ ...scored, rejectReason: "segment_mismatch" });
      continue;
    }
    if (
      plan.country.toLowerCase().includes("brasil") &&
      /united states|estados unidos|\busa\b/.test(text) &&
      !/brasil|brazil/.test(text)
    ) {
      rejected.push({ ...scored, rejectReason: "geography_mismatch" });
      continue;
    }
    const domainKey = (source.domain ?? source.url ?? source.title).toLowerCase();
    if (seenDomains.has(domainKey)) {
      rejected.push({ ...scored, rejectReason: "duplicate" });
      continue;
    }
    if (relevanceScore < MIN_ACCEPT) {
      rejected.push({ ...scored, rejectReason: "low_relevance" });
      continue;
    }
    if (!detectMetricsInText(`${plan.query} ${plan.original} ${source.title} ${source.snippet}`).length && plan.intent === "BENCHMARK") {
      rejected.push({ ...scored, rejectReason: "no_metric_context" });
      continue;
    }
    seenDomains.add(domainKey);
    accepted.push(scored);
  }

  accepted.sort(
    (a, b) =>
      QUALITY_RANK[(a.qualityLevel as SourceQualityLevel) ?? "E"] - QUALITY_RANK[(b.qualityLevel as SourceQualityLevel) ?? "E"] ||
      b.relevanceScore - a.relevanceScore ||
      SOURCE_HIERARCHY_RANK[a.sourceType] - SOURCE_HIERARCHY_RANK[b.sourceType],
  );
  return { accepted, rejected };
}

export function selectSourcesForIntent(accepted: ScoredSource[], intent: ResearchTopicIntent, question?: string): ScoredSource[] {
  const wantsFormula = /c[aá]lculo|f[oó]rmula|calculadora|como calcular/.test(question ?? "");
  const primary =
    intent === "BENCHMARK" && !wantsFormula
      ? accepted.filter(
          (item) => isPrimarySourceClaim(item.claimType, item.numericClaim) && !isCalculatorPage(`${item.title} ${item.snippet}`),
        )
      : accepted;
  const max = intent === "BENCHMARK" ? 4 : 5;
  return primary.slice(0, max);
}

export function hasTrustworthyBenchmark(sources: ScoredSource[]): boolean {
  return sources.some((item) => item.nationalEligible || (item.numericClaim === "benchmark" && item.benchmarkEligible));
}

export function hasSufficientOfficialLayer(sources: ScoredSource[]): boolean {
  return sources.some((item) => item.qualityLevel === "A" || item.qualityLevel === "B");
}

export function referenceOnlySources(sources: ScoredSource[]): ScoredSource[] {
  return sources.filter((item) => item.claimType !== "EXAMPLE" && item.claimType !== "FORMULA");
}

export function qualityLevelOf(source: NormalizedSource): SourceQualityLevel {
  const claim = classifyExternalClaim(`${source.title} ${source.snippet}`);
  return qualityLevelFor(claim, source.sourceType, {});
}
