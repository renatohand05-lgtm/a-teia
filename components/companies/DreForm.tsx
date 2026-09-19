"use client";

import { useActionState } from "react";
import { saveDreAction, type FormActionState } from "@/app/empresas/financial-actions";
import { MoneyInput } from "@/components/ui/MoneyInput";
import type { DreInput } from "@/lib/financial-engine";
import type { YearMonth } from "@/lib/period";

const initial: FormActionState = { ok: false, error: "" };
const field = "teia-input";

const LINES: Array<[keyof DreInput, string]> = [
  ["grossRevenue", "Receita bruta"],
  ["deductions", "Deduções / impostos"],
  ["cogs", "CMV / CPV"],
  ["payroll", "Folha operacional"],
  ["rent", "Aluguel"],
  ["water", "Água"],
  ["energy", "Energia"],
  ["internet", "Internet"],
  ["marketing", "Marketing"],
  ["delivery", "Delivery / marketplace"],
  ["accounting", "Contabilidade"],
  ["maintenance", "Manutenção"],
  ["otherOpex", "Outras despesas operacionais"],
  ["salesCount", "Número de vendas / pedidos"],
];

export function DreForm({
  companyId,
  period,
  values,
  notes,
}: {
  companyId: string;
  period: YearMonth;
  values: DreInput;
  notes: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveDreAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="periodMonth" value={period.periodMonth} />
      <input type="hidden" name="periodYear" value={period.periodYear} />
      <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Campo vazio = <b style={{ color: "var(--text-1)" }}>sem dado informado</b>. Zero só entra se você registrar zero.
        Nada é inventado.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {LINES.map(([name, label]) => (
          <label key={name} className="block text-[12px] font-bold">
            {label}
            {name === "salesCount" ? (
              <input name={name} inputMode="numeric" defaultValue={values[name] ?? ""} placeholder="0" className={`${field} mt-2`} />
            ) : (
              <MoneyInput name={name} defaultValue={values[name]} placeholder="600.000,00" className={`${field} mt-2`} ariaLabel={label} />
            )}
          </label>
        ))}
      </div>
      <label className="block text-[12px] font-bold">
        Notas
        <textarea name="notes" rows={3} defaultValue={notes ?? ""} className="teia-textarea mt-2" />
      </label>
      {state && !state.ok && state.error ? <p className="text-[12px]" style={{ color: "var(--danger)" }}>{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px]" style={{ color: "var(--success)" }}>DRE salvo para a competência.</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Salvando..." : "Salvar DRE"}
      </button>
    </form>
  );
}
