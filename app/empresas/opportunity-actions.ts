"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  generateOpportunitiesSchema,
  opportunityInputSchema,
  opportunityStatusSchema,
} from "@/lib/validations";
import {
  createManualOpportunity,
  createSuggestedOpportunities,
  queueOpportunityForPlan,
  updateOpportunity,
  updateOpportunityStatus,
} from "@/services/opportunityService";

export type FormActionState = { ok: false; error: string } | { ok: true; id?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function revalidateOpportunity(companyId: string, opportunityId?: string) {
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/oportunidades`);
  revalidatePath(`/empresas/${companyId}/diagnostico`);
  if (opportunityId) revalidatePath(`/empresas/${companyId}/oportunidades/${opportunityId}`);
}

function readOpportunityForm(formData: FormData) {
  return {
    title: formData.get("title"),
    problemStatement: formData.get("problemStatement"),
    hypothesis: formData.get("hypothesis"),
    sourceDimension: formData.get("sourceDimension"),
    expectedImpact: formData.get("expectedImpact"),
    urgency: formData.get("urgency"),
    effort: formData.get("effort"),
    confidence: formData.get("confidence") || 3,
    description: formData.get("description") || undefined,
    estimatedInvestment: formData.get("estimatedInvestment") || undefined,
    estimatedHours: formData.get("estimatedHours") || undefined,
    expectedMonthlyReturn: formData.get("expectedMonthlyReturn") || undefined,
    diagnosisId: formData.get("diagnosisId") || undefined,
  };
}

export async function createOpportunityAction(
  companyId: string,
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = opportunityInputSchema.safeParse(readOpportunityForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let id: string;
  try {
    const created = await createManualOpportunity(userId, companyId, parsed.data);
    id = created.id;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível criar a oportunidade." };
  }

  revalidateOpportunity(companyId, id);
  redirect(`/empresas/${companyId}/oportunidades/${id}`);
}

export async function updateOpportunityAction(
  companyId: string,
  opportunityId: string,
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = opportunityInputSchema.safeParse(readOpportunityForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await updateOpportunity(userId, companyId, opportunityId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível salvar." };
  }

  revalidateOpportunity(companyId, opportunityId);
  return { ok: true, id: opportunityId };
}

export async function generateOpportunitiesAction(
  companyId: string,
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = generateOpportunitiesSchema.safeParse({
    diagnosisId: formData.get("diagnosisId"),
    templateKeys: formData.getAll("templateKey").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Selecione ao menos uma sugestão." };
  }

  try {
    await createSuggestedOpportunities(userId, companyId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível gerar as oportunidades." };
  }

  revalidateOpportunity(companyId);
  redirect(`/empresas/${companyId}/oportunidades`);
}

export async function changeOpportunityStatusAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const companyId = String(formData.get("companyId") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const parsed = opportunityStatusSchema.safeParse(formData.get("status"));
  if (!companyId || !opportunityId || !parsed.success) {
    throw new Error("Dados de status inválidos.");
  }
  await updateOpportunityStatus(userId, companyId, opportunityId, parsed.data);
  revalidateOpportunity(companyId, opportunityId);
}

export async function queueForPlanAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const companyId = String(formData.get("companyId") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!companyId || !opportunityId) throw new Error("Oportunidade inválida.");
  await queueOpportunityForPlan(userId, companyId, opportunityId);
  revalidateOpportunity(companyId, opportunityId);
}
