"use client";

import { useActionState } from "react";
import { createObservationAction, type FormActionState } from "@/app/empresas/memory-actions";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function MemoryObservationForm({
  companyId,
  segment,
}: {
  companyId: string;
  segment: string | null;
}) {
  const [state, formAction, pending] = useActionState(createObservationAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Observação manual fica marcada como <b>OBSERVAÇÃO</b> — nunca como aprendizado validado.
      </p>
      <label className="block text-[12px] font-bold">
        Tipo
        <select name="origin" defaultValue="OBSERVATION" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }}>
          <option value="OBSERVATION">Observação</option>
          <option value="MANUAL_LESSON">Lição manual</option>
        </select>
      </label>
      <label className="block text-[12px] font-bold">
        Título
        <input name="title" required className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Lição / observação
        <textarea name="lesson" required rows={4} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Contexto
        <textarea name="context" rows={3} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          Segmento
          <input name="segment" defaultValue={segment ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Família estratégica
          <select name="family" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }}>
            <option value="">Não classificar</option>
            {DIAGNOSTIC_DIMENSIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] font-bold">
          KPI
          <input name="kpi" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Baseline
          <input name="baseline" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Meta
          <input name="target" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Resultado
          <input name="measuredResult" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Limitações
        <textarea name="limitations" rows={2} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Condições
        <textarea name="conditions" rows={2} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? (
        <p className="text-[12px] font-bold" style={{ color: "#f07178" }}>
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Salvando…" : "Registrar observação"}
      </button>
    </form>
  );
}
