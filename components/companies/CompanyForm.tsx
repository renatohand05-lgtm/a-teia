"use client";

import type { CompanyActionState } from "@/app/empresas/actions";
import { FormArea, FormField, FormMessage } from "@/components/ui/FormField";
import type { CompanyDTO } from "@/services/companyService";
import { useActionState } from "react";

const initial: CompanyActionState = { ok: false, error: "" };

export function CompanyForm({
  company,
  action,
  submitLabel,
  compact = false,
}: {
  company?: CompanyDTO;
  action: (state: CompanyActionState | undefined, formData: FormData) => Promise<CompanyActionState>;
  submitLabel: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const creating = !company;

  return (
    <form action={formAction} className="surface-card grid gap-4 p-5 md:grid-cols-2">
      <p className="md:col-span-2 text-[12px]" style={{ color: "var(--text-3)" }}>
        {creating ? "Obrigatório agora" : "Cadastro da empresa"}
      </p>
      <FormField
        name="name"
        label="Nome da empresa"
        defaultValue={company?.name}
        required
        autoFocus={creating}
      />
      <FormField
        name="segment"
        label="Segmento"
        defaultValue={company?.segment ?? ""}
        placeholder="Ex.: Alimentação"
        helper="Pode completar depois."
      />

      {creating && compact ? (
        <p className="md:col-span-2 text-[12px]" style={{ color: "var(--text-2)" }}>
          Faturamento, equipe e objetivos entram no onboarding ou na edição.
        </p>
      ) : (
        <>
          <p className="md:col-span-2 mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
            Pode ser completado depois
          </p>
          <FormField name="units" label="Unidades" defaultValue={company?.units ?? ""} inputMode="numeric" />
          <FormField
            name="revenueMonthly"
            label="Faturamento mensal"
            defaultValue={company?.revenueMonthly ?? ""}
            inputMode="decimal"
            helper="Ex.: R$ 600.000,00"
          />
          <FormField
            name="marginPercent"
            label="Margem"
            defaultValue={company?.marginPercent ?? ""}
            inputMode="decimal"
            helper="Informe 30 para 30%."
          />
          <FormField name="teamSize" label="Equipe" defaultValue={company?.teamSize ?? ""} inputMode="numeric" />
          <div className="md:col-span-2">
            <FormField name="channels" label="Canais" defaultValue={company?.channels ?? ""} />
          </div>
          <div className="md:col-span-2">
            <FormArea name="objectives" label="Objetivos" defaultValue={company?.objectives ?? ""} />
          </div>
          <div className="md:col-span-2">
            <FormArea name="perceivedBottlenecks" label="Gargalos percebidos" defaultValue={company?.perceivedBottlenecks ?? ""} />
          </div>
          <div className="md:col-span-2">
            <FormArea name="notes" label="Observações" defaultValue={company?.notes ?? ""} />
          </div>
        </>
      )}

      <div className="md:col-span-2">
        <FormMessage
          error={state && !state.ok ? friendlyCompanyError(state.error) : undefined}
          success={state?.ok ? "Empresa atualizada." : undefined}
        />
      </div>
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

function friendlyCompanyError(message: string) {
  if (!message || /500|internal/i.test(message)) {
    return "Não foi possível salvar. Revise os campos e tente novamente.";
  }
  return message;
}
