"use client";

import { useActionState } from "react";
import type { CompanyDTO } from "@/services/companyService";
import type { CompanyActionState } from "@/app/empresas/actions";

const initial: CompanyActionState = { ok: false, error: "" };

export function CompanyForm({
  company,
  action,
  submitLabel,
}: {
  company?: CompanyDTO;
  action: (state: CompanyActionState | undefined, formData: FormData) => Promise<CompanyActionState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="surface-card grid gap-4 p-6 md:grid-cols-2">
      <Field name="name" label="Nome" defaultValue={company?.name} required />
      <Field name="segment" label="Segmento" defaultValue={company?.segment ?? ""} placeholder="Ex.: Alimentação" />
      <Field name="units" label="Unidades" type="number" defaultValue={company?.units ?? ""} />
      <Field
        name="revenueMonthly"
        label="Faturamento mensal (R$)"
        type="number"
        defaultValue={company?.revenueMonthly ?? ""}
      />
      <Field
        name="marginPercent"
        label="Margem (%)"
        type="number"
        step="0.1"
        defaultValue={company?.marginPercent ?? ""}
      />
      <Field name="teamSize" label="Equipe" type="number" defaultValue={company?.teamSize ?? ""} />
      <div className="md:col-span-2">
        <Field name="channels" label="Canais" defaultValue={company?.channels ?? ""} placeholder="Ex.: loja, iFood, WhatsApp" />
      </div>
      <div className="md:col-span-2">
        <Area name="objectives" label="Objetivos" defaultValue={company?.objectives ?? ""} />
      </div>
      <div className="md:col-span-2">
        <Area
          name="perceivedBottlenecks"
          label="Gargalos percebidos"
          defaultValue={company?.perceivedBottlenecks ?? ""}
        />
      </div>
      <div className="md:col-span-2">
        <Area name="notes" label="Observações" defaultValue={company?.notes ?? ""} />
      </div>
      {state && !state.ok && state.error ? (
        <p className="md:col-span-2 text-[12px] text-[#f09a93]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="md:col-span-2 text-[12px] text-[#7bd99a]">Alterações salvas. Os dados permanecem após o reload.</p>
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
  placeholder,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
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
        step={step}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: "var(--border)",
          color: "var(--text-1)",
        }}
      />
    </label>
  );
}

function Area({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: "var(--border)",
          color: "var(--text-1)",
        }}
      />
    </label>
  );
}
