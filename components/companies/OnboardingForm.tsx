"use client";

import { useActionState } from "react";
import type { CompanyDTO } from "@/services/companyService";
import type { OnboardingDTO } from "@/services/onboardingService";
import type { FormActionState } from "@/app/empresas/diagnostic-actions";

const initial: FormActionState = { ok: false, error: "" };

export function OnboardingForm({
  company,
  onboarding,
  action,
}: {
  company: CompanyDTO;
  onboarding: OnboardingDTO | null;
  action: (state: FormActionState | undefined, formData: FormData) => Promise<FormActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="surface-card grid gap-4 p-6 md:grid-cols-2">
      <p className="md:col-span-2 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Salve a qualquer momento e continue depois. Nada impede o acesso à empresa.
      </p>
      <Field name="name" label="Nome" defaultValue={company.name} required />
      <Field name="segment" label="Segmento" defaultValue={company.segment ?? ""} placeholder="Ex.: Oficina mecânica" />
      <Field name="city" label="Cidade" defaultValue={onboarding?.city ?? ""} placeholder="Ex.: Curitiba" />
      <Field name="state" label="UF" defaultValue={onboarding?.state ?? ""} placeholder="PR" maxLength={2} />
      <Field
        name="revenueMonthly"
        label="Faturamento mensal (R$)"
        defaultValue={company.revenueMonthly ?? ""}
        placeholder="Ex.: 600.000,00"
      />
      <Field
        name="averageTicket"
        label="Ticket médio (R$)"
        defaultValue={onboarding?.averageTicket ?? ""}
        placeholder="Ex.: 45,00"
      />
      <Field
        name="clientsPerMonth"
        label="Clientes / mês (aprox.)"
        type="number"
        defaultValue={onboarding?.clientsPerMonth ?? ""}
      />
      <Field name="teamSize" label="Número de funcionários" type="number" defaultValue={company.teamSize ?? ""} />
      <div className="md:col-span-2">
        <Field
          name="channels"
          label="Principais canais de venda"
          defaultValue={company.channels ?? ""}
          placeholder="Ex.: loja, WhatsApp, indicação"
        />
      </div>
      <Field
        name="estimatedRecurrence"
        label="Recorrência estimada"
        defaultValue={onboarding?.estimatedRecurrence ?? ""}
        placeholder="Ex.: 40% voltam em 90 dias"
      />
      <div className="md:col-span-2">
        <Area name="primaryObjective" label="Principal objetivo" defaultValue={company.objectives ?? ""} />
      </div>
      <div className="md:col-span-2">
        <Area
          name="perceivedBottleneck"
          label="Gargalo percebido pelo empresário"
          defaultValue={company.perceivedBottlenecks ?? ""}
        />
      </div>
      <div className="md:col-span-2">
        <Area name="notes" label="Observações" defaultValue={company.notes ?? ""} />
      </div>
      {state && !state.ok && state.error ? (
        <p className="md:col-span-2 text-[12px] text-[#f09a93]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="md:col-span-2 text-[12px] text-[#7bd99a]">Onboarding salvo. Você pode continuar depois.</p>
      ) : null}
      <div className="md:col-span-2 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl px-4 py-3 text-[13px] font-extrabold text-[#241a08] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          {pending ? "Salvando..." : "Salvar onboarding"}
        </button>
        <span className="self-center text-[11px]" style={{ color: "var(--text-3)" }}>
          Status: {onboarding?.status === "COMPLETE" ? "completo" : "em andamento"}
        </span>
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
  maxLength,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
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
        placeholder={placeholder}
        maxLength={maxLength}
        min={type === "number" ? 0 : undefined}
        step={step}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
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
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)", color: "var(--text-1)" }}
      />
    </label>
  );
}
