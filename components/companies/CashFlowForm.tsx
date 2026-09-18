"use client";

import { useActionState } from "react";
import { saveCashEntryAction, type FormActionState } from "@/app/empresas/financial-actions";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function CashFlowForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(saveCashEntryAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Tipo
          <select name="direction" className={`${field} mt-2`} style={{ borderColor: "var(--border)", background: "#0b0b0e" }}>
            <option value="INFLOW">Entrada</option>
            <option value="OUTFLOW">Saída</option>
          </select>
        </label>
        <label className="block text-[12px] font-bold">
          Categoria
          <input name="category" required className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} placeholder="Vendas, aluguel, folha..." />
        </label>
        <label className="block text-[12px] font-bold">
          Valor
          <input name="amount" required inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Data
          <input name="occurredAt" type="date" required className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Descrição
        <textarea name="description" rows={2} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--gold-soft)" }}>Lançamento registrado.</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Registrando..." : "Registrar lançamento"}
      </button>
    </form>
  );
}
