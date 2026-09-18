import { SOURCE_HIERARCHY_RANK, type SourceHierarchy } from "@/lib/research-config";
import type { NormalizedSource } from "@/lib/research-engine";
import type { ResearchQueryPlan, ResearchTopicIntent } from "@/lib/research-query";
import {
  AGGREGATOR_DOMAINS,
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
  | "example_only";

export type ScoredSource = NormalizedSource & {
  relevanceScore: number;
  rejectReason?: SourceRejectReason;
  numericClaim?: "benchmark" | "example" | "unclear";
};

export type FilterResult = {
  accepted: ScoredSource[];
  rejected: ScoredSource[];
};

const MIN_ACCEPT = 38;

export function classifyNumericClaim(text: string): "benchmark" | "example" | "unclear" {
  const hay = text.toLowerCase();
  const hasPct = /(\d+(?:[.,]\d+)?)\s*%/.test(text);
  if (!hasPct) return "unclear";
  if (
    /exemplo (de )?(c[aá]lculo|pr[aá]tico)|vamos (ao )?c[aá]lculo|supondo|f[oó]rmula simples|se (a )?receita (for|é)|calcule o cmv/i.test(
      hay,
    )
  ) {
    return "example";
  }
  if (
    /m[eé]di[oa]|benchmark|faixa|refer[eê]ncia setorial|mercado brasileiro|t[ií]pico do setor|percentual m[eé]dio|entre \d/i.test(
      hay,
    )
  ) {
    return "benchmark";
  }
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

export function scoreSourceRelevance(source: NormalizedSource, plan: ResearchQueryPlan): number {
  const text = blob(source);
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
  if (plan.intent === "BENCHMARK" && /benchmark|m[eé]dia|faixa|refer[eê]ncia/.test(text)) score += 14;
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
  if (source.freshness === "recente") score += 6;
  if (source.freshness === "historica") score -= 2;
  if (isAggregatorDomain(source.domain)) score -= 40;
  if (isDirectoryListing(text)) score -= 30;
  if (isAcronymHomonym(`${source.title} ${source.snippet} ${source.domain ?? ""}`, plan.query)) score -= 50;
  if (plan.country && /estados unidos|united states|\busa\b|europa|índia|\bindia\b/.test(text) && !/brasil|brazil/.test(text)) {
    score -= 18;
  }
  if (plan.segment === "restaurantes" && /software|informatics|teknoloji|saas|erp gen[eé]rico/.test(text) && !/restaur|food|custo da mercadoria/.test(text)) {
    score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

export function filterRelevantSources(sources: NormalizedSource[], plan: ResearchQueryPlan): FilterResult {
  const rejected: ScoredSource[] = [];
  const accepted: ScoredSource[] = [];
  const seenDomains = new Set<string>();

  for (const source of sources) {
    const text = blob(source);
    const numericClaim = classifyNumericClaim(`${source.title} ${source.snippet}`);
    const relevanceScore = scoreSourceRelevance(source, plan);
    const scored: ScoredSource = { ...source, relevanceScore, numericClaim };

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
    seenDomains.add(domainKey);
    accepted.push(scored);
  }

  accepted.sort(
    (a, b) =>
      b.relevanceScore - a.relevanceScore ||
      SOURCE_HIERARCHY_RANK[a.sourceType] - SOURCE_HIERARCHY_RANK[b.sourceType],
  );
  return { accepted, rejected };
}

export function selectSourcesForIntent(accepted: ScoredSource[], intent: ResearchTopicIntent): ScoredSource[] {
  const max = intent === "BENCHMARK" ? 4 : 5;
  return accepted.slice(0, max);
}

export function hasTrustworthyBenchmark(sources: ScoredSource[]): boolean {
  return sources.some((item) => item.numericClaim === "benchmark");
}

export function referenceOnlySources(sources: ScoredSource[]): ScoredSource[] {
  return sources.filter((item) => item.numericClaim !== "example");
}
