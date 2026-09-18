"use client";

import { useActionState } from "react";
import { completeExperimentAction, type FormActionState } from "@/app/empresas/experiment-actions";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function ExperimentResultForm({
  companyId,
  experimentId,
  latestMeasurement,
}: {
  companyId: string;
  experimentId: string;
  latestMeasurement: number | null;
}) {
  const [state, formAction, pending] = useActionState(completeExperimentAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="experimentId" value={experimentId} />
      <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
        Informe o valor final medido. Retorno realizado só entra se você registrar — o esperado nunca é copiado.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Valor final
          <input name="finalValue" required inputMode="decimal" defaultValue={latestMeasurement ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Investimento realizado
          <input name="realizedInvestment" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Retorno realizado
          <input name="realizedReturn" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Base de receita para impacto (opcional)
          <input name="revenueBase" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Observação final
        <textarea name="notes" rows={2} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Encerrando..." : "Encerrar e gerar evidência"}
      </button>
    </form>
  );
}
