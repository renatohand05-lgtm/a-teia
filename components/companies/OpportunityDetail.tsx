import Link from "next/link";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { CalculationHelp } from "@/components/ui/CalculationHelp";
import {
  changeOpportunityStatusAction,
  queueForPlanAction,
} from "@/app/empresas/opportunity-actions";
import { formatBRL, formatDateBR, formatPercent } from "@/lib/format";
import { calculateROI } from "@/lib/financial-engine";
import { decisionStatusLabel } from "@/lib/execution";
import {
  DISPLAY_ORIGIN_LABELS,
  OPPORTUNITY_HELP,
  SCORE_FACTORS,
  displayEvidence,
  displayOpportunityStatus,
  displayPaybackMonths,
  isHypothesis,
  opportunityNextAction,
  opportunityReviewDecisionLabel,
  scoreBadgeLabel,
  scorePartialNote,
  whyThisScore,
} from "@/lib/opportunity-ui";
import type { OpportunityDTO } from "@/services/opportunityService";
import type { ExperimentDTO } from "@/services/experimentService";
import type { RelatedMemoryDTO } from "@/services/memoryService";
import type { ScorePreview, RepetitionSummary } from "@/lib/memory-engine";
import type { DecisionDTO } from "@/services/decisionService";
import { assistantHref } from "@/lib/assistant-ui";
import { contextualAssistantPrompt, decisionExecutionNext } from "@/lib/journey-ui";
import { PendingButton } from "@/components/ui/PendingButton";
import { ExperimentClassBadge, ExperimentStatusBadge } from "@/components/companies/ExperimentStage";
import {
  MemoryConfidenceBadge,
  MemoryPolarityBadge,
} from "@/components/companies/MemoryBadges";

