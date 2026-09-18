export const AI_PROVIDER = "openai" as const;

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export const AI_MAX_CONTEXT_CHARS = 12_000;
export const AI_MAX_LIST_ITEMS = 8;
export const AI_MAX_MESSAGE_CHARS = 8_000;

export function resolveOpenAIModel(envModel?: string | null): string {
  const value = envModel?.trim();
  return value && value.length > 0 ? value : DEFAULT_OPENAI_MODEL;
}

export function isOpenAIKeyPresent(apiKey?: string | null): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}
