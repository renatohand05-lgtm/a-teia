import Link from "next/link";
import { formatBRL } from "@/lib/format";
import type { OpportunityDTO, OpportunitySummary } from "@/services/opportunityService";

export function OpportunityOverview({
  companyId,
  summary,
  top,
}: {
  companyId: string;
  summary: OpportunitySummary;
  top: OpportunityDTO[];
}) {
  return (
    <div className="space-y-5">
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
              Oportunidades
            </p>
            <h3 className="mt-1 text-[18px] font-bold">Motor de decisão</h3>
          </div>
          <Link
            href={`/empresas/${companyId}/oportunidades`}
            className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            Ver oportunidades
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Mini label="Ativas / em execução" value={String(summary.activeCount)} />
          <Mini label="Maior prioridade" value={summary.top ? `${summary.top.priorityScore}/100` : "—"} />
          <Mini label="Dimensão mais atacada" value={summary.topDimension ?? "—"} />
          <Mini label="Investimento estimado" value={formatBRL(summary.estimatedInvestmentTotal || null)} />
          <Mini label="Retorno mensal esperado" value={formatBRL(summary.expectedMonthlyReturnTotal || null)} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Central de decisão · Top 3
        </h3>
        {top.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {top.map((item, index) => (
              <Link
                key={item.id}
                href={`/empresas/${companyId}/oportunidades/${item.id}`}
                className="surface-card p-5"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                  {index + 1}. Score {item.priorityScore}
                </p>
                <h4 className="mt-2 text-[15px] font-bold">{item.title}</h4>
                <dl className="mt-3 space-y-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                  <div>
                    <dt className="font-bold text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                      Por que agora?
                    </dt>
                    <dd>{item.reasons[0] ?? item.band}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                      Qual problema resolve?
                    </dt>
                    <dd>{item.problemStatement || "Hipótese ainda sem problema descrito."}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                      Quanto esforço?
                    </dt>
                    <dd>{item.effort ?? "—"}/5</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                      Evidência
                    </dt>
                    <dd>
                      {item.validatedExperimentCount > 0
                        ? `${item.validatedExperimentCount} experimento(s) validado(s)`
                        : "Hipótese — ainda sem evidência medida"}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Ainda não há hipóteses ranqueadas. Gere a partir do Diagnóstico 360° ou crie uma oportunidade manual.
          </p>
        )}
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
      <p className="text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="mt-1 text-[13px] font-bold">{value}</p>
    </div>
  );
}
