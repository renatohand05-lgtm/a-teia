"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { executionPlanInputSchema, taskStatusSchema } from "@/lib/validations";
import { createExecutionPlanFromOpportunity, updateExecutionTaskStatus } from "@/services/executionService";

export type FormActionState = { ok: false; error: string } | { ok: true; id?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function refresh(companyId: string, planId?: string) {
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/execucao`);
  revalidatePath(`/empresas/${companyId}/oportunidades`);
  if (planId) revalidatePath(`/empresas/${companyId}/execucao/${planId}`);
}

export async function createExecutionPlanAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = executionPlanInputSchema.safeParse({
    companyId: formData.get("companyId"),
    opportunityId: formData.get("opportunityId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    goal30: formData.get("goal30"),
    goal60: formData.get("goal60"),
    goal90: formData.get("goal90"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Preencha título e os três horizontes do plano." };
  }

  let planId: string;
  try {
    const plan = await createExecutionPlanFromOpportunity(userId, parsed.data.companyId, parsed.data);
    planId = plan.id;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível criar o plano." };
  }

  refresh(parsed.data.companyId, planId);
  redirect(`/empresas/${parsed.data.companyId}/execucao/${planId}`);
}

export async function changeExecutionTaskStatusAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const companyId = String(formData.get("companyId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const parsedStatus = taskStatusSchema.safeParse(formData.get("status"));
  if (!companyId || !planId || !taskId || !parsedStatus.success) {
    throw new Error("Atualização de tarefa inválida.");
  }
  await updateExecutionTaskStatus(userId, companyId, taskId, parsedStatus.data);
  refresh(companyId, planId);
}
