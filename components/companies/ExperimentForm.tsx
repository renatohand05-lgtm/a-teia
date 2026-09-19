"use client";

import { useActionState, useState } from "react";
import { createExperimentAction, type FormActionState } from "@/app/empresas/experiment-actions";
import { SUGGESTED_KPIS } from "@/lib/experiment-engine";

const initial: FormActionState = { ok: false, error: "" };
const field = "w-full rounded-xl border bg-transparent px-3 py-3 text-[13px] outline-none";

export function ExperimentForm({
  companyId,
  opportunityId,
  actionPlanId,
  strategyId,
  defaultTitle,
  defaultHypothesis,
}: {
  companyId: string;
  opportunityId?: string;
  actionPlanId?: string;
  strategyId?: string;
  defaultTitle?: string;
  defaultHypothesis?: string;
}) {
  const [state, formAction, pending] = useActionState(createExperimentAction, initial);
  const [kpi, setKpi] = useState<string>(SUGGESTED_KPIS[0]);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      {opportunityId ? <input type="hidden" name="opportunityId" value={opportunityId} /> : null}
      {actionPlanId ? <input type="hidden" name="actionPlanId" value={actionPlanId} /> : null}
      {strategyId ? <input type="hidden" name="strategyId" value={strategyId} /> : null}
      <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Criar o teste não prova a hipótese. Resultado só entra quando você registrar a medição — nunca automaticamente.
      </p>
      <label className="block text-[12px] font-bold">
        Título
        <input name="title" required defaultValue={defaultTitle ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Hipótese
        </legend>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>O que acreditamos que acontecerá?</p>
        <label className="block text-[12px] font-bold">
          Hipótese
          <textarea name="hypothesis" required rows={3} defaultValue={defaultHypothesis ?? ""} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Teste
        </legend>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>O que será feito para validar?</p>
        <label className="block text-[12px] font-bold">
          Como será testada
          <textarea name="testDescription" rows={3} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </fieldset>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-[12px] font-bold">
          KPI principal
          <select name="kpi" value={kpi} onChange={(event) => setKpi(event.target.value)} className={`${field} mt-2`} style={{ borderColor: "var(--border)", background: "#0b0b0e" }}>
            {SUGGESTED_KPIS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
            <option value="custom">KPI customizado</option>
          </select>
        </label>
        {kpi === "custom" ? (
          <label className="block text-[12px] font-bold">
            KPI customizado
            <input name="kpiCustom" required className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
          </label>
        ) : null}
        <label className="block text-[12px] font-bold">
          Unidade
          <input name="kpiUnit" placeholder="% , R$, clientes..." className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Direção
          <select name="direction" defaultValue="HIGHER_IS_BETTER" className={`${field} mt-2`} style={{ borderColor: "var(--border)", background: "#0b0b0e" }}>
            <option value="HIGHER_IS_BETTER">Maior é melhor</option>
            <option value="LOWER_IS_BETTER">Menor é melhor</option>
          </select>
        </label>
        <label className="block text-[12px] font-bold">
          Valor atual (quando houver dado real)
          <input name="baseline" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Meta do experimento
          <input name="target" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Data inicial
          <input name="startedAt" type="date" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Data final prevista
          <input name="plannedEndAt" type="date" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block text-[12px] font-bold">
          Investimento previsto
          <input name="investment" inputMode="decimal" className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
        </label>
      </div>
      <label className="block text-[12px] font-bold">
        Critério de sucesso
        <textarea
          name="successCriteria"
          rows={2}
          placeholder="Ex.: taxa de retorno ≥ 20% em 30 dias."
          className={`${field} mt-2`}
          style={{ borderColor: "var(--border)" }}
        />
      </label>
      <label className="block text-[12px] font-bold">
        Observações
        <textarea name="notes" rows={2} className={`${field} mt-2`} style={{ borderColor: "var(--border)" }} />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl px-5 py-3 text-[13px] font-black disabled:opacity-50" style={{ background: "var(--gold)", color: "#111" }}>
        {pending ? "Criando..." : "Criar experimento"}
      </button>
    </form>
  );
}
