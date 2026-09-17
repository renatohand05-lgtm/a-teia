"use client";

import { useActionState } from "react";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import type { FormActionState } from "@/app/empresas/opportunity-actions";
import type { OpportunityDTO } from "@/services/opportunityService";

const initial: FormActionState = { ok: false, error: "" };

export function OpportunityForm({
  action,
  opportunity,
  diagnosisId,
  submitLabel,
}: {
  action: (state: FormActionState | undefined, formData: FormData) => Promise<FormActionState>;
  opportunity?: OpportunityDTO | null;
  diagnosisId?: string | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="surface-card grid gap-4 p-6 md:grid-cols-2">
      {diagnosisId ? <input type="hidden" name="diagnosisId" value={diagnosisId} /> : null}
      <p className="md:col-span-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Oportunidade é uma <b style={{ color: "var(--text-1)" }}>HIPÓTESE</b> de ação — não uma evidência validada.
        O score será recalculado ao salvar.
      </p>
      <div className="md:col-span-2">
        <Field name="title" label="Título" defaultValue={opportunity?.title ?? ""} required />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "var(--text-3)" }}>
          Dimensão relacionada
        </span>
        <select
          name="sourceDimension"
          required
          defaultValue={opportunity?.sourceDimension ?? ""}
          className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
        >
          <option value="">Selecione</option>
          {DIAGNOSTIC_DIMENSIONS.map((dimension) => (
            <option key={dimension.key} value={dimension.key}>
              {dimension.label}
            </option>
          ))}
        </select>
      </label>
      <Scale name="expectedImpact" label="Impacto esperado" defaultValue={opportunity?.expectedImpact ?? 3} />
      <Scale name="urgency" label="Urgência" defaultValue={opportunity?.urgency ?? 3} />
      <Scale name="effort" label="Esforço" defaultValue={opportunity?.effort ?? 3} />
      <Scale name="confidence" label="Confiança" defaultValue={opportunity?.confidence ?? 3} />
      <div className="md:col-span-2">
        <Area name="problemStatement" label="Problema" defaultValue={opportunity?.problemStatement ?? ""} required />
      </div>
      <div className="md:col-span-2">
        <Area name="hypothesis" label="Hipótese" defaultValue={opportunity?.hypothesis ?? ""} required />
      </div>
      <Field
        name="estimatedInvestment"
        label="Investimento estimado (R$)"
        type="number"
        step="any"
        defaultValue={opportunity?.estimatedInvestment ?? ""}
      />
      <Field
        name="expectedMonthlyReturn"
        label="Retorno mensal esperado (R$)"
        type="number"
        step="any"
        defaultValue={opportunity?.expectedMonthlyReturn ?? ""}
      />
      <Field
        name="estimatedHours"
        label="Horas estimadas"
        type="number"
        step="any"
        defaultValue={opportunity?.estimatedHours ?? ""}
      />
      <div className="md:col-span-2">
        <Area name="description" label="Observações" defaultValue={opportunity?.description ?? ""} />
      </div>
      {state && !state.ok && state.error ? (
        <p className="md:col-span-2 text-[12px] text-[#f09a93]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="md:col-span-2 text-[12px] text-[#7bd99a]">Oportunidade salva. Score recalculado.</p>
      ) : null}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl px-4 py-3 text-[13px] font-extrabold text-[#241a08] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          {pending ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        min={type === "number" ? 0 : undefined}
        step={step}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
      />
    </label>
  );
}

function Area({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
      />
    </label>
  );
}

function Scale({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "var(--text-3)" }}>
        {label} (1–5)
      </span>
      <select
        name={name}
        defaultValue={String(defaultValue)}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}
