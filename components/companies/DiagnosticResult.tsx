import Link from "next/link";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import { bottleneckSummary, diagnosisCoverage, diagnosisDelta, displayDiagnosisScore, financeIsBottleneck, scaleLabel } from "@/lib/diagnostic-ui";
import { formatDateBR } from "@/lib/format";
import type { DiagnosisDTO } from "@/services/diagnosisService";

export function DiagnosticResult({
  diagnosis,
  previous,
  companyId,
}: {
  diagnosis: DiagnosisDTO;
  previous?: DiagnosisDTO | null;
  companyId: string;
}) {
  const coverage = diagnosisCoverage(diagnosis.dimensions);
  const score = displayDiagnosisScore(diagnosis.overallScore, coverage.complete);
  const delta = diagnosisDelta(score, previous ? displayDiagnosisScore(previous.overallScore, diagnosisCoverage(previous.dimensions).complete) : null);
  const bottleneck = bottleneckSummary(diagnosis.bottlenecks);
  const financeGap = financeIsBottleneck(diagnosis.bottlenecks);
  const nextHref = financeGap ? `/empresas/${companyId}/financeiro` : `/empresas/${companyId}/oportunidades/gerar?diagnostico=${diagnosis.id}`;
  const nextCta = financeGap ? "Analisar financeiro" : "Revisar oportunidades";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border p-5" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          {formatDateBR(diagnosis.createdAt)}
        </p>
        {coverage.complete && score != null ? (
          <p className="mt-2 text-[32px] font-bold leading-none">{score}<span className="text-[16px] font-semibold" style={{ color: "var(--text-3)" }}> /100</span></p>
        ) : (
          <p className="mt-2 text-[18px] font-bold">{coverage.label}</p>
        )}
        <p className="mt-2 text-[14px] font-semibold">{coverage.complete ? diagnosis.maturity : "Nota definitiva só com as 10 dimensões."}</p>
        {delta ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
            Evolução: {delta.label}
          </p>
        ) : null}
        <div className="mt-4">
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            Principal gargalo
          </p>
          <p className="mt-1 text-[18px] font-bold">{bottleneck.title}</p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {bottleneck.note}
          </p>
        </div>
      </section>

      <section className="surface-card p-4">
        <h3 className="mb-3 text-[15px] font-bold">As 10 dimensões</h3>
        <div className="grid gap-2">
          {DIAGNOSTIC_DIMENSIONS.map((dimension) => {
            const current = diagnosis.dimensions.find((item) => item.key === dimension.key);
            const value = current && typeof current.score === "number" ? current.score : null;
            const isBottleneck = diagnosis.bottlenecks.some((item) => item.key === dimension.key);
            return (
              <div key={dimension.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                <div>
                  <p className="text-[13px] font-semibold">
                    {dimension.label}
                    {isBottleneck ? <span className="ml-2 text-[11px]" style={{ color: "var(--gold-soft)" }}>Gargalo</span> : null}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {scaleLabel(value)}
                  </p>
                </div>
                <p className="tabular-nums text-[13px] font-bold">{value == null ? "—" : `${value}/5`}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-[13px] font-bold">Leitura executiva</p>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
          Notas são dado interno. Gargalo é inferência. O diagnóstico sozinho não vira evidência.
        </p>
        <Link
          href={nextHref}
          className="mt-3 inline-flex rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          {nextCta}
        </Link>
      </section>
    </div>
  );
}