export function OpportunityDetail({
  companyId,
  opportunity,
  planId = null,
  experiments = [],
  decisions = [],
  relatedMemories = [],
  scorePreview,
  memoryConflicts = 0,
  repetition,
}: {
  companyId: string;
  opportunity: OpportunityDTO;
  planId?: string | null;
  experiments?: ExperimentDTO[];
  decisions?: DecisionDTO[];
  relatedMemories?: RelatedMemoryDTO[];
  scorePreview?: ScorePreview;
  memoryConflicts?: number;
  repetition?: RepetitionSummary;
}) {
  const next = opportunityNextAction({ ...opportunity, planId }, companyId);
  const roi = calculateROI(opportunity.estimatedInvestment, opportunity.expectedMonthlyReturn);
  const partialNote = scorePartialNote(opportunity.scorePartial);
  const latestDecision = decisions[0];
  const executionNext = decisionExecutionNext({
    status: latestDecision?.status,
    companyId,
    opportunityId: opportunity.id,
    planId,
  });

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="surface-card flex flex-col items-center justify-center p-6">
          <ScoreGauge score={opportunity.priorityScore} label={scoreBadgeLabel(opportunity.scorePartial)} caption="/100" />
          <p className="mt-3 text-[22px] font-black">{opportunity.priorityScore} / 100</p>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {opportunity.band}
          </p>
          {partialNote ? (
            <p className="mt-2 text-center text-[12px]" style={{ color: "var(--text-2)" }}>
              Score parcial. {partialNote}
            </p>
          ) : null}
        </div>
        <div className="surface-card space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            <RiskBadge label={displayOpportunityStatus(opportunity.status)} />
            <RiskBadge label={DISPLAY_ORIGIN_LABELS[opportunity.origin] ?? "—"} />
            <RiskBadge label={displayEvidence(opportunity.evidenceLevel)} tone="warn" />
            {isHypothesis(opportunity.evidenceLevel) ? <RiskBadge label="Ainda é hipótese" tone="warn" /> : null}
          </div>
          <h2 className="text-[22px] font-bold">{opportunity.title}</h2>
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            {opportunity.sourceDimensionLabel} · {formatDateBR(opportunity.createdAt)}
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
            Score descreve o ranking. Prioridade operacional: {next.label}.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Block title="Problema observado" body={opportunity.problemStatement} />
        <Block title="Hipótese de oportunidade" body={opportunity.hypothesis} />
      </section>

      <section className="surface-card space-y-3 p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Score
        </p>
        <h3 className="text-[16px] font-bold">{whyThisScore(opportunity.priorityScore)}</h3>
        <ul className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3" style={{ color: "var(--text-2)" }}>
          {SCORE_FACTORS.map((factor) => (
            <li key={factor.key} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)" }}>
              <span className="block text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                {factor.label}
              </span>
              peso {(factor.weight * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
            </li>
          ))}
        </ul>
        <ul className="space-y-1 text-[13px]" style={{ color: "var(--text-2)" }}>
          {opportunity.reasons.map((reason) => (
            <li key={reason}>· {reason}</li>
          ))}
        </ul>
        <CalculationHelp label="Score" text={OPPORTUNITY_HELP.score} />
        <CalculationHelp label="Prioridade" text={OPPORTUNITY_HELP.priority} />
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Impacto estimado
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Impacto" value={`${opportunity.expectedImpact ?? "—"}/5`} />
          <Mini label="Urgência" value={`${opportunity.urgency ?? "—"}/5`} />
          <Mini label="Confiança" value={`${opportunity.confidence ?? "—"}/5`} />
          <Mini label="Esforço" value={`${opportunity.effort ?? "—"}/5`} />
          <Mini label="Investimento estimado" value={formatBRL(opportunity.estimatedInvestment)} />
          <Mini label="Retorno mensal estimado" value={formatBRL(opportunity.expectedMonthlyReturn)} />
          <Mini label="Payback" value={displayPaybackMonths(opportunity.paybackMonths)} />
          <Mini label="ROI simples 12 meses" value={roi != null ? formatPercent(roi) : "Não calculado"} />
        </div>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Investimento, retorno, payback e ROI desta ficha são estimativas. Resultado realizado só nasce de evidência medida.
        </p>
        <CalculationHelp label="Payback" text={OPPORTUNITY_HELP.payback} />
      </section>

      {opportunity.description ? <Block title="Observações" body={opportunity.description} /> : null}

      <section className="surface-card space-y-3 p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Evidência
        </p>
        <p className="text-[14px] font-bold">{displayEvidence(opportunity.evidenceLevel)}</p>
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          {isHypothesis(opportunity.evidenceLevel)
            ? "Diagnóstico, ranking e IA não transformam esta ficha em evidência."
            : "O nível sobe só com experimento medido — executar tarefas não valida a hipótese."}
        </p>
        <CalculationHelp label="Evidência" text={OPPORTUNITY_HELP.evidence} />
      </section>

      <section id="decisao" className="surface-card space-y-3 p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Decisão
        </p>
        {latestDecision ? (
          <>
            <p className="text-[14px] font-bold">{latestDecision.title}</p>
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
              {decisionStatusLabel(latestDecision.status)}
              {latestDecision.approvedAt ? ` · aprovada em ${formatDateBR(latestDecision.approvedAt)}` : ""}
              {latestDecision.rejectedAt ? ` · rejeitada em ${formatDateBR(latestDecision.rejectedAt)}` : ""}
              {latestDecision.deferredAt ? ` · adiada em ${formatDateBR(latestDecision.deferredAt)}` : ""}
            </p>
            {latestDecision.rationale ? (
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                {latestDecision.rationale}
              </p>
            ) : null}
            {latestDecision.humanReason ? (
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                Justificativa humana: {latestDecision.humanReason}
              </p>
            ) : null}
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
              {executionNext.show === false && executionNext.note
                ? executionNext.note
                : "Rejeição não apaga a oportunidade. A IA não aprova decisão."}
            </p>
            {executionNext.show ? (
              <Link href={executionNext.href} className="inline-flex rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
                {executionNext.label}
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Nenhuma decisão registrada. Revisar para decisão é uma ação humana explícita — a IA não aprova.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/alocacao" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Ver alocação
          </Link>
          <Link href={assistantHref(companyId, contextualAssistantPrompt("oportunidade", opportunity.title))} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Analisar com IA
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <PrimaryAction companyId={companyId} opportunity={opportunity} planId={planId} />
        <details className="text-[13px]">
          <summary className="cursor-pointer font-semibold" style={{ color: "var(--text-2)" }}>
            Mais ações
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Ghost href={`/empresas/${companyId}/oportunidades/${opportunity.id}/editar`}>Editar</Ghost>
            <StatusButton companyId={companyId} id={opportunity.id} status="ACTIVE" label="Ativar" />
            <StatusButton companyId={companyId} id={opportunity.id} status="IN_PROGRESS" label="Marcar em execução" />
            <StatusButton companyId={companyId} id={opportunity.id} status="ARCHIVED" label="Arquivar" />
            <form action={queueForPlanAction}>
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="opportunityId" value={opportunity.id} />
              <PendingButton
                className="rounded-xl border px-4 py-2.5 text-[13px] font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                {opportunityReviewDecisionLabel(opportunity.queuedForPlan)}
              </PendingButton>
            </form>
            {next.kind !== "plan" && !planId && executionNext.show !== true ? (
              <Ghost href={`/empresas/${companyId}/execucao/novo?opportunityId=${opportunity.id}`}>
                Criar plano 30/60/90
              </Ghost>
            ) : null}
            {next.kind !== "experiment" ? (
              <Ghost href={`/empresas/${companyId}/experimentos/novo?opportunityId=${opportunity.id}`}>
                Criar experimento
              </Ghost>
            ) : null}
          </div>
        </details>
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Aprendizados relacionados
        </h3>
        {relatedMemories.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Nenhuma memória validada relacionada. Isso não vira evidência desta hipótese.
          </p>
        ) : (
          <>
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
              {relatedMemories.length} memória(s) relacionada(s)
              {repetition
                ? ` · ${repetition.label} (${repetition.positive} positivas, ${repetition.partial} parciais, ${repetition.inconclusive} inconclusivas, ${repetition.refuted} refutadas)`
                : ""}
              .
              {memoryConflicts > 0 ? " Evidências divergentes." : ""}
            </p>
            {relatedMemories.map((item) => (
              <Link
                key={item.id}
                href={item.companyId ? `/empresas/${item.companyId}/memoria/${item.id}` : `/empresas/${companyId}/memoria`}
                className="block rounded-2xl border p-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold">{item.title}</div>
                  <div className="flex flex-wrap gap-2">
                    <MemoryPolarityBadge polarity={item.polarity} />
                    <MemoryConfidenceBadge confidence={item.confidence} />
                  </div>
                </div>
                <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                  {item.companyName} · {item.segment ?? "segmento não informado"} ·{" "}
                  {item.matchKind === "EXACT" ? "memória exata" : "aprendizado potencialmente transferível"}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                  {item.matchKind === "EXACT"
                    ? "Há aprendizado anterior relacionado."
                    : "Possível estratégia transferível."}{" "}
                  {item.transferability.warning}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                  {item.explanation}
                </p>
              </Link>
            ))}
          </>
        )}
        {scorePreview ? (
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
              Preview de memória — ranking não alterado
            </p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Score persistido {scorePreview.scoreBase}
              {scorePreview.memoryAdjustment
                ? ` · ajuste de memória ${scorePreview.memoryAdjustment > 0 ? "+" : ""}${scorePreview.memoryAdjustment}`
                : ""}
              . Preview {scorePreview.scoreFinal} — não substitui o score oficial.
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>{scorePreview.explanation}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Experimentos vinculados
        </h3>
        {experiments.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Nenhum teste ainda. Uma oportunidade pode ter vários experimentos — uma tentativa não vira verdade universal.
          </p>
        ) : (
          experiments.map((item) => (
            <Link
              key={item.id}
              href={`/empresas/${companyId}/experimentos/${item.id}`}
              className="block rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold">{item.title}</div>
                <div className="flex flex-wrap gap-2">
                  <ExperimentStatusBadge status={item.status} />
                  <ExperimentClassBadge classification={item.classification} />
                </div>
              </div>
              <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                KPI {item.kpi ?? "—"} · resultado {item.finalValue != null ? String(item.finalValue) : "ainda não medido"}
                {item.evidence.length ? " · resultado disponível para avaliação" : " · sem evidência ainda"}
              </p>
            </Link>
          ))
        )}
      </section>
      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
        Executar o plano não transforma a hipótese em evidência validada. Evidência só nasce de resultado real medido.
      </p>
    </div>
  );
}

function PrimaryAction({
  companyId,
  opportunity,
  planId,
}: {
  companyId: string;
  opportunity: OpportunityDTO;
  planId?: string | null;
}) {
  const next = opportunityNextAction({ ...opportunity, planId }, companyId);
  if (next.kind === "activate") {
    return <StatusButton companyId={companyId} id={opportunity.id} status="ACTIVE" label="Ativar" primary />;
  }
  if (next.href) {
    return (
      <Link
        href={next.href}
        className="inline-flex rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
        style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
      >
        {next.label}
      </Link>
    );
  }
  return null;
}

function StatusButton({
  companyId,
  id,
  status,
  label,
  primary = false,
}: {
  companyId: string;
  id: string;
  status: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={changeOpportunityStatusAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="opportunityId" value={id} />
      <input type="hidden" name="status" value={status} />
      <PendingButton
        className="rounded-xl px-4 py-2.5 text-[13px] font-bold"
        style={
          primary
            ? { background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))", color: "#241a08", fontWeight: 800 }
            : { border: "1px solid var(--border)", color: "var(--text-2)" }
        }
        confirm={status === "ARCHIVED" ? "Arquivar esta oportunidade? O histórico permanece." : undefined}
      >
        {label}
      </PendingButton>
    </form>
  );
}

function Ghost({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl border px-4 py-2.5 text-[13px] font-bold"
      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
    >
      {children}
    </Link>
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
