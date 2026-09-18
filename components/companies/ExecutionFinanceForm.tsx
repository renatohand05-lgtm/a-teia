"use client";

import { useActionState } from "react";
import { saveExecutionFinanceAction, type FormActionState } from "@/app/empresas/execution-actions";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function ExecutionFinanceForm({
  companyId,
  planId,
  realizedCost,
  realizedReturn,
}: {
  companyId: string;
  planId: string;
  realizedCost: number | null;
  realizedReturn: number | null;
}) {
  const [state, formAction, pending] = useActionState(saveExecutionFinanceAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="planId" value={planId} />
      <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
        Retorno realizado só existe se você informar. O sistema nunca copia o retorno esperado.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Custo realizado
          <input name="realizedCost" inputMode="decimal" defaultValue={realizedCost ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Retorno realizado
          <input name="realizedReturn" inputMode="decimal" defaultValue={realizedReturn ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--gold-soft)" }}>Realizado salvo.</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl border px-4 py-2 text-[12px] font-bold disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
        {pending ? "Salvando..." : "Salvar realizado"}
      </button>
    </form>
  );
}
