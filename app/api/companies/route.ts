import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { publicErrorJson } from "@/lib/security/errors";
import { rejectProtectedClientFields } from "@/lib/security/protected-fields";
import { companyInputSchema } from "@/lib/validations";
import { createCompany, listCompanies } from "@/services/companyService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const companies = await listCompanies(session.user.id, true);
  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    rejectProtectedClientFields(body);
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

  const company = await createCompany(session.user.id, parsed.data);
  return NextResponse.json({ company }, { status: 201 });
}
