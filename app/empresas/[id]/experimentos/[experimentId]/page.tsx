import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ExperimentClassBadge, ExperimentStage, ExperimentStatusBadge } from "@/components/companies/ExperimentStage";
import { MeasurementForm } from "@/components/companies/MeasurementForm";
import { ExperimentResultForm } from "@/components/companies/ExperimentResultForm";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL, formatPercent } from "@/lib/format";
import { calculateAbsoluteVariation, calculatePercentageVariation, isDraftStatus } from "@/lib/experiment-engine";
import { getExperiment } from "@/services/experimentService";
import { cancelExperimentAction, startExperimentAction } from "@/app/empresas/experiment-actions";

export const dynamic = "force-dynamic";

export default async function ExperimentoPage({ params }: { params: Promise<{ id: string; experimentId: string }> }) {
  const { id, experimentId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const experiment = await getExperiment(userId, id, experimentId);
  if (!experiment) redirect(`/empresas/${id}/experimentos`);

  const variation = calculateAbsoluteVariation(experiment.baseline, experiment.finalValue ?? experiment.latestMeasurement);
  const variationPct = calculatePercentageVariation(experiment.baseline, experiment.finalValue ?? experiment.latestMeasurement);
  const measurements = experiment.measurements.filter((item) => item.outcome === "MEASUREMENT");

  return (
    <AppShell title="Experimento" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href={`/empresas/${id}/experimentos`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Carteira de experimentos
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <ExperimentStage status={experiment.status} hasMeasurements={measurements.length > 0} hasEvidence={experiment.evidence.length > 0} />
          <div className="mt-4 flex flex-wrap gap-2">
            <ExperimentStatusBadge status={experiment.status} />
            <ExperimentClassBadge classification={experiment.classification} />
            <span className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>HIPÓTESE ≠ EVIDÊNCIA</span>
          </div>
          <h1 className="mt-4 text-2xl font-black">{experiment.title}</h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{experiment.hypothesis}</p>
          {experiment.opportunityTitle ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>Oportunidade: {experiment.opportunityTitle}</p>
          ) : null}
          {experiment.actionPlanTitle ? (
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>Plano: {experiment.actionPlanTitle}</p>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="KPI" value={experiment.kpi ?? "—"} />
          <Mini label="Baseline" value={experiment.baseline != null ? String(experiment.baseline) : "Não informado"} />
          <Mini label="Meta" value={experiment.target != null ? String(experiment.target) : "Não informada"} />
          <Mini label="Direção" value={experiment.direction === "LOWER_IS_BETTER" ? "Menor é melhor" : "Maior é melhor"} />
        </section>
        {experiment.baseline == null ? (
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Resultado comparativo limitado — baseline não informado.</p>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Investimento previsto" value={formatBRL(experiment.plannedInvestment)} />
          <Mini label="Investimento realizado" value={formatBRL(experiment.realizedInvestment)} />
          <Mini label="Retorno realizado" value={formatBRL(experiment.realizedReturn)} />
          <Mini label="ROI real" value={experiment.roi != null ? formatPercent(experiment.roi) : "Sem realizado"} />
        </section>

        {isDraftStatus(experiment.status) || experiment.status === "READY" ? (
          <form action={startExperimentAction}>
            <input type="hidden" name="companyId" value={id} />
            <input type="hidden" name="experimentId" value={experiment.id} />
            <button className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>Iniciar teste</button>
          </form>
        ) : null}

        {experiment.status === "RUNNING" ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/empresas/${id}/experimentos/${experiment.id}/medicoes`} className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>Registrar medições</Link>
            <Link href={`/empresas/${id}/experimentos/${experiment.id}/resultado`} className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>Encerrar e registrar resultado</Link>
            <form action={cancelExperimentAction}>
              <input type="hidden" name="companyId" value={id} />
              <input type="hidden" name="experimentId" value={experiment.id} />
              <button className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>Cancelar</button>
            </form>
          </div>
        ) : null}

        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-[16px] font-black">Medições</h2>
          {measurements.length === 0 ? (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>Nenhuma medição ainda. Histórico será append-only.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {measurements.map((item) => (
                <div key={item.id} className="rounded-xl border p-3 text-[13px]" style={{ borderColor: "var(--border)" }}>
                  {new Intl.DateTimeFormat("pt-BR").format(new Date(item.recordedAt))} · {item.measuredValue}
                  {item.notes ? ` · ${item.notes}` : ""}
                </div>
              ))}
            </div>
          )}
          {experiment.status === "RUNNING" ? <div className="mt-4"><MeasurementForm companyId={id} experimentId={experiment.id} /></div> : null}
        </section>

        {experiment.status === "COMPLETED" ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Resultado</h2>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{experiment.classificationReason}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Mini label="Valor inicial" value={experiment.baseline != null ? String(experiment.baseline) : "Não informado"} />
              <Mini label="Valor final" value={experiment.finalValue != null ? String(experiment.finalValue) : "—"} />
              <Mini label="Variação absoluta" value={variation != null ? String(variation) : "—"} />
              <Mini label="Variação %" value={variationPct != null ? formatPercent(variationPct) : "—"} />
            </div>
          </section>
        ) : null}

        {experiment.evidence.length > 0 ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Evidência rastreável</h2>
            {experiment.evidence.map((item) => (
              <pre key={item.id} className="mt-3 whitespace-pre-wrap text-[12px] leading-6" style={{ color: "var(--text-2)" }}>{item.body}</pre>
            ))}
          </section>
        ) : null}

        {experiment.status === "RUNNING" ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="mb-3 text-[16px] font-black">Encerrar com resultado medido</h2>
            <ExperimentResultForm companyId={id} experimentId={experiment.id} latestMeasurement={experiment.latestMeasurement} />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-1 text-[13px] font-bold">{value}</div>
    </div>
  );
}
