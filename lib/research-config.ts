export const RESEARCH_LIMITS = {
  maxQueriesPerRequest: 1,
  maxSources: 5,
  maxBenchmarkSources: 4,
  tavilyFetchCount: 8,
  maxContextCharacters: 3_000,
  cacheTtlMs: 6 * 60 * 60 * 1000,
  temporalCacheTtlMs: 60 * 60 * 1000,
} as const;

export const KNOWN_WEB_SEARCH_PROVIDERS = ["tavily"] as const;

export type KnownWebSearchProvider = (typeof KNOWN_WEB_SEARCH_PROVIDERS)[number];

export type SourceHierarchy =
  | "official"
  | "regulator"
  | "primary"
  | "study"
  | "business"
  | "press"
  | "secondary"
  | "community";

export const SOURCE_HIERARCHY_RANK: Record<SourceHierarchy, number> = {
  official: 1,
  regulator: 2,
  primary: 3,
  study: 4,
  business: 5,
  press: 6,
  secondary: 7,
  community: 8,
};

export const SOURCE_HIERARCHY_LABEL: Record<SourceHierarchy, string> = {
  official: "Fonte oficial",
  regulator: "Órgão público/regulador",
  primary: "Documentação primária",
  study: "Pesquisa/estudo reconhecido",
  business: "Publicação empresarial",
  press: "Imprensa",
  secondary: "Conteúdo secundário",
  community: "Comunidade/opinião",
};

export type FreshnessKind = "recente" | "historica" | "sem_data";

export const FRESHNESS_MS = 18 * 30 * 24 * 60 * 60 * 1000;
