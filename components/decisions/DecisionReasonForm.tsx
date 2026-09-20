"use client";

import { useState, useTransition } from "react";
import { assistantHref } from "@/lib/assistant-ui";
import { HUMAN_REASON_MAX, humanReasonHint } from "@/lib/decision-reason";

export function DecisionReasonForm({
  decisionId,
  companyId,
  title,
  onApprove,
  onReject,
}: {
  decisionId: string;
  companyId?: string | null;
  title: string;
  onApprove: (decisionId: string, reason: string) => Promise<void>;
  onReject: (decisionId: string, reason: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  if (mode === "idle") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-[#241a08]"
          style={{ background: "var(--gold-soft)" }}
          onClick={() => setMode("approve")}
        >
          Aprovar
        </button>
        <button type="button" className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }} onClick={() => setMode("reject")}>
          Rejeitar
        </button>
      </div>
    );
  }

  const approving = mode === "approve";
  const suggest = assistantHref(
    companyId,
    approving
      ? `Sugira uma justificativa curta para aprovar: ${title}`
      : `Sugira uma justificativa curta para rejeitar: ${title}`,
  );

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          if (approving) await onApprove(decisionId, reason);
          else await onReject(decisionId, reason);
        });
      }}
    >
      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Justificativa {approving ? "da aprovação" : "da rejeição"}
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={HUMAN_REASON_MAX}
          rows={3}
          className="teia-textarea mt-1 w-full"
          placeholder={approving ? "Payback inferior a 3 meses e risco controlado." : "Capital necessário excede o limite deste trimestre."}
        />
      </label>
      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
        {humanReasonHint()}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-[#241a08] disabled:opacity-50"
          style={{ background: approving ? "var(--gold-soft)" : "#c45c54" }}
        >
          {pending ? "Salvando..." : approving ? "Confirmar aprovação" : "Confirmar rejeição"}
        </button>
        <a href={suggest} className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
          Sugerir com IA
        </a>
        <button type="button" className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }} onClick={() => setMode("idle")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
