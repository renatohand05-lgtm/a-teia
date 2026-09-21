"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approvePlaybook,
  archivePlaybook,
  confirmPlaybookApplication,
  createPlaybookFromMemory,
  createPlaybookFromStrategy,
  proposePlaybookApplication,
  rejectPlaybookApplication,
  submitPlaybook,
} from "@/services/playbookService";

async function actor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createPlaybookFromMemoryAction(formData: FormData) {
  const ownerId = await actor();
  const memoryId = String(formData.get("memoryId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const playbook = await createPlaybookFromMemory(ownerId, memoryId);
  revalidatePath("/playbooks");
  if (companyId) revalidatePath(`/empresas/${companyId}/memoria/${memoryId}`);
  redirect(`/playbooks/${playbook.id}`);
}

export async function createPlaybookFromStrategyAction(formData: FormData) {
  const ownerId = await actor();
  const strategyId = String(formData.get("strategyId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a criação do playbook.");
  const playbook = await createPlaybookFromStrategy(ownerId, strategyId);
  revalidatePath("/playbooks");
  revalidatePath(`/estrategias/${strategyId}`);
  redirect(`/playbooks/${playbook.id}`);
}

export async function submitPlaybookAction(playbookId: string) {
  const ownerId = await actor();
  await submitPlaybook(ownerId, playbookId);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${playbookId}`);
}

export async function approvePlaybookAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("playbookId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a revisão humana.");
  await approvePlaybook(ownerId, id, true);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${id}`);
}

export async function archivePlaybookAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("playbookId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme o arquivamento.");
  await archivePlaybook(ownerId, id);
  revalidatePath("/playbooks");
}

export async function proposePlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const playbookId = String(formData.get("playbookId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const kpi = String(formData.get("kpi") ?? "");
  const horizon = Number(formData.get("horizonDays") ?? "");
  const investmentRaw = String(formData.get("investment") ?? "");
  const hypothesis = String(formData.get("hypothesis") ?? "");
  const result = await proposePlaybookApplication(ownerId, playbookId, companyId, {
    kpi: kpi || undefined,
    horizonDays: Number.isFinite(horizon) && horizon > 0 ? horizon : undefined,
    investment: investmentRaw ? Number(investmentRaw) : undefined,
    hypothesis: hypothesis || undefined,
  });
  revalidatePath(`/playbooks/${playbookId}`);
  if (result.alreadyActive) {
    redirect(`/playbooks/${playbookId}?aplicar=1&empresa=${companyId}&aviso=1`);
  }
  redirect(`/playbooks/${playbookId}?aplicar=1&empresa=${companyId}&proposta=${result.application.id}`);
}

export async function confirmPlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a criação da oportunidade.");
  const result = await confirmPlaybookApplication(ownerId, applicationId, true);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath(`/empresas/${result.opportunity.companyId}/oportunidades`);
  redirect(`/empresas/${result.opportunity.companyId}/oportunidades/${result.opportunity.id}`);
}

export async function rejectPlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a rejeição.");
  await rejectPlaybookApplication(ownerId, applicationId, true);
  revalidatePath(`/playbooks/${playbookId}`);
}
