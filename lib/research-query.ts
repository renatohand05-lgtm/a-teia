import { detectQuestionIntent, type ExecutiveCompany } from "@/lib/ai-executive-engine";
import { detectMetricsInText, preferredExpansion, type MetricAcronym } from "@/lib/research-terms";

export type ResearchKindAlias =
  | "none"
  | "benchmark"
  | "market"
  | "competition"
  | "external_opportunity"
  | "general_external";

export type ResearchTopicIntent =
  | "BENCHMARK"
  | "MARKET"
  | "COMPETITOR"
  | "TREND"
  | "REGULATION"
  | "BEST_PRACTICE"
  | "GENERAL_RESEARCH";

export type ResearchQueryPlan = {
  original: string;
  query: string;
  expandedTerms: string[];
  intent: ResearchTopicIntent;
  metric: string | null;
  country: string;
  segment: string | null;
  researchKind: ResearchKindAlias;
};

export type ResearchQueryInput = {
  question: string;
  company?: Pick<ExecutiveCompany, "name" | "segment" | "city" | "state"> | null;
  metric?: string | null;
  country?: string;
  segment?: string | null;
};

const SEGMENT_ALIASES: Array<{ match: RegExp; label: string }> = [
  { match: /hambur|burguer|burger|restaur|food|alimenta|lanchonete|bar\b|caf[eé]/i, label: "restaurantes" },
  { match: /oficina|autope[cç]a|mec[aâ]nic/i, label: "oficinas" },
  { match: /varejo|loja|com[eé]rcio/i, label: "varejo" },
];

export function normalizeSegmentLabel(segment?: string | null): string | null {
  if (!segment?.trim()) return null;
  const alias = SEGMENT_ALIASES.find((item) => item.match.test(segment));
  return alias?.label ?? segment.trim().toLowerCase();
}

export function classifyResearchTopic(question: string): ResearchTopicIntent {
  const q = question.toLowerCase();
  const intent = detectQuestionIntent(question);
  const hasMetric = detectMetricsInText(question).length > 0;
  if (
    intent === "BENCHMARK" ||
    /benchmark|m[eé]dia do mercado|compar.*mercado|alinhad.*mercado/.test(q) ||
    (hasMetric && /mercado|benchmark|m[eé]dia|refer[eê]ncia setorial/.test(q))
  ) {
    return "BENCHMARK";
  }
  if (intent === "COMPETITION" || /concorr/.test(q)) return "COMPETITOR";
  if (/regula[cç]|norma|legisla/.test(q)) return "REGULATION";
  if (/boa[s]? pr[aá]tica/.test(q)) return "BEST_PRACTICE";
  if (/tend[eê]nc/.test(q)) return "TREND";
  if (intent === "MARKET" || intent === "EXTERNAL_OPPORTUNITY") return "MARKET";
  return "GENERAL_RESEARCH";
}

export function expandSemanticTerms(question: string, country = "Brasil"): { metrics: MetricAcronym[]; expandedTerms: string[] } {
  const metrics = detectMetricsInText(question);
  const expandedTerms = metrics.flatMap((metric) => [metric.acronym, preferredExpansion(metric, country)]);
  return { metrics, expandedTerms: [...new Set(expandedTerms)] };
}

function clipQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

export function buildResearchQuery(
  questionOrInput: string | ResearchQueryInput,
  company?: ResearchQueryInput["company"],
): ResearchQueryPlan {
  const input: ResearchQueryInput =
    typeof questionOrInput === "string" ? { question: questionOrInput, company } : questionOrInput;
  const country = input.country?.trim() || "Brasil";
  const segment = normalizeSegmentLabel(input.segment ?? input.company?.segment) ?? "empresas";
  const { metrics, expandedTerms } = expandSemanticTerms(input.question, country);
  const metric = input.metric ?? metrics[0]?.key ?? null;
  const intent = classifyResearchTopic(input.question);
  const expansion = metrics[0] ? preferredExpansion(metrics[0], country) : "";
  const acronym = metrics[0]?.acronym ?? "";

  let query = clipQuery(input.question);
  if (intent === "BENCHMARK") {
    query = clipQuery(
      `${expansion} ${acronym} ${segment} ${country} estudo pesquisa relatório associação benchmark média setor faixa referência`.trim(),
    );
  } else if (intent === "COMPETITOR") {
    query = clipQuery(`concorrentes públicos ${segment} ${country}`.trim());
  } else if (intent === "TREND" || intent === "MARKET") {
    query = clipQuery(`tendências ${segment} ${country} ${expansion}`.trim());
  } else if (intent === "REGULATION") {
    query = clipQuery(`regulação ${segment} ${country} ${expansion}`.trim());
  } else if (intent === "BEST_PRACTICE") {
    query = clipQuery(`boas práticas ${segment} ${country} ${expansion}`.trim());
  } else if (expandedTerms.length) {
    query = clipQuery(`${expansion} ${acronym} ${segment} ${country}`.trim());
  }

  return {
    original: input.question,
    query,
    expandedTerms,
    intent,
    metric,
    country,
    segment,
    researchKind: researchKindFromTopic(intent),
  };
}

export function buildLayeredQueries(plan: ResearchQueryPlan): string[] {
  if (plan.intent !== "BENCHMARK") return [plan.query];
  const expansion = plan.expandedTerms.join(" ");
  const layerOfficial = clipQuery(
    `${expansion} ${plan.segment} ${plan.country} estudo relatório associação IBGE Sebrae média setor`.trim(),
  );
  const layerSpecialized = clipQuery(
    `${expansion} ${plan.segment} ${plan.country} pesquisa referência especializada faixa setor`.trim(),
  );
  return [...new Set([plan.query, layerOfficial, layerSpecialized].filter(Boolean))];
}

function researchKindFromTopic(intent: ResearchTopicIntent): ResearchKindAlias {
  if (intent === "BENCHMARK") return "benchmark";
  if (intent === "COMPETITOR") return "competition";
  if (intent === "MARKET" || intent === "TREND" || intent === "REGULATION" || intent === "BEST_PRACTICE") return "market";
  return "general_external";
}
