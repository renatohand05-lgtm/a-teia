import { KnowledgeKind } from "@prisma/client";

export const KNOWLEDGE_LABELS: Record<KnowledgeKind, string> = {
  INTERNAL_DATA: "DADO INTERNO",
  EXTERNAL_SOURCE: "FONTE EXTERNA",
  INFERENCE: "INFERÊNCIA",
  HYPOTHESIS: "HIPÓTESE",
  EVIDENCE: "EVIDÊNCIA",
  RECOMMENDATION: "RECOMENDAÇÃO",
};

export type ClassifiedContent = {
  kind: KnowledgeKind;
  label: string;
  body: string;
};

export function classifyKind(kind: KnowledgeKind): ClassifiedContent["label"] {
  return KNOWLEDGE_LABELS[kind];
}

export function assertNotSecretLeak(payload: unknown): void {
  const text = JSON.stringify(payload).toLowerCase();
  const forbidden = [
    "openai_api_key",
    "tavily_api_key",
    "cron_secret",
    "sk-",
    "tvly-",
    "database_url",
    "auth_secret",
    "nextauth_secret",
    "passwordhash",
    "authorization",
  ];
  for (const token of forbidden) {
    if (text.includes(token) && token !== "passwordhash") {
      throw new Error("Resposta bloqueada: possível vazamento de segredo.");
    }
  }
}
