"use client";

import { useActionState, useEffect, useState } from "react";
import { DIAGNOSTIC_DIMENSIONS, type DiagnosticDimensionKey } from "@/lib/diagnostic";
import { DIAGNOSTIC_SCALE, diagnosisCoverage } from "@/lib/diagnostic-ui";
import type { FormActionState } from "@/app/empresas/diagnostic-actions";

const initial: FormActionState = { ok: false, error: "" };

export function DiagnosticForm({
  action,
}: {
  action: (state: FormActionState | undefined, formData: FormData) => Promise<FormActionState>;
}) {
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [scores, setScores] = useState<Partial<Record<DiagnosticDimensionKey, number>>>({});
  const [state, formAction, pending] = useActionState(action, initial);
  const coverage = diagnosisCoverage(
    DIAGNOSTIC_DIMENSIONS.map((dimension) => ({ key: dimension.key, score: scores[dimension.key] })),
  );

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  return (
    <form action={formAction} id="realizar-diagnostico" className="space-y-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
        Cada nota é um dado informado (1 a 5). O gargalo é uma inferência — não evidência.
      </p>
      <ol className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--text-3)" }}>
        {DIAGNOSTIC_SCALE.map((item) => (
          <li key={item.value}>
            <b style={{ color: "var(--text-1)" }}>{item.value}</b> — {item.label}
          </li>
        ))}
      </ol>
      <p className="text-[12px] font-semibold">{coverage.label}</p>
      {DIAGNOSTIC_DIMENSIONS.map((dimension) => (
        <fieldset key={dimension.key} className="surface-card p-4">
          <legend className="px-1 text-[15px] font-bold">{dimension.label}</legend>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {dimension.explanation}
          </p>
          <input type="hidden" name={`score-${dimension.key}`} value={scores[dimension.key] ?? ""} />
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={`Nota de ${dimension.label}`}>
            {DIAGNOSTIC_SCALE.map((item) => {
              const active = scores[dimension.key] === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setScores((prev) => ({ ...prev, [dimension.key]: item.value }))}
                  aria-pressed={active}
                  aria-label={`${item.value} — ${item.label}`}
                  className="min-h-10 min-w-10 rounded-xl px-2 text-[13px] font-extrabold"
                  style={
                    active
                      ? { background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))", color: "#241a08" }
                      : { background: "rgba(255,255,255,0.04)", color: "var(--text-2)", border: "1px solid var(--border)" }
                  }
                >
                  {item.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending || !coverage.complete || !idempotencyKey}
        className="rounded-xl px-5 py-3 text-[13px] font-extrabold text-[#241a08] disabled:opacity-45"
        style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
      >
        {pending ? "Salvando..." : "Salvar Diagnóstico 360°"}
      </button>
    </form>
  );
}
