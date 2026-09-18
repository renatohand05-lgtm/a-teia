"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { confirmProposedAction, rejectProposedAction } from "@/services/aiActionService";

export async function confirmAiProposalAction(proposalId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const result = await confirmProposedAction(session.user.id, proposalId);
  redirect(result.href);
}

export async function rejectAiProposalAction(proposalId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await rejectProposedAction(session.user.id, proposalId);
}
