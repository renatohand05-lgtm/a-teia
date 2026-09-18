import { RESEARCH_LIMITS } from "@/lib/research-config";
import {
  IntegrationError,
  classifyHttpStatus,
  getTavilyApiKey,
  getWebSearchProviderName,
} from "@/lib/integrations";

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
  return getWebSearchProviderName();
}

function isKnownWebSearchProvider(name = configuredWebSearchProviderName()): boolean {
  return name === "tavily";
}

export function resolveWebSearchProvider(): WebSearchProvider | null {
  if (testOverride) return testOverride;
  const name = configuredWebSearchProviderName();
  const key = getTavilyApiKey();
  if (!isKnownWebSearchProvider(name) || !key) return null;
  if (name === "tavily") return createTavilyProvider(key);
  return null;
}

export function createTavilyProvider(apiKey: string): WebSearchProvider {
  return {
    id: "tavily",
    async search(query: string): Promise<RawSearchHit[]> {
      let response: Response;
      try {
        response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            max_results: RESEARCH_LIMITS.tavilyFetchCount,
            include_answer: false,
            search_depth: "basic",
          }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new IntegrationError("TAVILY_PROVIDER_ERROR");
      }
      if (!response.ok) {
        await response.text();
        throw new IntegrationError(classifyHttpStatus("tavily", response.status), response.status);
      }
      const json = (await response.json()) as {
        results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }>;
      };
      return (json.results ?? []).slice(0, RESEARCH_LIMITS.tavilyFetchCount).map((item) => ({
        title: item.title?.trim() || "Fonte sem título",
        url: item.url?.trim() || "",
        snippet: item.content?.trim() || "",
        publishedAt: item.published_date ?? null,
        publisher: null,
      }));
    },
  };
}
