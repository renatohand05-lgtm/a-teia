import "server-only";

import { AuditSource, KnowledgeKind, Prisma } from "@prisma/client";
import { resolveOpenAIModel } from "@/lib/ai-config";
import {
  buildExecutiveBriefing,
  buildOpenAIMessages,
  detectQuestionIntent,
  extractKnownNumbers,
  mergeOpenAINarrative,
  narrativeIntroducesUnknownNumbers,
  parseOpenAISummary,
  sliceExecutiveContext,
  type ExecutiveAnswer,
  type ProposedAction,
} from "@/lib/ai-executive-engine";
import { assertNotSecretLeak } from "@/lib/knowledge";
import { prisma } from "@/lib/prisma";
import { getExecutiveContext } from "@/services/aiContextService";
import { persistProposedActions } from "@/services/aiActionService";
import { writeAudit } from "@/services/auditService";

export type AIChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
  answer: ExecutiveAnswer | null;
};

export type AIConversationDTO = {
  id: string;
  companyId: string | null;
  title: string | null;
  createdAt: string;
  messages: AIChatMessage[];
};

export type AIReply = {
  configured: boolean;
  content: string;
  conversationId: string;
  answer: ExecutiveAnswer;
  proposals: ProposedAction[];
  destructiveActionsEnabled: false;
};

function asAnswer(value: Prisma.JsonValue | null): ExecutiveAnswer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as ExecutiveAnswer;
}

async function ownedConversation(userId: string, conversationId: string, companyId?: string) {
  const conversation = await prisma.aIConversation.findFirst({
    where: {
      id: conversationId,
      userId,
      ...(companyId ? { companyId } : {}),
    },
  });
  if (!conversation) throw new Error("Conversa não encontrada.");
  if (conversation.companyId) {
    const company = await prisma.company.findFirst({ where: { id: conversation.companyId, ownerId: userId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }
  return conversation;
}

export async function listConversations(userId: string, companyId?: string) {
  if (companyId) {
    const company = await prisma.company.findFirst({ where: { id: companyId, ownerId: userId } });
    if (!company) return [];
  }
  return prisma.aIConversation.findMany({
    where: { userId, ...(companyId ? { companyId } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, title: true, companyId: true, createdAt: true, updatedAt: true },
  });
}

export async function getConversation(userId: string, conversationId: string): Promise<AIConversationDTO> {
  const conversation = await ownedConversation(userId, conversationId);
  const messages = await prisma.aIMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  return {
    id: conversation.id,
    companyId: conversation.companyId,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    messages: messages.map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      createdAt: item.createdAt.toISOString(),
      answer: asAnswer(item.structured),
    })),
  };
}

export async function askExecutiveAssistant(input: {
  userId: string;
  message: string;
  conversationId?: string;
  companyId?: string;
}): Promise<AIReply> {
  const companyId = input.companyId;
  if (companyId) {
    const company = await prisma.company.findFirst({ where: { id: companyId, ownerId: input.userId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }

  const conversation = input.conversationId
    ? await ownedConversation(input.userId, input.conversationId, companyId)
    : await prisma.aIConversation.create({
        data: {
          userId: input.userId,
          companyId: companyId ?? null,
          title: input.message.slice(0, 80),
        },
      });

  if (companyId && conversation.companyId && conversation.companyId !== companyId) {
    throw new Error("Conversa não encontrada.");
  }

  await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: input.message.slice(0, 8000),
      knowledgeKind: KnowledgeKind.INTERNAL_DATA,
    },
  });

  await writeAudit({
    actorId: input.userId,
    action: "ai.question",
    entity: "AIConversation",
    entityId: conversation.id,
    newValue: { companyId: conversation.companyId, length: input.message.length, intent: detectQuestionIntent(input.message) },
    origin: AuditSource.AI,
  });

  const context = conversation.companyId ? await getExecutiveContext(input.userId, conversation.companyId) : null;
  const sliced = context ? sliceExecutiveContext(context, detectQuestionIntent(input.message)) : null;
  let answer = buildExecutiveBriefing(
    context ?? {
      company: null,
      diagnosis: null,
      opportunities: [],
      plans: [],
      finance: null,
      experiments: [],
      evidence: [],
      memories: [],
    },
    input.message,
  );

  const apiKey = process.env.OPENAI_API_KEY;
  const configured = Boolean(apiKey);
  const model = resolveOpenAIModel(process.env.OPENAI_MODEL);

  if (configured && sliced && context?.company) {
    try {
      const narrative = await callOpenAIChat(buildOpenAIMessages({ context: sliced, question: input.message, deterministic: answer }));
      const parsed = parseOpenAISummary(narrative);
      const known = extractKnownNumbers(sliced);
      if (parsed && !narrativeIntroducesUnknownNumbers(parsed, known)) {
        answer = mergeOpenAINarrative(answer, parsed, model);
      } else {
        answer = {
          ...answer,
          provider: "openai",
          model,
          unavailableReason: "A resposta externa foi descartada porque introduziu informação ausente do contexto. O briefing determinístico foi mantido.",
        };
      }
    } catch {
      answer = {
        ...answer,
        unavailableReason: "IA indisponível — o briefing determinístico foi usado. Configure o provedor se quiser narrativa assistida.",
      };
    }
  } else if (!configured) {
    answer = {
      ...answer,
      unavailableReason: "IA indisponível — configure o provedor. O briefing determinístico abaixo usa só dados persistidos.",
    };
  }

  assertNotSecretLeak(answer);

  const assistant = await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: answer.summary,
      knowledgeKind: KnowledgeKind.INFERENCE,
      provider: answer.provider,
      model: answer.model,
      structured: answer as unknown as Prisma.InputJsonValue,
    },
  });

  if (answer.sources.length) {
    await prisma.aISource.createMany({
      data: answer.sources.map((source) => ({
        messageId: assistant.id,
        kind: KnowledgeKind.INTERNAL_DATA,
        title: `${source.kind}: ${source.label}`,
      })),
    });
  }

  if (conversation.companyId && answer.proposedActions.length) {
    const stored = await persistProposedActions({
      userId: input.userId,
      companyId: conversation.companyId,
      conversationId: conversation.id,
      messageId: assistant.id,
      actions: answer.proposedActions,
    });
    answer = { ...answer, proposedActions: stored };
  }

  await writeAudit({
    actorId: input.userId,
    action: "ai.answer",
    entity: "AIMessage",
    entityId: assistant.id,
    newValue: { provider: answer.provider, sources: answer.sources.map((item) => item.kind), proposed: answer.proposedActions.length },
    origin: AuditSource.AI,
  });

  return {
    configured,
    content: answer.summary,
    conversationId: conversation.id,
    answer,
    proposals: answer.proposedActions,
    destructiveActionsEnabled: false,
  };
}

export async function callOpenAIChat(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const model = resolveOpenAIModel(process.env.OPENAI_MODEL);
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
