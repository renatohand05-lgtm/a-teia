"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AllocationHorizon, AllocationScenarioKind } from "@prisma/client";
import { auth } from "@/auth";
import {
  createPlanFromApprovedAllocation,
  reviewAllocationProposal,
  sendAllocationToDecision,
  simulateAllocation,
  type BudgetInput,
} from "@/services/allocationService";

async function actor() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function optionalNumber(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function optionalInt(form: FormData, key: string): number | null {
  const n = optionalNumber(form, key);
  return n == null ? null : Math.round(n);
}

function budgetFromForm(form: FormData): BudgetInput {
  const horizon = String(form.get("horizon") ?? "DAYS_90") as AllocationHorizon;
  const scenario = String(form.get("scenario") ?? "BALANCEADO") as AllocationScenarioKind;
  return {
    capitalAvailable: optionalNumber(form, "capitalAvailable"),
    hoursAvailable: optionalNumber(form, "hoursAvailable"),
    capacityLimit: optionalInt(form, "capacityLimit"),
    reserveMinimum: optionalNumber(form, "reserveMinimum"),
    maxPerCompany: optionalNumber(form, "maxPerCompany"),
    maxPerInitiative: optionalNumber(form, "maxPerInitiative"),
    maxPercentPerInitiative: optionalNumber(form, "maxPercentPerInitiative"),
    horizon: ["DAYS_30", "DAYS_60", "DAYS_90", "MONTHS_6", "MONTHS_12"].includes(horizon) ? horizon : "DAYS_90",
    scenario: ["CONSERVADOR", "BALANCEADO", "EXPANSAO"].includes(scenario) ? scenario : "BALANCEADO",
  };
}

export async function simulateAllocationAction(formData: FormData) {
  const ownerId = await actor();
  await simulateAllocation(ownerId, budgetFromForm(formData));
  revalidatePath("/alocacao");
  revalidatePath("/cockpit");
}

export async function reviewAllocationAction(proposalId: string, expectedUpdatedAt: string) {
  const ownerId = await actor();
  await reviewAllocationProposal({ ownerId, proposalId, expectedUpdatedAt });
  revalidatePath("/alocacao");
  revalidatePath("/cockpit");
}

export async function sendAllocationDecisionAction(proposalId: string, expectedUpdatedAt: string) {
  const ownerId = await actor();
  await sendAllocationToDecision({ ownerId, proposalId, expectedUpdatedAt });
  revalidatePath("/alocacao");
  revalidatePath("/cockpit");
}

export async function createPlanFromAllocationAction(proposalId: string) {
  const ownerId = await actor();
  const plan = await createPlanFromApprovedAllocation({ ownerId, proposalId });
  revalidatePath("/alocacao");
  if (plan.companyId) redirect(`/empresas/${plan.companyId}/execucao/${plan.id}`);
}
