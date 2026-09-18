import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { aiRequestSchema } from "@/lib/validations";
import { askExecutiveAssistant } from "@/services/aiService";

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

  try {
    const reply = await askExecutiveAssistant({
      userId: session.user.id,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      companyId: parsed.data.companyId,
    });
    return NextResponse.json({
      ...reply,
      research: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar a IA.";
    const status = message.includes("não encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
