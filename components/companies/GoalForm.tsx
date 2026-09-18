"use client";

import { useActionState } from "react";
import { saveGoalAction, type FormActionState } from "@/app/empresas/financial-actions";
import type { FinancialGoalDTO } from "@/services/financialService";
import type { YearMonth } from "@/lib/period";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

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
        <Field name="revenueTarget" label="Meta de faturamento (R$)" defaultValue={goals.revenueTarget} />
        <Field name="ebitdaTarget" label="Meta de EBITDA (R$)" defaultValue={goals.ebitdaTarget} />
        <Field name="ebitdaPercentTarget" label="Meta de EBITDA %" defaultValue={goals.ebitdaPercentTarget} />
        <Field name="cogsPercentTarget" label="Meta de CMV %" defaultValue={goals.cogsPercentTarget} />
        <Field name="payrollPercentTarget" label="Meta de folha %" defaultValue={goals.payrollPercentTarget} />
      </div>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--gold-soft)" }}>Metas salvas.</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Salvando..." : "Salvar metas"}
      </button>
    </form>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: number | null }) {
  return (
    <label className="block text-[12px] font-bold">
      {label}
      <input name={name} inputMode="decimal" defaultValue={defaultValue ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
    </label>
  );
}
