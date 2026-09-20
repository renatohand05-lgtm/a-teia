"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditSource } from "@prisma/client";
import { auth } from "@/auth";
import { writeAudit } from "@/services/auditService";
import { syncAllocationFromDecision } from "@/services/allocationService";
import { approveDecision, deferDecision, rejectDecision, reviewDecision } from "@/services/decisionService";

async function actor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function approveDecisionAction(decisionId: string, humanReason?: string) {
  const actorId = await actor();
  await approveDecision({ actorId, decisionId, humanReason });
  await syncAllocationFromDecision({ actorId, decisionId, status: "APPROVED" });
  revalidatePath("/cockpit");
  revalidatePath("/alocacao");
}

export async function rejectDecisionAction(decisionId: string, humanReason?: string) {
  const actorId = await actor();
  await rejectDecision({ actorId, decisionId, humanReason });
  await syncAllocationFromDecision({ actorId, decisionId, status: "REJECTED" });
  revalidatePath("/cockpit");
  revalidatePath("/alocacao");
}

export async function deferDecisionAction(decisionId: string) {
  const actorId = await actor();
  await deferDecision({ actorId, decisionId });
  revalidatePath("/cockpit");
}

export async function reviewDecisionAction(decisionId: string) {
  const actorId = await actor();
  await reviewDecision({ actorId, decisionId });
  revalidatePath("/cockpit");
}

export async function openPriorityAction(priorityId: string) {
  const actorId = await actor();
  await writeAudit({
    actorId,
    action: "priority.opened",
    entity: "Cockpit",
    entityId: priorityId.slice(0, 80),
    origin: AuditSource.USER,
  });
}

export async function recordCockpitViewAction() {
  const actorId = await actor();
  await writeAudit({
    actorId,
    action: "cockpit.viewed",
    entity: "Cockpit",
    origin: AuditSource.USER,
  });
}
