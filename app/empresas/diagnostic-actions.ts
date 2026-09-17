"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { diagnosisInputSchema, onboardingInputSchema } from "@/lib/validations";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import { upsertOnboarding } from "@/services/onboardingService";
import { createDiagnosis } from "@/services/diagnosisService";

export type FormActionState = { ok: false; error: string } | { ok: true; id?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function saveOnboardingAction(
  companyId: string,
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = onboardingInputSchema.safeParse({
    name: formData.get("name"),
    segment: formData.get("segment") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    revenueMonthly: formData.get("revenueMonthly") || undefined,
    averageTicket: formData.get("averageTicket") || undefined,
    clientsPerMonth: formData.get("clientsPerMonth") || undefined,
    teamSize: formData.get("teamSize") || undefined,
    channels: formData.get("channels") || undefined,
    estimatedRecurrence: formData.get("estimatedRecurrence") || undefined,
    primaryObjective: formData.get("primaryObjective") || undefined,
    perceivedBottleneck: formData.get("perceivedBottleneck") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos no onboarding." };
  }

  try {
    await upsertOnboarding(userId, companyId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível salvar o onboarding." };
  }

  revalidatePath("/empresas");
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/onboarding`);
  revalidatePath("/cockpit");
  return { ok: true, id: companyId };
}

export async function createDiagnosisAction(
  companyId: string,
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const scores = Object.fromEntries(
    DIAGNOSTIC_DIMENSIONS.map((dimension) => [dimension.key, formData.get(`score-${dimension.key}`)]),
  );
  const parsed = diagnosisInputSchema.safeParse({
    idempotencyKey: formData.get("idempotencyKey"),
    scores,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Preencha as 10 dimensões com notas de 1 a 5." };
  }

  let diagnosisId: string;
  try {
    const diagnosis = await createDiagnosis(userId, companyId, parsed.data);
    diagnosisId = diagnosis.id;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível salvar o diagnóstico." };
  }

  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/diagnostico`);
  revalidatePath(`/empresas/${companyId}/diagnostico/historico`);
  revalidatePath("/cockpit");
  redirect(`/empresas/${companyId}/diagnostico?salvo=${diagnosisId}`);
}
