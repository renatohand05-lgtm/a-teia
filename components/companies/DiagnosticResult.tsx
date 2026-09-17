import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DIAGNOSTIC_DIMENSIONS } from "@/lib/diagnostic";
import type { DiagnosisDTO } from "@/services/diagnosisService";

export function DiagnosticResult({ diagnosis }: { diagnosis: DiagnosisDTO }) {
  const tone =
    diagnosis.overallScore >= 75 ? "good" : diagnosis.overallScore >= 40 ? "warn" : "bad";

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="surface-card flex flex-col items-center justify-center p-6">
          <ScoreGauge score={diagnosis.overallScore} label="Score 360°" caption="/100" />
          <p className="mt-3 text-[22px] font-black">
            {diagnosis.overallScore} / 100
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {diagnosis.rawTotal} de 50 pontos
          </p>
        </div>
        <div className="surface-card space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            <RiskBadge label={diagnosis.maturity} tone={tone} />
            <RiskBadge label="DADO · notas" tone="neutral" />
            <RiskBadge label="INFERÊNCIA · gargalo" tone="warn" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
              Gargalo principal
            </p>
            <h3 className="mt-1 text-[20px] font-bold">{diagnosis.bottleneck}</h3>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
              Menor nota do diagnóstico. Empates aparecem juntos. Isso não é evidência validada.
            </p>
          </div>
          {diagnosis.strengths.length ? (
            <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
              Melhores dimensões: {diagnosis.strengths.map((item) => item.label).join(", ")}
            </p>
          ) : null}
          {diagnosis.attention.length ? (
            <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
              Precisam de atenção (nota ≤ 2): {diagnosis.attention.map((item) => item.label).join(", ")}
            </p>
          ) : null}
        </div>
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-4 text-[15px] font-bold">As 10 dimensões</h3>
        <div className="space-y-3">
          {DIAGNOSTIC_DIMENSIONS.map((dimension) => {
            const current = diagnosis.dimensions.find((item) => item.key === dimension.key);
            const score = current?.score ?? 0;
            const width = `${(score / 5) * 100}%`;
            const isBottleneck = diagnosis.bottlenecks.some((item) => item.key === dimension.key);
            return (
              <div key={dimension.key}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span>
                    {dimension.label}
                    {isBottleneck ? (
                      <span className="ml-2 text-[10px] font-bold" style={{ color: "var(--gold-soft)" }}>
                        GARGALO
                      </span>
                    ) : null}
                  </span>
                  <b>{score}/5</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.07)" }}>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width,
                      background: isBottleneck
                        ? "linear-gradient(90deg,#e0564c,var(--gold-deep))"
                        : "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
