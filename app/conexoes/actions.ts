"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approveConnection,
  archiveConnection,
  rejectConnection,
  reviewConnection,
} from "@/services/connectionService";
import {
  approveStrategy,
  convertStrategyToOpportunity,
  createStrategyFromConnection,
  rejectStrategy,
  reviewStrategy,
} from "@/services/strategyService";

async function actor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function reviewConnectionAction(connectionId: string) {
  const ownerId = await actor();
  await reviewConnection(ownerId, connectionId);
  revalidatePath("/conexoes");
  revalidatePath(`/conexoes/${connectionId}`);
}

export async function approveConnectionAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("connectionId") ?? "");
  const confirmed = String(formData.get("confirm") ?? "") === "1";
  if (!confirmed) throw new Error("Confirme a aprovação humana.");
  await approveConnection(ownerId, id);
  revalidatePath("/conexoes");
  revalidatePath(`/conexoes/${id}`);
}

export async function rejectConnectionAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("connectionId") ?? "");
  const confirmed = String(formData.get("confirm") ?? "") === "1";
  if (!confirmed) throw new Error("Confirme a rejeição.");
  await rejectConnection(ownerId, id);
  revalidatePath("/conexoes");
  revalidatePath(`/conexoes/${id}`);
}

export async function archiveConnectionAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("connectionId") ?? "");
  await archiveConnection(ownerId, id);
  revalidatePath("/conexoes");
}

export async function createStrategyFromConnectionAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("connectionId") ?? "");
  const confirmed = String(formData.get("confirm") ?? "") === "1";
  if (!confirmed) throw new Error("Confirme a criação da estratégia.");
  const strategy = await createStrategyFromConnection(ownerId, id);
  revalidatePath("/conexoes");
  revalidatePath("/estrategias");
  redirect(`/estrategias/${strategy.id}`);
}

export async function reviewStrategyAction(strategyId: string) {
  const ownerId = await actor();
  await reviewStrategy(ownerId, strategyId);
  revalidatePath("/estrategias");
}

export async function approveStrategyAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("strategyId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a aprovação humana.");
  await approveStrategy(ownerId, id);
  revalidatePath("/estrategias");
  revalidatePath(`/estrategias/${id}`);
}

export async function rejectStrategyAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("strategyId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "1") throw new Error("Confirme a rejeição.");
  await rejectStrategy(ownerId, id);
  revalidatePath("/estrategias");
}

export async function convertStrategyAction(formData: FormData) {
  const ownerId = await actor();
  const id = String(formData.get("strategyId") ?? "");
  const result = await convertStrategyToOpportunity(ownerId, id, String(formData.get("confirm") ?? "") === "1");
  revalidatePath("/estrategias");
  revalidatePath(`/empresas/${result.opportunity.companyId}/oportunidades`);
  redirect(`/empresas/${result.opportunity.companyId}/oportunidades/${result.opportunity.id}`);
}
