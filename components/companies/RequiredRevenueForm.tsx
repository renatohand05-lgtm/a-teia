"use client";

import { useActionState } from "react";
import { simulateRequiredRevenueAction, type FormActionState } from "@/app/empresas/financial-actions";
import { formatBRL } from "@/lib/format";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function RequiredRevenueForm({
  defaults,
}: {
  defaults: {
    desiredProfit?: number | null;
    cogsPercent?: number | null;
    taxPercent?: number | null;
    deliveryPercent?: number | null;
    otherVariablePercent?: number | null;
    fixedCosts?: number | null;
  };
}) {
  const [state, formAction, pending] = useActionState(simulateRequiredRevenueAction, initial);
  const result = state.ok && state.message ? Number(state.message) : null;
  return (
    <form action={formAction} className="space-y-4">
      <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Simulador: quanto precisa faturar para um lucro desejado. Fórmula em <b style={{ color: "var(--text-1)" }}>lib/financial-engine.ts</b>, não no formulário.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="desiredProfit" label="Lucro desejado (R$)" defaultValue={defaults.desiredProfit} />
        <Field name="fixedCosts" label="Custos fixos (R$)" defaultValue={defaults.fixedCosts} />
        <Field name="cogsPercent" label="CMV %" defaultValue={defaults.cogsPercent} />
        <Field name="taxPercent" label="Impostos %" defaultValue={defaults.taxPercent} />
        <Field name="deliveryPercent" label="Delivery %" defaultValue={defaults.deliveryPercent} />
        <Field name="otherVariablePercent" label="Outros variáveis %" defaultValue={defaults.otherVariablePercent} />
      </div>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      {result != null && Number.isFinite(result) ? (
        <p className="text-[16px] font-black" style={{ color: "var(--gold-soft)" }}>
          Faturamento necessário: {formatBRL(result)}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Calculando..." : "Calcular faturamento necessário"}
      </button>
    </form>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: number | null }) {
  return (
    <label className="block text-[12px] font-bold">
      {label}
      <input name={name} required inputMode="decimal" defaultValue={defaultValue ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
    </label>
  );
}
