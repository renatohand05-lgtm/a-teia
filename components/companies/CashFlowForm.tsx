"use client";

import { useActionState } from "react";
import { saveCashEntryAction, type FormActionState } from "@/app/empresas/financial-actions";
import { MoneyInput } from "@/components/ui/MoneyInput";

const initial: FormActionState = { ok: false, error: "" };
const field = "teia-input";

export function CashFlowForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(saveCashEntryAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Tipo
          <select name="direction" className={`teia-select mt-2`}>
            <option value="INFLOW">Entrada</option>
            <option value="OUTFLOW">Saída</option>
          </select>
        </label>
        <label className="block text-[12px] font-bold">
          Categoria
          <input name="category" required className={`${field} mt-2`} placeholder="Vendas, aluguel, folha..." />
        </label>
        <label className="block text-[12px] font-bold">
          Valor
          <MoneyInput name="amount" required className={`${field} mt-2`} ariaLabel="Valor" />
        </label>
        <label className="block text-[12px] font-bold">
          Data
          <input name="occurredAt" type="date" required className={`${field} mt-2`} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Descrição
        <textarea name="description" rows={2} className="teia-textarea mt-2" />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px]" style={{ color: "var(--danger)" }}>{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--success)" }}>Lançamento registrado.</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Registrando..." : "Registrar lançamento"}
      </button>
    </form>
  );
}
