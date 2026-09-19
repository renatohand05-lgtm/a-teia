"use client";

import { useActionState } from "react";
import { saveGoalAction, type FormActionState } from "@/app/empresas/financial-actions";
import { MoneyInput } from "@/components/ui/MoneyInput";
import type { FinancialGoalDTO } from "@/services/financialService";
import type { YearMonth } from "@/lib/period";

const initial: FormActionState = { ok: false, error: "" };
const field = "teia-input";

export function GoalForm({
  companyId,
  period,
  goals,
}: {
  companyId: string;
  period: YearMonth;
  goals: FinancialGoalDTO;
}) {
  const [state, formAction, pending] = useActionState(saveGoalAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="periodMonth" value={period.periodMonth} />
      <input type="hidden" name="periodYear" value={period.periodYear} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="revenueTarget" label="Meta de faturamento (R$)" defaultValue={goals.revenueTarget} kind="money" />
        <Field name="ebitdaTarget" label="Meta de EBITDA (R$)" defaultValue={goals.ebitdaTarget} kind="money" />
        <Field name="ebitdaPercentTarget" label="Meta de EBITDA %" defaultValue={goals.ebitdaPercentTarget} kind="percent" />
        <Field name="cogsPercentTarget" label="Meta de CMV %" defaultValue={goals.cogsPercentTarget} kind="percent" />
        <Field name="payrollPercentTarget" label="Meta de folha %" defaultValue={goals.payrollPercentTarget} kind="percent" />
      </div>
      {state && !state.ok && state.error ? <p className="text-[12px]" style={{ color: "var(--danger)" }}>{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--success)" }}>Metas salvas.</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Salvando..." : "Salvar metas"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  kind,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  kind: "money" | "percent";
}) {
  return (
    <label className="block text-[12px] font-bold">
      {label}
      <MoneyInput name={name} defaultValue={defaultValue} kind={kind} className={`${field} mt-2`} ariaLabel={label} />
    </label>
  );
}
