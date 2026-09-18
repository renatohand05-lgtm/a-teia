"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { memoryIdSchema, memoryObservationSchema, memoryProposeSchema } from "@/lib/validations";
import { approveMemory, createObservation, proposeMemoryFromEvidence, rejectMemory } from "@/services/memoryService";

export type FormActionState = { ok: false; error: string } | { ok: true; id?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function refresh(companyId: string, memoryId?: string, extra?: { opportunityId?: string | null; experimentId?: string | null }) {
  revalidatePath(`/memoria`);
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/memoria`);
  revalidatePath(`/empresas/${companyId}/oportunidades`);
  revalidatePath(`/empresas/${companyId}/experimentos`);
  if (memoryId) revalidatePath(`/empresas/${companyId}/memoria/${memoryId}`);
  if (extra?.opportunityId) revalidatePath(`/empresas/${companyId}/oportunidades/${extra.opportunityId}`);
  if (extra?.experimentId) revalidatePath(`/empresas/${companyId}/experimentos/${extra.experimentId}`);
}

export async function proposeMemoryAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = memoryProposeSchema.safeParse({
    companyId: formData.get("companyId"),
    evidenceId: formData.get("evidenceId"),
    title: formData.get("title"),
    lesson: formData.get("lesson"),
    context: formData.get("context") || undefined,
    limitations: formData.get("limitations") || undefined,
    conditions: formData.get("conditions") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o aprendizado proposto." };
  }
  let id: string;
  try {
    const created = await proposeMemoryFromEvidence(userId, parsed.data);
    id = created.id;
    refresh(parsed.data.companyId, id, { experimentId: created.experimentId, opportunityId: created.opportunityId });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível propor o aprendizado." };
  }
  redirect(`/empresas/${parsed.data.companyId}/memoria/${id}`);
}

export async function createObservationAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = memoryObservationSchema.safeParse({
    companyId: formData.get("companyId"),
    origin: formData.get("origin") || "OBSERVATION",
    title: formData.get("title"),
    lesson: formData.get("lesson"),
    context: formData.get("context") || undefined,
    segment: formData.get("segment") || undefined,
    kpi: formData.get("kpi") || undefined,
    family: formData.get("family") || undefined,
    baseline: formData.get("baseline") || undefined,
    target: formData.get("target") || undefined,
    measuredResult: formData.get("measuredResult") || undefined,
    limitations: formData.get("limitations") || undefined,
    conditions: formData.get("conditions") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise a observação." };
  }
  let id: string;
  try {
    const created = await createObservation(userId, parsed.data);
    id = created.id;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível registrar a observação." };
  }
  refresh(parsed.data.companyId, id);
  redirect(`/empresas/${parsed.data.companyId}/memoria/${id}`);
}

export async function approveMemoryAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = memoryIdSchema.safeParse({
    companyId: formData.get("companyId"),
    memoryId: formData.get("memoryId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Memória inválida.");
  const approved = await approveMemory(userId, parsed.data.companyId, parsed.data.memoryId);
  refresh(parsed.data.companyId, parsed.data.memoryId, {
    experimentId: approved.experimentId,
    opportunityId: approved.opportunityId,
  });
}

export async function rejectMemoryAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = memoryIdSchema.safeParse({
    companyId: formData.get("companyId"),
    memoryId: formData.get("memoryId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Memória inválida.");
  const rejected = await rejectMemory(userId, parsed.data.companyId, parsed.data.memoryId);
  refresh(parsed.data.companyId, parsed.data.memoryId, {
    experimentId: rejected.experimentId,
    opportunityId: rejected.opportunityId,
  });
}
