"use client";

import { useActionState } from "react";
import { createExecutionPlanAction, type FormActionState } from "@/app/empresas/execution-actions";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function ExecutionPlanForm({
  companyId,
  opportunityId,
  defaultTitle,
  defaultSummary,
}: {
  companyId: string;
  opportunityId: string;
  defaultTitle: string;
  defaultSummary: string;
}) {
  const [state, formAction, pending] = useActionState(createExecutionPlanAction, initial);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Este plano executa uma <b style={{ color: "var(--text-1)" }}>HIPÓTESE</b>. Resultado de tarefa não vira evidência validada sozinho.
      </p>
      <label className="block text-[12px] font-bold">
        Título do plano
        <input name="title" required defaultValue={defaultTitle} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        Resumo
        <textarea name="summary" rows={2} defaultValue={defaultSummary} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <label className="block text-[12px] font-bold">
        0–30 dias · Corrigir
        <textarea
          name="goal30"
          required
          rows={3}
          placeholder="Defina dados mínimos, responsável, KPI e o primeiro teste. Não invente retorno financeiro."
          className={`${field} mt-2`}
          style={{ borderColor: "var(--border)" }}
        />
      </label>
      <label className="block text-[12px] font-bold">
        31–60 dias · Tração
        <textarea
          name="goal60"
          required
          rows={3}
          placeholder="Ajuste a execução com os primeiros resultados reais e avance o KPI."
          className={`${field} mt-2`}
          style={{ borderColor: "var(--border)" }}
        />
      </label>
      <label className="block text-[12px] font-bold">
        61–90 dias · Escalar
        <textarea
          name="goal90"
          required
          rows={3}
          placeholder="Escale somente o que mostrou evidência. Sem evidência, mantenha como hipótese."
          className={`${field} mt-2`}
          style={{ borderColor: "var(--border)" }}
        />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50 sm:w-auto"
        style={{ background: "var(--gold)", color: "#111" }}
      >
        {pending ? "Criando plano..." : "Criar plano e iniciar execução"}
      </button>
    </form>
  );
}
