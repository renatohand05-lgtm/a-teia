"use client";

import { useActionState, useEffect, useState } from "react";
import { DIAGNOSTIC_DIMENSIONS, type DiagnosticDimensionKey } from "@/lib/diagnostic";
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
  const filled = DIAGNOSTIC_DIMENSIONS.every((dimension) => typeof scores[dimension.key] === "number");

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Cada nota é um <b style={{ color: "var(--text-1)" }}>DADO</b> informado por você (1 a 5). O gargalo será uma{" "}
        <b style={{ color: "var(--text-1)" }}>INFERÊNCIA</b> matemática — não uma evidência validada.
      </p>
      {DIAGNOSTIC_DIMENSIONS.map((dimension) => (
        <div key={dimension.key} className="surface-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <h3 className="m-0 text-[15px] font-bold">{dimension.label}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {dimension.explanation}
              </p>
            </div>
            <input type="hidden" name={`score-${dimension.key}`} value={scores[dimension.key] ?? ""} />
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = scores[dimension.key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScores((prev) => ({ ...prev, [dimension.key]: value }))}
                    className="h-10 w-10 rounded-xl text-[13px] font-extrabold"
                    style={
                      active
                        ? {
                            background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))",
                            color: "#241a08",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-2)",
                            border: "1px solid var(--border)",
                          }
                    }
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending || !filled || !idempotencyKey}
        className="rounded-xl px-5 py-3 text-[13px] font-extrabold text-[#241a08] disabled:opacity-45"
        style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
      >
        {pending ? "Salvando diagnóstico..." : "Salvar Diagnóstico 360°"}
      </button>
      {!filled ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Marque as 10 dimensões para habilitar o salvamento.
        </p>
      ) : null}
    </form>
  );
}
