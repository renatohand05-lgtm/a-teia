"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { assertAiCannotExecute } from "@/lib/security/critical-actions";
import { AppError } from "@/lib/security/errors";
import { consumeNamedLimit } from "@/lib/security/rate-limit";
import {
  acknowledgeAlert,
  createAutomationFromTemplate,
  dismissAlert,
  markNotificationRead,
  resolveAlert,
  runAutomation,
  setAutomationEnabled,
} from "@/services/automationService";

async function actor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function createAutomationAction(formData: FormData) {
  const user = await actor();
  await createAutomationFromTemplate({
    ownerId: user.id,
    templateKey: String(formData.get("templateKey") ?? ""),
    companyId: String(formData.get("companyId") ?? "") || undefined,
    enabled: false,
  });
  revalidatePath("/automacoes");
  revalidatePath("/cockpit");
}

export async function enableAutomationAction(automationId: string, enabled: boolean) {
  const user = await actor();
  assertAiCannotExecute("automation.enable");
  await setAutomationEnabled({ ownerId: user.id, automationId, enabled });
  revalidatePath("/automacoes");
  revalidatePath("/cockpit");
}

export async function runAutomationAction(automationId: string) {
  const user = await actor();
  const limited = consumeNamedLimit("automation", user.id);
  if (!limited.ok) {
    throw new AppError("RATE_LIMITED", HUMAN_MESSAGES.rateLimited);
  }
  await runAutomation({ ownerId: user.id, automationId, mode: "manual" });
  revalidatePath("/automacoes");
  revalidatePath("/cockpit");
}

export async function acknowledgeAlertAction(alertId: string) {
  const user = await actor();
  await acknowledgeAlert({ ownerId: user.id, alertId });
  revalidatePath("/automacoes");
  revalidatePath("/cockpit");
}

export async function resolveAlertAction(alertId: string) {
  const user = await actor();
  await resolveAlert({ ownerId: user.id, alertId });
  revalidatePath("/automacoes");
  revalidatePath("/cockpit");
}

export async function dismissAlertAction(alertId: string) {
  const user = await actor();
  await dismissAlert({ ownerId: user.id, alertId });
  revalidatePath("/automacoes");
  revalidatePath("/cockpit");
}

export async function readNotificationAction(notificationId: string) {
  const user = await actor();
  await markNotificationRead({ ownerId: user.id, notificationId });
  revalidatePath("/automacoes");
}
