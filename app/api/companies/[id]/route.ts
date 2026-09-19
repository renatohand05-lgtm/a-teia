import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { publicErrorJson } from "@/lib/security/errors";
import { rejectProtectedClientFields } from "@/lib/security/protected-fields";
import { requireOwnedResource } from "@/lib/security/ownership";
import { companyInputSchema } from "@/lib/validations";
import { archiveCompany, getCompany, updateCompany } from "@/services/companyService";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await requireOwnedResource(session.user.id, "company", id);
  } catch (error) {
    const mapped = publicErrorJson(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
  const company = await getCompany(session.user.id, id);
  if (!company) {
    return NextResponse.json({ error: HUMAN_MESSAGES.forbidden, code: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ company });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido.", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  try {
    rejectProtectedClientFields(body);
    await requireOwnedResource(session.user.id, "company", id);
  } catch (error) {
    const mapped = publicErrorJson(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
  const parsed = companyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  try {
    const company = await updateCompany(session.user.id, id, parsed.data);
    return NextResponse.json({ company });
  } catch (error) {
    const mapped = publicErrorJson(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await requireOwnedResource(session.user.id, "company", id);
    const company = await archiveCompany(session.user.id, id);
    return NextResponse.json({ company });
  } catch (error) {
    const mapped = publicErrorJson(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
