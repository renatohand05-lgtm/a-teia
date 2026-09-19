"use client";

import { useActionState } from "react";
import { completeExperimentAction, type FormActionState } from "@/app/empresas/experiment-actions";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function ExperimentResultForm({
  companyId,
  experimentId,
  unit,
}: {
  companyId: string;
  experimentId: string;
  latestMeasurement?: number | null;
  unit?: string | null;
}) {
  const [state, formAction, pending] = useActionState(completeExperimentAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="experimentId" value={experimentId} />
      <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
        Registrar resultado é um evento explícito. A data de término sozinha não encerra o teste. Não invente impacto financeiro.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Valor medido{unit ? ` (${unit})` : ""}
          <input name="finalValue" required inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Data da medição
          <input name="recordedAt" type="date" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Impacto financeiro real observado
          <input name="realizedReturn" inputMode="decimal" placeholder="Deixe vazio se não mediu" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Investimento realizado
          <input name="realizedInvestment" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Resultado observado
        <textarea name="notes" rows={3} placeholder="O que aconteceu neste período, sem causalidade inventada." className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Registrando..." : "Registrar resultado"}
      </button>
    </form>
  );
}
