import { KNOWN_WEB_SEARCH_PROVIDERS, RESEARCH_LIMITS } from "@/lib/research-config";

export type RawSearchHit = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
  publisher?: string | null;
};

export type WebSearchProvider = {
  id: string;
  search(query: string): Promise<RawSearchHit[]>;
};

let testOverride: WebSearchProvider | null = null;

export function setWebSearchProviderOverride(provider: WebSearchProvider | null): void {
  testOverride = provider;
}

export function configuredWebSearchProviderName(): string {
  return (process.env.WEB_SEARCH_PROVIDER ?? "none").trim().toLowerCase();
}

export function isKnownWebSearchProvider(name = configuredWebSearchProviderName()): boolean {
  return (KNOWN_WEB_SEARCH_PROVIDERS as readonly string[]).includes(name);
}

export function resolveWebSearchProvider(): WebSearchProvider | null {
  if (testOverride) return testOverride;
  const name = configuredWebSearchProviderName();
  const key = process.env.WEB_SEARCH_API_KEY;
  if (!isKnownWebSearchProvider(name) || !key) return null;
  if (name === "tavily") return createTavilyProvider(key);
  return null;
}

export function createTavilyProvider(apiKey: string): WebSearchProvider {
  return {
    id: "tavily",
    async search(query: string): Promise<RawSearchHit[]> {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: RESEARCH_LIMITS.maxSources,
          include_answer: false,
          search_depth: "basic",
        }),
      });
      if (!response.ok) {
        await response.text();
        throw new Error(`Provedor de pesquisa recusou a chamada (${response.status}).`);
      }
      const json = (await response.json()) as {
        results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }>;
      };
      return (json.results ?? []).slice(0, RESEARCH_LIMITS.maxSources).map((item) => ({
        title: item.title?.trim() || "Fonte sem título",
        url: item.url?.trim() || "",
        snippet: item.content?.trim() || "",
        publishedAt: item.published_date ?? null,
        publisher: null,
      }));
    },
  };
}
