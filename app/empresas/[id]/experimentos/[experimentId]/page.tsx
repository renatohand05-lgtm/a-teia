import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ExperimentClassBadge, ExperimentStage, ExperimentStatusBadge } from "@/components/companies/ExperimentStage";
import { MeasurementForm } from "@/components/companies/MeasurementForm";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL, formatDateBR } from "@/lib/format";
import { isDraftStatus } from "@/lib/experiment-engine";
import {
  compareTargetVsResult,
  evidenceStrength,
  financialImpactLabel,
  formatExperimentNumber,
} from "@/lib/experiment-ui";
import { displayMemoryStatus } from "@/lib/memory-ui";
import { getExperiment } from "@/services/experimentService";
import { getExperimentMemories } from "@/services/memoryService";
import { cancelExperimentAction, startExperimentAction } from "@/app/empresas/experiment-actions";

export const dynamic = "force-dynamic";

export default async function ExperimentoPage({ params }: { params: Promise<{ id: string; experimentId: string }> }) {
  const { id, experimentId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const experiment = await getExperiment(userId, id, experimentId);
  if (!experiment) redirect(`/empresas/${id}/experimentos`);
  const memories = await getExperimentMemories(userId, id, experimentId);
  const measurements = experiment.measurements.filter((item) => item.outcome === "MEASUREMENT");
  const finals = experiment.measurements.filter((item) => item.outcome === "FINAL");
  const comparison = compareTargetVsResult({
    target: experiment.target,
    result: experiment.finalValue,
    direction: experiment.direction,
    unit: experiment.kpiUnit,
  });
  const strength = evidenceStrength({
    kpi: experiment.kpi,
    target: experiment.target,
    result: experiment.finalValue,
    endedAt: experiment.endedAt,
    measurementCount: measurements.length,
    repetitionCount: memories.length,
  });
  return (
    <AppShell title="Experimento" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href={`/empresas/${id}/experimentos`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Carteira de experimentos
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <ExperimentStage
            status={experiment.status}
            hasMeasurements={measurements.length > 0}
            hasFinalResult={experiment.finalValue != null}
            hasEvidence={experiment.evidence.length > 0}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <ExperimentStatusBadge status={experiment.status} />
            <ExperimentClassBadge classification={experiment.classification} />
            <span className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>Hipótese não é evidência</span>
          </div>
          <h1 className="mt-4 text-2xl font-black">{experiment.title}</h1>
          <dl className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2" style={{ color: "var(--text-2)" }}>
            <Meta label="Empresa" value={company.name} />
            <Meta label="Oportunidade de origem" value={experiment.opportunityTitle ?? "Sem oportunidade vinculada"} />
            <Meta label="Responsável" value={experiment.createdByName ?? name ?? "Conta da empresa"} />
            <Meta label="Período" value={`${formatDateBR(experiment.startedAt)} → ${formatDateBR(experiment.plannedEndAt ?? experiment.endedAt)}`} />
          </dl>
        </section>

        <Block title="Hipótese" body={experiment.hypothesis} />
        <Block title="Como será testada" body={experiment.testDescription} />
        {experiment.successCriteria ? <Block title="Critério de sucesso" body={experiment.successCriteria} /> : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="KPI" value={experiment.kpi ?? "Não informado"} />
          <Mini label="Valor atual" value={formatExperimentNumber(experiment.baseline, experiment.kpiUnit)} />
          <Mini label="Meta" value={formatExperimentNumber(experiment.target, experiment.kpiUnit)} />
          <Mini label="Investimento previsto" value={formatBRL(experiment.plannedInvestment)} />
        </section>

        {isDraftStatus(experiment.status) || experiment.status === "READY" ? (
          <form action={startExperimentAction}>
            <input type="hidden" name="companyId" value={id} />
            <input type="hidden" name="experimentId" value={experiment.id} />
            <button className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
              Iniciar teste
            </button>
          </form>
        ) : null}

        {experiment.status === "RUNNING" ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/empresas/${id}/experimentos/${experiment.id}/resultado`}
              className="rounded-xl px-4 py-3 text-[12px] font-black"
              style={{ background: "var(--gold)", color: "#111" }}
            >
              Registrar resultado
            </Link>
            <Link href={`/empresas/${id}/experimentos/${experiment.id}/medicoes`} className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              Registrar medições
            </Link>
            <form action={cancelExperimentAction}>
              <input type="hidden" name="companyId" value={id} />
              <input type="hidden" name="experimentId" value={experiment.id} />
              <button className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>Cancelar</button>
            </form>
          </div>
        ) : null}

        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-[16px] font-black">Histórico de resultados</h2>
          {measurements.length === 0 && finals.length === 0 ? (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Este experimento ainda não possui resultado medido.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {[...measurements, ...finals].map((item) => (
                <div key={item.id} className="rounded-xl border p-3 text-[13px]" style={{ borderColor: "var(--border)" }}>
                  {formatDateBR(item.recordedAt)} · {item.outcome === "FINAL" ? "Resultado final" : "Medição"} · {item.measuredValue ?? "—"}
                  {item.notes ? ` · ${item.notes}` : ""}
                </div>
              ))}
            </div>
          )}
          {experiment.status === "RUNNING" ? <div className="mt-4"><MeasurementForm companyId={id} experimentId={experiment.id} /></div> : null}
        </section>

        {experiment.status === "COMPLETED" ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Meta × resultado</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Mini label="Meta" value={comparison.metaLabel} />
              <Mini label="Resultado medido" value={comparison.resultLabel} />
              <Mini label="Diferença" value={comparison.differenceLabel ?? "Não calculada"} />
              <Mini label="Situação" value={comparison.situation} />
            </div>
            <p className="mt-3 text-[12px]" style={{ color: "var(--text-3)" }}>
              {experiment.classificationReason} Esta leitura não chama o teste de sucesso universal.
            </p>
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
              {financialImpactLabel(experiment.realizedReturn)}
            </p>
          </section>
        ) : null}

        {experiment.evidence.length > 0 ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Evidência</h2>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Resultado disponível para avaliação. Resultado não é evidência validada automaticamente e não vira memória sozinho.
            </p>
            <p className="mt-2 text-[13px] font-bold">{strength.label}</p>
            {strength.factors.length ? (
              <ul className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                {strength.factors.map((factor) => (
                  <li key={factor}>· {factor}</li>
                ))}
              </ul>
            ) : null}
            {experiment.evidence.map((item) => (
              <div key={item.id} className="mt-4">
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  {company.name} · {formatDateBR(item.createdAt)} · {experiment.kpi ?? "KPI"}
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-[12px] leading-6" style={{ color: "var(--text-2)" }}>{item.body}</pre>
                {experiment.status === "COMPLETED" && !memories.some((memory) => memory.evidenceId === item.id) ? (
                  <Link
                    href={`/empresas/${id}/memoria/propor?evidenceId=${item.id}`}
                    className="mt-3 inline-flex rounded-xl px-4 py-3 text-[12px] font-black"
                    style={{ background: "var(--gold)", color: "#111" }}
                  >
                    Registrar aprendizado
                  </Link>
                ) : null}
              </div>
            ))}
          </section>
        ) : experiment.status !== "COMPLETED" ? (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Registre um resultado antes de avaliar a evidência.
          </p>
        ) : null}

        {experiment.status === "COMPLETED" ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Aprendizado</h2>
            {memories.length === 0 ? (
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                Os aprendizados validados da sua operação aparecerão aqui. Evidência não vira memória sozinha.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {memories.map((item) => (
                  <Link
                    key={item.id}
                    href={`/empresas/${id}/memoria/${item.id}`}
                    className="block rounded-xl border p-3 text-[13px]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {item.title} · {displayMemoryStatus(item.status)} · {item.validated ? "validado" : "ainda não validado"}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {experiment.opportunityId ? (
          <Link href={`/empresas/${id}/oportunidades/${experiment.opportunityId}`} className="inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Voltar à oportunidade de origem
          </Link>
        ) : null}
      </div>
    </AppShell>
  );
}

function Block({ title, body }: { title: string; body: string | null }) {
  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="text-[16px] font-black">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>{body || "Não informado."}</p>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd>{value}</dd>
    </div>
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
