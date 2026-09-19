import Link from "next/link";
import { EmptyState } from "@/components/ui/States";
import { RiskBadge } from "@/components/ui/RiskBadge";
import {
  EVIDENCE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  ORIGIN_LABELS,
} from "@/lib/opportunity-score";
import { formatBRL } from "@/lib/format";
import type { OpportunityDTO } from "@/services/opportunityService";

export function OpportunityRanking({
  companyId,
  items,
}: {
  companyId: string;
  items: OpportunityDTO[];
}) {
  if (!items.length) {
    return (
      <EmptyState
        title="Nenhuma oportunidade neste filtro."
        body="Gere hipóteses a partir do Diagnóstico 360° ou registre uma oportunidade manual."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/empresas/${companyId}/oportunidades/gerar`} className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
              Gerar do diagnóstico
            </Link>
            <Link href={`/empresas/${companyId}/oportunidades/nova`} className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              Nova oportunidade
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Link
          key={item.id}
          href={`/empresas/${companyId}/oportunidades/${item.id}`}
          className="surface-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
              #{String(index + 1).padStart(2, "0")} · {item.sourceDimensionLabel}
            </p>
            <h3 className="mt-1 text-[16px] font-bold">{item.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <RiskBadge label={item.band} tone={item.bandKey === "high" ? "bad" : item.bandKey === "medium" ? "warn" : "neutral"} />
              <RiskBadge label={OPPORTUNITY_STATUS_LABELS[item.status] ?? item.status} tone="neutral" />
              <RiskBadge label={ORIGIN_LABELS[item.origin] ?? item.origin} tone="neutral" />
              <RiskBadge label={EVIDENCE_LABELS[item.evidenceLevel] ?? item.evidenceLevel} tone="warn" />
              <RiskBadge
                label={
                  item.validatedExperimentCount > 0
                    ? `Evidência · ${item.validatedExperimentCount} experimento(s) validado(s)`
                    : "Evidência · hipótese"
                }
                tone={item.validatedExperimentCount > 0 ? "good" : "warn"}
              />
            </div>
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
              Impacto {item.expectedImpact ?? "—"}/5 · Esforço {item.effort ?? "—"}/5 · Investimento{" "}
              {formatBRL(item.estimatedInvestment)} · Retorno {formatBRL(item.expectedMonthlyReturn)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
              Prioridade
            </p>
            <p className="text-[32px] font-black" style={{ color: "var(--gold-soft)" }}>
              {item.priorityScore}
            </p>
            <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
              score separado da evidência
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
