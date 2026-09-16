"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { companyInputSchema } from "@/lib/validations";
import { archiveCompany, createCompany, updateCompany } from "@/services/companyService";

export type CompanyActionState = { ok: false; error: string } | { ok: true; id?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

export async function createCompanyAction(
  _: CompanyActionState | undefined,
  formData: FormData,
): Promise<CompanyActionState> {
  const userId = await requireUserId();
  const parsed = companyInputSchema.safeParse(readCompanyForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let id: string;
  try {
    const company = await createCompany(userId, parsed.data);
    id = company.id;
    revalidatePath("/empresas");
    revalidatePath("/cockpit");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível cadastrar." };
  }
  redirect(`/empresas/${id}`);
}

export async function updateCompanyAction(
  id: string,
  _: CompanyActionState | undefined,
  formData: FormData,
): Promise<CompanyActionState> {
  const userId = await requireUserId();
  const parsed = companyInputSchema.safeParse(readCompanyForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await updateCompany(userId, id, parsed.data);
    revalidatePath("/empresas");
    revalidatePath(`/empresas/${id}`);
    revalidatePath("/cockpit");
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
}

export async function archiveCompanyAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    throw new Error("Empresa inválida.");
  }
  await archiveCompany(userId, id);
  revalidatePath("/empresas");
  revalidatePath("/cockpit");
  redirect("/empresas");
}

function readCompanyForm(formData: FormData) {
  return {
    name: formData.get("name"),
    segment: formData.get("segment") || undefined,
    units: formData.get("units") || undefined,
    revenueMonthly: formData.get("revenueMonthly") || undefined,
    marginPercent: formData.get("marginPercent") || undefined,
    teamSize: formData.get("teamSize") || undefined,
    channels: formData.get("channels") || undefined,
    objectives: formData.get("objectives") || undefined,
    perceivedBottlenecks: formData.get("perceivedBottlenecks") || undefined,
    notes: formData.get("notes") || undefined,
    isDemo: formData.get("isDemo") === "on",
  };
}
