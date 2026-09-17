"use client";

import { useActionState } from "react";
import type { FormActionState } from "@/app/empresas/opportunity-actions";
import type { SuggestionGroup } from "@/services/opportunityService";

const initial: FormActionState = { ok: false, error: "" };

export function GenerateOpportunitiesForm({
  diagnosisId,
  groups,
  action,
}: {
  diagnosisId: string;
  groups: SuggestionGroup[];
  action: (state: FormActionState | undefined, formData: FormData) => Promise<FormActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  if (!groups.length) {
    return (
      <div className="surface-card p-6">
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          Nenhuma dimensão com nota baixa (≤ 3) neste diagnóstico. Crie uma oportunidade manual se quiser registrar uma hipótese.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="diagnosisId" value={diagnosisId} />
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Cada item abaixo é uma <b style={{ color: "var(--text-1)" }}>HIPÓTESE</b> de ação a partir de uma{" "}
        <b style={{ color: "var(--text-1)" }}>INFERÊNCIA</b> (gargalo). Não é evidência validada. Selecione o que faz sentido agora.
      </p>
      {groups.map((group) => (
        <section key={group.dimension} className="surface-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-[15px] font-bold">
              {group.label} · nota {group.score}/5
            </h3>
            {group.bottleneck ? (
              <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Gargalo
              </span>
            ) : null}
          </div>
          <div className="space-y-2">
            {group.templates.map((template) => {
              const already = group.alreadyCreated.includes(template.key);
              return (
                <label
                  key={template.key}
                  className="flex items-start gap-3 rounded-xl border p-3"
                  style={{ borderColor: "var(--border)", opacity: already ? 0.55 : 1 }}
                >
                  <input
                    type="checkbox"
                    name="templateKey"
                    value={template.key}
                    defaultChecked={group.bottleneck && !already}
                    disabled={already}
                    className="mt-1"
                  />
                  <span>
                    <b className="block text-[13px]">{template.title}</b>
                    <span className="mt-1 block text-[12px]" style={{ color: "var(--text-2)" }}>
                      {template.hypothesis}
                    </span>
                    {already ? (
                      <span className="mt-1 block text-[11px]" style={{ color: "var(--text-3)" }}>
                        Já gerada neste diagnóstico
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
      {state && !state.ok && state.error ? <p className="text-[12px] text-[#f09a93]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl px-5 py-3 text-[13px] font-extrabold text-[#241a08] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
      >
        {pending ? "Salvando hipóteses..." : "Salvar oportunidades selecionadas"}
      </button>
    </form>
  );
}
