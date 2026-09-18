"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  experimentIdSchema,
  experimentInputSchema,
  experimentMeasurementSchema,
  experimentResultSchema,
} from "@/lib/validations";
import {
  addMeasurement,
  cancelExperiment,
  completeExperiment,
  createExperiment,
  startExperiment,
} from "@/services/experimentService";

export type FormActionState = { ok: false; error: string } | { ok: true; id?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function refresh(companyId: string, experimentId?: string, opportunityId?: string) {
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/experimentos`);
  revalidatePath(`/empresas/${companyId}/oportunidades`);
  revalidatePath(`/empresas/${companyId}/execucao`);
  if (experimentId) {
    revalidatePath(`/empresas/${companyId}/experimentos/${experimentId}`);
    revalidatePath(`/empresas/${companyId}/experimentos/${experimentId}/medicoes`);
    revalidatePath(`/empresas/${companyId}/experimentos/${experimentId}/resultado`);
  }
  revalidatePath(`/empresas/${companyId}/memoria`);
  if (opportunityId) revalidatePath(`/empresas/${companyId}/oportunidades/${opportunityId}`);
}

export async function createExperimentAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = experimentInputSchema.safeParse({
    companyId: formData.get("companyId"),
    opportunityId: formData.get("opportunityId") || undefined,
    actionPlanId: formData.get("actionPlanId") || undefined,
    strategyId: formData.get("strategyId") || undefined,
    title: formData.get("title"),
    hypothesis: formData.get("hypothesis"),
    kpi: formData.get("kpi"),
    kpiCustom: formData.get("kpiCustom") || undefined,
    kpiUnit: formData.get("kpiUnit") || undefined,
    direction: formData.get("direction"),
    baseline: formData.get("baseline") || undefined,
    target: formData.get("target") || undefined,
    startedAt: formData.get("startedAt") || undefined,
    plannedEndAt: formData.get("plannedEndAt") || undefined,
    investment: formData.get("investment") || undefined,
    testDescription: formData.get("testDescription") || undefined,
    successCriteria: formData.get("successCriteria") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados do experimento." };
  }
  let id: string;
  try {
    const created = await createExperiment(userId, parsed.data);
    id = created.id;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível criar o experimento." };
  }
  refresh(parsed.data.companyId, id, parsed.data.opportunityId);
  redirect(`/empresas/${parsed.data.companyId}/experimentos/${id}`);
}

export async function startExperimentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = experimentIdSchema.safeParse({
    companyId: formData.get("companyId"),
    experimentId: formData.get("experimentId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Experimento inválido.");
  await startExperiment(userId, parsed.data.companyId, parsed.data.experimentId);
  refresh(parsed.data.companyId, parsed.data.experimentId);
}

export async function cancelExperimentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = experimentIdSchema.safeParse({
    companyId: formData.get("companyId"),
    experimentId: formData.get("experimentId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Experimento inválido.");
  await cancelExperiment(userId, parsed.data.companyId, parsed.data.experimentId);
  refresh(parsed.data.companyId, parsed.data.experimentId);
}

export async function addMeasurementAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = experimentMeasurementSchema.safeParse({
    companyId: formData.get("companyId"),
    experimentId: formData.get("experimentId"),
    measuredValue: formData.get("measuredValue"),
    recordedAt: formData.get("recordedAt") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise a medição." };
  }
  try {
    await addMeasurement(userId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível registrar a medição." };
  }
  refresh(parsed.data.companyId, parsed.data.experimentId);
  return { ok: true };
}

export async function completeExperimentAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = experimentResultSchema.safeParse({
    companyId: formData.get("companyId"),
    experimentId: formData.get("experimentId"),
    finalValue: formData.get("finalValue"),
    realizedInvestment: formData.get("realizedInvestment") || undefined,
    realizedReturn: formData.get("realizedReturn") || undefined,
    revenueBase: formData.get("revenueBase") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o resultado final." };
  }
  try {
    await completeExperiment(userId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível encerrar o experimento." };
  }
  refresh(parsed.data.companyId, parsed.data.experimentId);
  redirect(`/empresas/${parsed.data.companyId}/experimentos/${parsed.data.experimentId}`);
}
