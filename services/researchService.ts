import "server-only";

import { KnowledgeKind, ResearchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isWebSearchConfigured } from "@/lib/env";
import { KNOWLEDGE_LABELS } from "@/lib/knowledge";

export type ResearchResult = {
  sessionId: string;
  status: ResearchStatus;
  liveSearch: boolean;
  question: string;
  conclusion: string;
  findings: Array<{
    kind: KnowledgeKind;
    label: string;
    title: string;
    url?: string | null;
    body?: string | null;
  }>;
};

/**
 * Pesquisa web preparada para tempo real.
 * Sprint 0 persiste a sessão e as categorias de conhecimento,
 * mas não dispara busca externa automaticamente.
 */
export async function prepareResearch(input: {
  userId: string;
  question: string;
  companyId?: string;
  decisionId?: string;
  depth?: "quick" | "deep";
}): Promise<ResearchResult> {
  const liveSearch = isWebSearchConfigured();

  const session = await prisma.researchSession.create({
    data: {
      userId: input.userId,
      companyId: input.companyId,
      decisionId: input.decisionId,
      question: input.question,
      depth: input.depth ?? "deep",
      status: liveSearch ? ResearchStatus.PREPARED : ResearchStatus.PREPARED,
      conclusion:
        "Pesquisa registrada. A busca em tempo real será ativada quando WEB_SEARCH_PROVIDER e WEB_SEARCH_API_KEY estiverem configurados.",
      findings: {
        create: [
          {
            kind: KnowledgeKind.INTERNAL_DATA,
            title: "Base interna",
            body: "Dados da empresa, cockpit e evidências internas devem ser a âncora da recomendação.",
          },
          {
            kind: KnowledgeKind.EXTERNAL_SOURCE,
            title: "Fontes externas (pendente)",
            body: "URLs, títulos e trechos de fontes públicas serão gravados aqui em sprints futuras.",
          },
          {
            kind: KnowledgeKind.INFERENCE,
            title: "Inferência",
            body: "Cruzamento entre dado interno e fonte externa — sempre rotulado, nunca misturado.",
          },
          {
            kind: KnowledgeKind.HYPOTHESIS,
            title: "Hipótese",
            body: "Ideia ainda não validada. Exige experimento e KPI antes de virar evidência.",
          },
          {
            kind: KnowledgeKind.EVIDENCE,
            title: "Evidência",
            body: "Somente resultado medido alimenta memória estratégica.",
          },
          {
            kind: KnowledgeKind.RECOMMENDATION,
            title: "Recomendação",
            body: "Sugestão prática com teto de risco. Execução só após aprovação humana.",
          },
        ],
      },
    },
    include: { findings: true },
  });

  return {
    sessionId: session.id,
    status: session.status,
    liveSearch,
    question: session.question,
    conclusion: session.conclusion ?? "",
    findings: session.findings.map((finding) => ({
      kind: finding.kind,
      label: KNOWLEDGE_LABELS[finding.kind],
      title: finding.title,
      url: finding.url,
      body: finding.body,
    })),
  };
}

export async function runLiveSearchIfEnabled(_query: string): Promise<never> {
  throw new Error("Pesquisa em tempo real ainda não está ativada nesta sprint.");
}
