"use server";

import { TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createExecutionPlanFromOpportunity, updateExecutionTaskStatus } from "@/services/executionService";

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

export async function createExecutionPlanAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const companyId = String(formData.get("companyId") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const goal30 = String(formData.get("goal30") ?? "").trim();
  const goal60 = String(formData.get("goal60") ?? "").trim();
  const goal90 = String(formData.get("goal90") ?? "").trim();

  if (!companyId || !opportunityId || !title || !goal30 || !goal60 || !goal90) {
    throw new Error("Preencha título e os três horizontes do plano.");
  }

  const plan = await createExecutionPlanFromOpportunity(userId, companyId, opportunityId, {
    title,
    summary: summary || null,
    goal30,
    goal60,
    goal90,
  });
  refresh(companyId, plan.id);
  redirect(`/empresas/${companyId}/execucao/${plan.id}`);
}

export async function changeExecutionTaskStatusAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const companyId = String(formData.get("companyId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!companyId || !planId || !taskId || !Object.values(TaskStatus).includes(status)) {
    throw new Error("Atualização de tarefa inválida.");
  }
  await updateExecutionTaskStatus(userId, companyId, taskId, status);
  refresh(companyId, planId);
}
