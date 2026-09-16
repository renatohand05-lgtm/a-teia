import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { companyInputSchema } from "@/lib/validations";
import { archiveCompany, getCompany, updateCompany } from "@/services/companyService";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const company = await getCompany(session.user.id, id);
  if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  return NextResponse.json({ company });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = companyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }
  try {
    const company = await updateCompany(session.user.id, id, parsed.data);
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const company = await archiveCompany(session.user.id, id);
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao arquivar." },
      { status: 400 },
    );
  }
}
