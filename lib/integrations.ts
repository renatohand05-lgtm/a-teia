import { resolveOpenAIModel } from "@/lib/ai-config";
import { appEnvironment } from "@/lib/release";

export type IntegrationErrorCode =
  | "OPENAI_MISSING"
  | "OPENAI_AUTH_ERROR"
  | "OPENAI_PROVIDER_ERROR"
  | "OPENAI_RATE_LIMIT"
  | "TAVILY_MISSING"
  | "TAVILY_AUTH_ERROR"
  | "TAVILY_PROVIDER_ERROR"
  | "TAVILY_RATE_LIMIT";

export class IntegrationError extends Error {
  code: IntegrationErrorCode;
  status: number | null;

  constructor(code: IntegrationErrorCode, status: number | null = null) {
    super(friendlyIntegrationMessage(code));
    this.name = "IntegrationError";
    this.code = code;
    this.status = status;
  }
}

export function sanitizeEnvValue(value?: string | null): string | null {
  if (!value) return null;
  let next = value.trim();
  if (
    (next.startsWith('"') && next.endsWith('"') && next.length >= 2) ||
    (next.startsWith("'") && next.endsWith("'") && next.length >= 2)
  ) {
    next = next.slice(1, -1).trim();
  }
  return next.length > 0 ? next : null;
}

export function getOpenAIApiKey(): string | null {
  return sanitizeEnvValue(process.env.OPENAI_API_KEY);
}

export function getTavilyApiKey(): string | null {
  return sanitizeEnvValue(process.env.TAVILY_API_KEY) ?? sanitizeEnvValue(process.env.WEB_SEARCH_API_KEY);
}

export function getWebSearchProviderName(): string {
  const explicit = sanitizeEnvValue(process.env.WEB_SEARCH_PROVIDER)?.toLowerCase() ?? "none";
  if (explicit === "tavily") return "tavily";
  if ((explicit === "none" || explicit === "") && getTavilyApiKey()) return "tavily";
  return explicit || "none";
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

export function isWebSearchConfigured(): boolean {
  return getWebSearchProviderName() === "tavily" && Boolean(getTavilyApiKey());
}

export function friendlyIntegrationMessage(code: IntegrationErrorCode): string {
  switch (code) {
    case "OPENAI_MISSING":
      return "IA indisponível — credencial não configurada.";
    case "OPENAI_AUTH_ERROR":
      return "IA indisponível — falha de autenticação com o provedor.";
    case "OPENAI_RATE_LIMIT":
      return "IA indisponível — limite de uso do provedor atingido.";
    case "OPENAI_PROVIDER_ERROR":
      return "IA indisponível — falha do provedor.";
    case "TAVILY_MISSING":
      return "Pesquisa externa indisponível — credencial não configurada.";
    case "TAVILY_AUTH_ERROR":
      return "Pesquisa externa indisponível — falha de autenticação.";
    case "TAVILY_RATE_LIMIT":
      return "Pesquisa externa indisponível — limite de uso atingido.";
    case "TAVILY_PROVIDER_ERROR":
    default:
      return "Pesquisa externa indisponível — falha do provedor.";
  }
}

export function classifyHttpStatus(provider: "openai" | "tavily", status: number): IntegrationErrorCode {
  if (status === 401 || status === 403) return provider === "openai" ? "OPENAI_AUTH_ERROR" : "TAVILY_AUTH_ERROR";
  if (status === 429) return provider === "openai" ? "OPENAI_RATE_LIMIT" : "TAVILY_RATE_LIMIT";
  return provider === "openai" ? "OPENAI_PROVIDER_ERROR" : "TAVILY_PROVIDER_ERROR";
}

export function buildIntegrationsStatus() {
  return {
    openai: {
      configured: isOpenAIConfigured(),
      provider: "openai" as const,
      model: resolveOpenAIModel(process.env.OPENAI_MODEL),
    },
    webSearch: {
      configured: isWebSearchConfigured(),
      provider: getWebSearchProviderName(),
    },
    environment: appEnvironment(),
  };
}

export type ProbeResult = {
  ok: boolean;
  configured: boolean;
  status: number | null;
  code: IntegrationErrorCode | null;
  detail: string | null;
};

function emptyProbe(code: IntegrationErrorCode): ProbeResult {
  return { ok: false, configured: false, status: null, code, detail: friendlyIntegrationMessage(code) };
}

export async function probeOpenAI(): Promise<ProbeResult> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return emptyProbe("OPENAI_MISSING");
  const model = resolveOpenAIModel(process.env.OPENAI_MODEL);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Responda apenas: ok" }],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      await response.text();
      const code = classifyHttpStatus("openai", response.status);
      return { ok: false, configured: true, status: response.status, code, detail: friendlyIntegrationMessage(code) };
    }
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim() ?? "";
    return {
      ok: content.length > 0,
      configured: true,
      status: response.status,
      code: content.length > 0 ? null : "OPENAI_PROVIDER_ERROR",
      detail: content.length > 0 ? "openai_ok" : friendlyIntegrationMessage("OPENAI_PROVIDER_ERROR"),
    };
  } catch (error) {
    if (error instanceof IntegrationError) {
      return { ok: false, configured: true, status: error.status, code: error.code, detail: error.message };
    }
    return {
      ok: false,
      configured: true,
      status: null,
      code: "OPENAI_PROVIDER_ERROR",
      detail: friendlyIntegrationMessage("OPENAI_PROVIDER_ERROR"),
    };
  }
}

export async function probeTavily(): Promise<ProbeResult> {
  const apiKey = getTavilyApiKey();
  if (!apiKey) return emptyProbe("TAVILY_MISSING");
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "mercado de restaurantes Brasil CMV benchmark",
        max_results: 3,
        include_answer: false,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.text();
      const code = classifyHttpStatus("tavily", response.status);
      return { ok: false, configured: true, status: response.status, code, detail: friendlyIntegrationMessage(code) };
    }
    const json = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const hits = (json.results ?? []).filter((item) => item.title && item.url && (item.content || item.title));
    return {
      ok: hits.length > 0,
      configured: true,
      status: response.status,
      code: hits.length > 0 ? null : "TAVILY_PROVIDER_ERROR",
      detail: hits.length > 0 ? `tavily_ok:${hits.length}` : friendlyIntegrationMessage("TAVILY_PROVIDER_ERROR"),
    };
  } catch {
    return {
      ok: false,
      configured: true,
      status: null,
      code: "TAVILY_PROVIDER_ERROR",
      detail: friendlyIntegrationMessage("TAVILY_PROVIDER_ERROR"),
    };
  }
}
