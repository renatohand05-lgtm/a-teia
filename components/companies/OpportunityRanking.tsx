import Link from "next/link";
import { EmptyState } from "@/components/ui/States";
import { RiskBadge } from "@/components/ui/RiskBadge";
import {
  displayEvidence,
  displayOpportunityStatus,
  displayOrigin,
  displayPaybackMonths,
  opportunityNextAction,
  scoreBadgeLabel,
} from "@/lib/opportunity-ui";
import { formatBRL } from "@/lib/format";
import type { OpportunityDTO } from "@/services/opportunityService";

export function OpportunityRanking({
  companyId,
  items,
  filtered = false,
}: {
  companyId: string;
  items: OpportunityDTO[];
  filtered?: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title={filtered ? "Nenhuma oportunidade neste filtro." : "Nenhuma oportunidade identificada."}
        body={
          filtered
            ? "Ajuste o filtro ou registre uma nova hipótese."
            : "O Diagnóstico 360° aponta gargalos. Daí nascem hipóteses — ainda não evidência."
        }
        action={
          <Link
            href={`/empresas/${companyId}/oportunidades/gerar`}
            className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            Gerar a partir do Diagnóstico 360°
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const next = opportunityNextAction(item, companyId);
        return (
          <Link
            key={item.id}
            href={`/empresas/${companyId}/oportunidades/${item.id}`}
            className="surface-card flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                #{String(index + 1).padStart(2, "0")} · {item.sourceDimensionLabel}
              </p>
              <h3 className="mt-1 text-[16px] font-bold">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {item.problemStatement || "Hipótese ainda sem problema descrito."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <RiskBadge
                  label={item.band}
                  tone={item.bandKey === "high" ? "bad" : item.bandKey === "medium" ? "warn" : "neutral"}
                />
                <RiskBadge label={displayOpportunityStatus(item.status)} tone="neutral" />
                <RiskBadge label={displayOrigin(item.origin)} tone="neutral" />
                <RiskBadge label={displayEvidence(item.evidenceLevel)} tone="warn" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3" style={{ color: "var(--text-2)" }}>
                <Fact label="Impacto" value={`${item.expectedImpact ?? "—"}/5`} />
                <Fact label="Esforço" value={`${item.effort ?? "—"}/5`} />
                <Fact label="Payback" value={displayPaybackMonths(item.paybackMonths)} />
                <Fact label="Investimento" value={formatBRL(item.estimatedInvestment)} />
                <Fact
                  label="Evidência"
                  value={
                    item.validatedExperimentCount > 0
                      ? `${item.validatedExperimentCount} experimento(s) validado(s)`
                      : "Ainda é hipótese"
                  }
                />
                <Fact label="Próximo passo" value={next.label} />
              </dl>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
                {scoreBadgeLabel(item.scorePartial)}
              </p>
              <p className="text-[32px] font-black" style={{ color: "var(--gold-soft)" }}>
                {item.priorityScore}
              </p>
              <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
                ranking · não é ordem de execução
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
