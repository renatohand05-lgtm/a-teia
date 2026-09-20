import { afterEach, describe, expect, it } from "vitest";
import {
  buildIntegrationsStatus,
  classifyHttpStatus,
  friendlyIntegrationMessage,
  getTavilyApiKey,
  getWebSearchProviderName,
  isOpenAIConfigured,
  isWebSearchConfigured,
  sanitizeEnvValue,
} from "@/lib/integrations";

const original = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  WEB_SEARCH_PROVIDER: process.env.WEB_SEARCH_PROVIDER,
  WEB_SEARCH_API_KEY: process.env.WEB_SEARCH_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
};

afterEach(() => {
  restore("OPENAI_API_KEY", original.OPENAI_API_KEY);
  restore("OPENAI_MODEL", original.OPENAI_MODEL);
  restore("WEB_SEARCH_PROVIDER", original.WEB_SEARCH_PROVIDER);
  restore("WEB_SEARCH_API_KEY", original.WEB_SEARCH_API_KEY);
  restore("TAVILY_API_KEY", original.TAVILY_API_KEY);
});

function restore(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("integrações — leitura segura de env", () => {
  it("não considera chave vazia ou só aspas", () => {
    expect(sanitizeEnvValue("")).toBeNull();
    expect(sanitizeEnvValue("   ")).toBeNull();
    expect(sanitizeEnvValue('""')).toBeNull();
    process.env.OPENAI_API_KEY = "   ";
    expect(isOpenAIConfigured()).toBe(false);
  });

  it("aceita TAVILY_API_KEY e infere provider tavily", () => {
    delete process.env.WEB_SEARCH_API_KEY;
    process.env.WEB_SEARCH_PROVIDER = "none";
    process.env.TAVILY_API_KEY = "tvly-test-placeholder";
    expect(getTavilyApiKey()).toBe("tvly-test-placeholder");
    expect(getWebSearchProviderName()).toBe("tavily");
    expect(isWebSearchConfigured()).toBe(true);
  });

  it("status nunca inclui secretos", () => {
    process.env.OPENAI_API_KEY = "sk-test-placeholder";
    process.env.TAVILY_API_KEY = "tvly-test-placeholder";
    process.env.WEB_SEARCH_PROVIDER = "tavily";
    const payload = JSON.stringify(buildIntegrationsStatus());
    expect(payload).not.toMatch(/sk-test-placeholder/);
    expect(payload).not.toMatch(/tvly-test-placeholder/);
    expect(payload).not.toMatch(/Bearer /);
    const status = buildIntegrationsStatus();
    expect(status.openai.configured).toBe(true);
    expect(status.openai.provider).toBe("openai");
    expect(status.webSearch.configured).toBe(true);
    expect(status.webSearch.provider).toBe("tavily");
    expect(status.environment).toBeTruthy();
  });
});

describe("integrações — erros amigáveis", () => {
  it("classifica HTTP sem vazar corpo", () => {
    expect(classifyHttpStatus("openai", 401)).toBe("OPENAI_AUTH_ERROR");
    expect(classifyHttpStatus("openai", 429)).toBe("OPENAI_RATE_LIMIT");
    expect(classifyHttpStatus("tavily", 403)).toBe("TAVILY_AUTH_ERROR");
    expect(classifyHttpStatus("tavily", 500)).toBe("TAVILY_PROVIDER_ERROR");
    expect(friendlyIntegrationMessage("OPENAI_MISSING")).toMatch(/credencial não configurada/);
    expect(friendlyIntegrationMessage("TAVILY_AUTH_ERROR")).toMatch(/autenticação/);
    expect(friendlyIntegrationMessage("TAVILY_AUTH_ERROR")).not.toMatch(/Tavily|OpenAI|Prisma/i);
  });
});
