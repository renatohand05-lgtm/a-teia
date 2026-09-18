"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  cashFlowInputSchema,
  dreInputSchema,
  financialGoalSchema,
  requiredRevenueSchema,
} from "@/lib/validations";
import { calculateRequiredRevenue } from "@/lib/financial-engine";
import { createCashEntry, upsertDre, upsertFinancialGoal } from "@/services/financialService";

export type FormActionState = { ok: false; error: string } | { ok: true; id?: string; message?: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function refreshFinance(companyId: string) {
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath(`/empresas/${companyId}/financeiro`);
  revalidatePath(`/empresas/${companyId}/financeiro/dre`);
  revalidatePath(`/empresas/${companyId}/financeiro/fluxo-caixa`);
  revalidatePath(`/empresas/${companyId}/financeiro/cenarios`);
  revalidatePath(`/empresas/${companyId}/financeiro/metas`);
}

function periodFields(formData: FormData) {
  return {
    companyId: formData.get("companyId"),
    periodMonth: formData.get("periodMonth"),
    periodYear: formData.get("periodYear"),
  };
}

export async function saveDreAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = dreInputSchema.safeParse({
    ...periodFields(formData),
    grossRevenue: formData.get("grossRevenue") || undefined,
    deductions: formData.get("deductions") || undefined,
    cogs: formData.get("cogs") || undefined,
    payroll: formData.get("payroll") || undefined,
    rent: formData.get("rent") || undefined,
    water: formData.get("water") || undefined,
    energy: formData.get("energy") || undefined,
    internet: formData.get("internet") || undefined,
    marketing: formData.get("marketing") || undefined,
    delivery: formData.get("delivery") || undefined,
    accounting: formData.get("accounting") || undefined,
    maintenance: formData.get("maintenance") || undefined,
    otherOpex: formData.get("otherOpex") || undefined,
    salesCount: formData.get("salesCount") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os valores do DRE." };
  }
  try {
    await upsertDre(userId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível salvar o DRE." };
  }
  refreshFinance(parsed.data.companyId);
  return { ok: true };
}

export async function saveGoalAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = financialGoalSchema.safeParse({
    ...periodFields(formData),
    revenueTarget: formData.get("revenueTarget") || undefined,
    ebitdaTarget: formData.get("ebitdaTarget") || undefined,
    ebitdaPercentTarget: formData.get("ebitdaPercentTarget") || undefined,
    cogsPercentTarget: formData.get("cogsPercentTarget") || undefined,
    payrollPercentTarget: formData.get("payrollPercentTarget") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise as metas." };
  }
  try {
    await upsertFinancialGoal(userId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível salvar as metas." };
  }
  refreshFinance(parsed.data.companyId);
  return { ok: true };
}

export async function saveCashEntryAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  const userId = await requireUserId();
  const parsed = cashFlowInputSchema.safeParse({
    companyId: formData.get("companyId"),
    direction: formData.get("direction"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    occurredAt: formData.get("occurredAt"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o lançamento de caixa." };
  }
  try {
    await createCashEntry(userId, parsed.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível registrar o caixa." };
  }
  refreshFinance(parsed.data.companyId);
  return { ok: true };
}

export async function simulateRequiredRevenueAction(
  _: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState> {
  await requireUserId();
  const parsed = requiredRevenueSchema.safeParse({
    desiredProfit: formData.get("desiredProfit"),
    cogsPercent: formData.get("cogsPercent"),
    taxPercent: formData.get("taxPercent"),
    deliveryPercent: formData.get("deliveryPercent"),
    otherVariablePercent: formData.get("otherVariablePercent"),
    fixedCosts: formData.get("fixedCosts"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o simulador." };
  }
  const result = calculateRequiredRevenue(parsed.data);
  if (result.value == null) {
    return { ok: false, error: `Dados insuficientes: ${result.missing.join(", ") || "margem de contribuição inválida"}.` };
  }
  return { ok: true, message: String(result.value) };
}
