"use client";

import { useActionState } from "react";
import { addMeasurementAction, type FormActionState } from "@/app/empresas/experiment-actions";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function MeasurementForm({ companyId, experimentId }: { companyId: string; experimentId: string }) {
  const [state, formAction, pending] = useActionState(addMeasurementAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="experimentId" value={experimentId} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Valor medido
          <input name="measuredValue" required inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Data
          <input name="recordedAt" type="date" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Observação
        <textarea name="notes" rows={2} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--gold-soft)" }}>Medição adicionada. Histórico preservado.</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl px-4 py-2 text-[12px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Registrando..." : "Registrar medição"}
      </button>
    </form>
  );
}
