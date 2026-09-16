import "server-only";

import { KnowledgeKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { KNOWLEDGE_LABELS } from "@/lib/knowledge";
import { isOpenAIConfigured } from "@/lib/env";

export type AIProposal = {
  title: string;
  rationale: string;
  requiresHumanApproval: true;
  status: "PENDING_HUMAN_APPROVAL";
};

export type AIReply = {
  configured: boolean;
  content: string;
  knowledge: Array<{ kind: KnowledgeKind; label: string; text: string }>;
  proposals: AIProposal[];
  conversationId: string;
  destructiveActionsEnabled: false;
};

/**
 * Arquitetura de IA da Sprint 0.
 * A chave OpenAI permanece apenas no servidor.
 * Nenhuma ação destrutiva é executada automaticamente.
 */
export async function askExecutiveAssistant(input: {
  userId: string;
  message: string;
  conversationId?: string;
  companyId?: string;
}): Promise<AIReply> {
  const conversation = input.conversationId
    ? await prisma.aIConversation.findFirst({
        where: { id: input.conversationId, userId: input.userId },
      })
    : await prisma.aIConversation.create({
        data: {
          userId: input.userId,
          companyId: input.companyId,
          title: input.message.slice(0, 80),
        },
      });

  if (!conversation) {
    throw new Error("Conversa não encontrada.");
  }

  await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: input.message,
      knowledgeKind: KnowledgeKind.INTERNAL_DATA,
    },
  });

  const configured = isOpenAIConfigured();

  const knowledge = [
    {
      kind: KnowledgeKind.INTERNAL_DATA,
      label: KNOWLEDGE_LABELS.INTERNAL_DATA,
      text: "A resposta desta sprint usa apenas o contexto interno preparado. Diagnóstico 360, motor financeiro e motor de oportunidades ainda não estão ativos.",
    },
    {
      kind: KnowledgeKind.HYPOTHESIS,
      label: KNOWLEDGE_LABELS.HYPOTHESIS,
      text: "Qualquer recomendação futura deve ser tratada como hipótese até haver evidência medida.",
    },
    {
      kind: KnowledgeKind.RECOMMENDATION,
      label: KNOWLEDGE_LABELS.RECOMMENDATION,
      text: "Toda ação proposta pela IA exigirá aprovação humana antes de executar.",
    },
  ];

  const content = configured
    ? buildConfiguredPlaceholder(input.message)
    : "A arquitetura de IA está pronta, mas a OPENAI_API_KEY ainda não foi configurada neste ambiente. Nenhuma chamada à OpenAI foi feita. Cadastre empresas no Cockpit e, nas próximas sprints, o assistente passará a usar dados reais com aprovação humana.";

  await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content,
      knowledgeKind: KnowledgeKind.INFERENCE,
    },
  });

  return {
    configured,
    content,
    knowledge,
    proposals: [],
    conversationId: conversation.id,
    destructiveActionsEnabled: false,
  };
}

function buildConfiguredPlaceholder(message: string): string {
  return [
    "A chave OpenAI está presente no servidor, mas a Sprint 0 não ativa o motor completo de IA.",
    "Sua pergunta foi registrada na conversa para memória futura.",
    `Pergunta recebida: “${message.slice(0, 280)}”.`,
    "Próximas sprints: cruzar Cockpit, diagnóstico, financeiro e evidências — sempre com aprovação humana.",
  ].join("\n");
}

export async function callOpenAIChat(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    await response.text();
    throw new Error(`OpenAI recusou a chamada (${response.status}).`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}
