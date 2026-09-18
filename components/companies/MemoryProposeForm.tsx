"use client";

import { useActionState } from "react";
import { proposeMemoryAction, type FormActionState } from "@/app/empresas/memory-actions";
import type { BuiltMemoryDraft } from "@/lib/memory-engine";
import { MEMORY_CONFIDENCE_LABELS, MEMORY_POLARITY_LABELS, familyLabel } from "@/lib/memory-engine";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function MemoryProposeForm({
  companyId,
  evidenceId,
  draft,
}: {
  companyId: string;
  evidenceId: string;
  draft: BuiltMemoryDraft;
}) {
  const [state, formAction, pending] = useActionState(proposeMemoryAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Revise o aprendizado proposto. Nada entra como memória validada sem a sua confirmação posterior.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Mini label="Hipótese" value={draft.experimentId ? "Herdada do experimento" : "Ausente"} />
        <Mini label="Resultado" value={draft.measuredResult != null ? String(draft.measuredResult) : "Não medido"} />
        <Mini label="Classificação" value={draft.classification ?? "—"} />
        <Mini label="Polaridade" value={MEMORY_POLARITY_LABELS[draft.polarity]} />
        <Mini label="Família" value={familyLabel(draft.family)} />
        <Mini
          label="Confiança sugerida"
          value={`${MEMORY_CONFIDENCE_LABELS[draft.confidence.level]} (${draft.confidence.score}/100)`}
        />
      </div>
      <ul className="space-y-1 text-[12px]" style={{ color: "var(--text-3)" }}>
        {draft.confidence.reasons.map((reason) => (
          <li key={reason}>· {reason}</li>
        ))}
      </ul>
      <label className="block text-[12px] font-bold">
        Título
        <input name="title" required defaultValue={draft.title} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Lição
        <textarea name="lesson" required rows={4} defaultValue={draft.lesson} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Contexto
        <textarea name="context" rows={3} defaultValue={draft.context} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Limitações
        <textarea name="limitations" rows={3} defaultValue={draft.limitations} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Condições
        <textarea name="conditions" rows={2} defaultValue={draft.conditions ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? (
        <p className="text-[12px] font-bold" style={{ color: "#f07178" }}>
          {state.error}
        </p>
      ) : null}
      <button
        disabled={pending || !draft.canCreateValidated}
        className="rounded-xl px-4 py-3 text-[12px] font-black disabled:opacity-50"
        style={{ background: "var(--gold)", color: "#111" }}
      >
        {pending ? "Salvando proposta…" : "Confirmar proposta de aprendizado"}
      </button>
      {!draft.canCreateValidated ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Hipótese não vira memória validada. É preciso evidência de experimento concluído.
        </p>
      ) : null}
    </form>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>
        {label}
      </div>
      <div className="mt-1 text-[13px] font-bold">{value}</div>
    </div>
  );
}
