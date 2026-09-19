import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { publicErrorJson } from "@/lib/security/errors";
import { consumeNamedLimit } from "@/lib/security/rate-limit";
import { aiRequestSchema } from "@/lib/validations";
import { askExecutiveAssistant } from "@/services/aiService";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const limited = consumeNamedLimit("ai", session.user.id);
  if (!limited.ok) {
    return NextResponse.json(
      { error: HUMAN_MESSAGES.rateLimited, code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.useWebSearch) {
      const researchLimit = consumeNamedLimit("research", session.user.id);
      if (!researchLimit.ok) {
        return NextResponse.json(
          { error: HUMAN_MESSAGES.rateLimited, code: "RATE_LIMITED" },
          { status: 429, headers: { "Retry-After": String(researchLimit.retryAfterSec) } },
        );
      }
    }
    const reply = await askExecutiveAssistant({
      userId: session.user.id,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      companyId: parsed.data.companyId,
      useWebSearch: parsed.data.useWebSearch,
    });
    return NextResponse.json({
      ...reply,
      research: reply.answer.researchUsed
        ? { used: true, sessionId: reply.answer.researchSessionId, sources: reply.answer.externalSources.length }
        : reply.answer.researchUnavailable
          ? { used: false, unavailable: reply.answer.researchUnavailable }
          : null,
    });
  } catch (error) {
    const mapped = publicErrorJson(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
