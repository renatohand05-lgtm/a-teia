import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { aiRequestSchema } from "@/lib/validations";
import { askExecutiveAssistant } from "@/services/aiService";
import { prepareResearch } from "@/services/researchService";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 },
    );
  }

  const reply = await askExecutiveAssistant({
    userId: session.user.id,
    message: parsed.data.message,
    conversationId: parsed.data.conversationId,
    companyId: parsed.data.companyId,
  });

  const research = parsed.data.useWebSearch
    ? await prepareResearch({
        userId: session.user.id,
        question: parsed.data.message,
        companyId: parsed.data.companyId,
        depth: parsed.data.researchDepth,
      })
    : null;

  return NextResponse.json({
    ...reply,
    research,
  });
}
