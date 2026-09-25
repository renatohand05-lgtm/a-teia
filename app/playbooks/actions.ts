"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approvePlaybook,
  archivePlaybook,
  completePlaybookApplication,
  confirmPlaybookApplication,
  createPlaybookApplicationExperiment,
  createPlaybookApplicationPlan,
  createPlaybookFromMemory,
  createPlaybookFromStrategy,
  decidePlaybookApplication,
  proposePlaybookApplication,
  proposePlaybookApplicationMemory,
  recordPlaybookApplicationResult,
  rejectPlaybookApplication,
  requestPlaybookApplicationDecision,
  reviewPlaybookApplication,
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
  revalidatePath("/aplicacoes");
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
  const targetRaw = String(formData.get("target") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const result = await proposePlaybookApplication(ownerId, playbookId, companyId, {
    kpi: kpi || undefined,
    horizonDays: Number.isFinite(horizon) && horizon > 0 ? horizon : undefined,
    investment: investmentRaw ? Number(investmentRaw) : undefined,
    hypothesis: hypothesis || undefined,
    target: targetRaw ? Number(targetRaw) : undefined,
    channel: channel || undefined,
  });
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
  revalidatePath(`/aplicacoes/${result.application.id}`);
  if (result.alreadyActive) {
    redirect(`/aplicacoes/${result.application.id}`);
  }
  redirect(`/aplicacoes/${result.application.id}`);
}

export async function confirmPlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a criação da oportunidade.");
  const result = await confirmPlaybookApplication(ownerId, applicationId, true);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
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
  revalidatePath("/aplicacoes");
}

export async function reviewPlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  await reviewPlaybookApplication(ownerId, applicationId);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
}

export async function requestPlaybookDecisionAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  await requestPlaybookApplicationDecision(ownerId, applicationId);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
  revalidatePath("/cockpit");
}

export async function decidePlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  const action = String(formData.get("decision") ?? "review") as "approve" | "reject" | "defer" | "review";
  if (action === "approve" && String(formData.get("confirm") ?? "") !== "1") {
    throw new Error("Confirme a decisão humana.");
  }
  await decidePlaybookApplication(ownerId, applicationId, action, String(formData.get("reason") ?? "") || undefined);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
  revalidatePath("/cockpit");
}

export async function createPlaybookApplicationPlanAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  const result = await createPlaybookApplicationPlan(ownerId, applicationId);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
  if (result.application.actionPlanId) {
    revalidatePath(`/empresas/${result.application.destinationCompanyId}/execucao/${result.application.actionPlanId}`);
  }
}

export async function createPlaybookApplicationExperimentAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  const result = await createPlaybookApplicationExperiment(ownerId, applicationId);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
  if (result.application.experimentId) {
    revalidatePath(`/empresas/${result.application.destinationCompanyId}/experimentos/${result.application.experimentId}`);
  }
}

export async function recordPlaybookApplicationResultAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  const finalValue = Number(formData.get("finalValue") ?? "");
  if (!Number.isFinite(finalValue)) throw new Error("Informe o resultado medido.");
  const investmentRaw = String(formData.get("realizedInvestment") ?? "");
  const returnRaw = String(formData.get("realizedReturn") ?? "");
  await recordPlaybookApplicationResult(ownerId, applicationId, {
    finalValue,
    realizedInvestment: investmentRaw ? Number(investmentRaw) : undefined,
    realizedReturn: returnRaw ? Number(returnRaw) : undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
}

export async function proposePlaybookApplicationMemoryAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  await proposePlaybookApplicationMemory(ownerId, applicationId);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
}

export async function completePlaybookApplicationAction(formData: FormData) {
  const ownerId = await actor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const playbookId = String(formData.get("playbookId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a conclusão do ciclo.");
  await completePlaybookApplication(ownerId, applicationId);
  revalidatePath(`/playbooks/${playbookId}`);
  revalidatePath("/aplicacoes");
}
