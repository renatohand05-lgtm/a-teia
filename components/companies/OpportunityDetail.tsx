import Link from "next/link";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import {
  changeOpportunityStatusAction,
  queueForPlanAction,
} from "@/app/empresas/opportunity-actions";
import {
  EVIDENCE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  ORIGIN_LABELS,
} from "@/lib/opportunity-score";
import { formatBRL, formatPercent } from "@/lib/format";
import { calculatePayback, calculateROI } from "@/lib/financial-engine";
import type { OpportunityDTO } from "@/services/opportunityService";

export function OpportunityDetail({
  companyId,
  opportunity,
}: {
  companyId: string;
  opportunity: OpportunityDTO;
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="surface-card flex flex-col items-center justify-center p-6">
          <ScoreGauge score={opportunity.priorityScore} label="Prioridade" caption="/100" />
          <p className="mt-3 text-[22px] font-black">{opportunity.priorityScore} / 100</p>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {opportunity.band}
            {opportunity.scorePartial ? " · cálculo parcial" : ""}
          </p>
        </div>
        <div className="surface-card space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            <RiskBadge label={OPPORTUNITY_STATUS_LABELS[opportunity.status] ?? opportunity.status} />
            <RiskBadge label={ORIGIN_LABELS[opportunity.origin] ?? opportunity.origin} />
            <RiskBadge label={`EVIDÊNCIA · ${EVIDENCE_LABELS[opportunity.evidenceLevel]}`} tone="warn" />
            <RiskBadge label="HIPÓTESE · ação" tone="warn" />
          </div>
          <h2 className="text-[22px] font-bold">{opportunity.title}</h2>
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Dimensão: {opportunity.sourceDimensionLabel}
          </p>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
              Por que este score
            </p>
            <ul className="mt-2 space-y-1 text-[13px]" style={{ color: "var(--text-2)" }}>
              {opportunity.reasons.map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Block title="Problema" body={opportunity.problemStatement} />
        <Block title="Hipótese" body={opportunity.hypothesis} />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Impacto" value={`${opportunity.expectedImpact ?? "—"}/5`} />
        <Mini label="Urgência" value={`${opportunity.urgency ?? "—"}/5`} />
        <Mini label="Confiança" value={`${opportunity.confidence ?? "—"}/5`} />
        <Mini label="Esforço" value={`${opportunity.effort ?? "—"}/5`} />
        <Mini label="Investimento" value={formatBRL(opportunity.estimatedInvestment)} />
        <Mini label="Horas" value={opportunity.estimatedHours != null ? String(opportunity.estimatedHours) : "—"} />
        <Mini label="Retorno mensal" value={formatBRL(opportunity.expectedMonthlyReturn)} />
        <Mini
          label="Payback"
          value={
            opportunity.paybackMonths != null ? `${opportunity.paybackMonths} mês(es)` : "Sem dado financeiro"
          }
        />
        <Mini
          label="ROI simples 12 meses"
          value={
            calculateROI(opportunity.estimatedInvestment, opportunity.expectedMonthlyReturn) != null
              ? formatPercent(calculateROI(opportunity.estimatedInvestment, opportunity.expectedMonthlyReturn))
              : "Sem investimento informado"
          }
        />
      </section>
      {opportunity.estimatedInvestment != null || opportunity.expectedMonthlyReturn != null ? (
        <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <RiskBadge label="HIPÓTESE FINANCEIRA" tone="warn" />
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            Investimento {formatBRL(opportunity.estimatedInvestment)} e retorno mensal esperado{" "}
            {formatBRL(opportunity.expectedMonthlyReturn)} não são realizados. Payback{" "}
            {calculatePayback(opportunity.estimatedInvestment, opportunity.expectedMonthlyReturn) ?? "n/d"} mês(es)
            até existir evidência medida.
          </p>
        </section>
      ) : null}

      {opportunity.description ? <Block title="Observações" body={opportunity.description} /> : null}

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/empresas/${companyId}/oportunidades/${opportunity.id}/editar`}
          className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          Editar
        </Link>
        <StatusButton companyId={companyId} id={opportunity.id} status="ACTIVE" label="Ativar" />
        <StatusButton companyId={companyId} id={opportunity.id} status="IN_PROGRESS" label="Marcar em execução" />
        <StatusButton companyId={companyId} id={opportunity.id} status="ARCHIVED" label="Arquivar" />
        <form action={queueForPlanAction}>
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="opportunityId" value={opportunity.id} />
          <button
            type="submit"
            className="rounded-xl border px-4 py-2.5 text-[13px] font-bold"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            {opportunity.queuedForPlan ? "Na fila do plano 30/60/90" : "Preparar para plano de ação"}
          </button>
        </form>
        <Link
          href={`/empresas/${companyId}/execucao/novo?opportunityId=${opportunity.id}`}
          className="rounded-xl border px-4 py-2.5 text-[13px] font-bold"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          Criar plano 30/60/90
        </Link>
      </section>
      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
        Executar o plano não transforma a hipótese em evidência validada. Evidência só nasce de resultado real medido.
      </p>
    </div>
  );
}

function StatusButton({
  companyId,
  id,
  status,
  label,
}: {
  companyId: string;
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={changeOpportunityStatusAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="opportunityId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-xl border px-4 py-2.5 text-[13px] font-bold"
        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
      >
        {label}
      </button>
    </form>
  );
}

function Block({ title, body }: { title: string; body: string | null }) {
  return (
    <div className="surface-card p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
        {title}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        {body || "—"}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
      <p className="text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="mt-1 text-[14px] font-bold">{value}</p>
    </div>
  );
}
