import Link from "next/link";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import type { CompanyDTO } from "@/services/companyService";
import type { DiagnosisDTO } from "@/services/diagnosisService";
import type { OnboardingDTO } from "@/services/onboardingService";

const FUTURE = ["Experimentos", "Memória estratégica"];

export function CompanyCockpit({
  company,
  onboarding,
  latest,
  historyCount,
  finance,
}: {
  company: CompanyDTO;
  onboarding: OnboardingDTO | null;
  latest: DiagnosisDTO | null;
  historyCount: number;
  finance?: {
    revenue: number | null;
    ebitda: number | null;
    ebitdaPercent: number | null;
    cogsPercent: number | null;
    breakEven: number | null;
    revenueGap: number | null;
  } | null;
}) {
  const onboardingLabel = !onboarding ? "Não iniciado" : onboarding.status === "COMPLETE" ? "Completo" : "Em andamento";

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div
          className="rounded-[24px] border p-6"
          style={{
            background: "linear-gradient(145deg,#111216,#08090b)",
            borderColor: "rgba(232,191,122,.22)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]"
              style={{ color: "var(--gold-soft)", borderColor: "rgba(232,191,122,.25)" }}
            >
              Mini cockpit
            </span>
            {company.isDemo ? <DemoBadge /> : null}
          </div>
          <h2 className="mt-3 mb-1 text-[26px] font-bold">{company.name}</h2>
          <p style={{ color: "var(--text-2)" }}>{company.segment || "Segmento ainda não informado"}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Onboarding" value={onboardingLabel} />
            <Mini
              label="Cidade/UF"
              value={[onboarding?.city, onboarding?.state].filter(Boolean).join("/") || "—"}
            />
            <Mini label="Último Score 360" value={latest ? `${latest.overallScore}/100` : "—"} />
            <Mini label="Maturidade" value={latest?.maturity ?? "—"} />
          </div>
        </div>
        <div className="surface-card flex items-center justify-between gap-4 p-5">
          {latest ? (
            <>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                  Último diagnóstico
                </p>
                <p className="mt-2 text-[18px] font-bold">{latest.maturity}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                  Gargalo: {latest.bottleneck}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  {new Date(latest.createdAt).toLocaleString("pt-BR")}
                </p>
                <div className="mt-3">
                  <RiskBadge label="DADO informado" tone="neutral" />
                </div>
              </div>
              <ScoreGauge score={latest.overallScore} caption={latest.maturity} />
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
              Ainda não há Diagnóstico 360° persistido para esta empresa.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <GoldLink href={`/empresas/${company.id}/onboarding`}>
          {onboarding ? "Continuar onboarding" : "Iniciar onboarding"}
        </GoldLink>
        <GhostLink href={`/empresas/${company.id}/diagnostico`}>Realizar diagnóstico</GhostLink>
        {latest ? <GhostLink href={`/empresas/${company.id}/diagnostico`}>Ver último diagnóstico</GhostLink> : null}
        <GhostLink href={`/empresas/${company.id}/diagnostico/historico`}>
          Ver histórico{historyCount ? ` (${historyCount})` : ""}
        </GhostLink>
        <GhostLink href={`/empresas/${company.id}/oportunidades`}>Ver oportunidades</GhostLink>
        {latest ? (
          <GhostLink href={`/empresas/${company.id}/oportunidades/gerar?diagnostico=${latest.id}`}>
            Gerar oportunidades
          </GhostLink>
        ) : null}
        <GhostLink href={`/empresas/${company.id}/execucao`}>Execução 30/60/90</GhostLink>
        <GoldLink href={`/empresas/${company.id}/financeiro`}>Ver financeiro</GoldLink>
      </section>

      {finance ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
            Resumo financeiro
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
            <Mini label="Receita" value={finance.revenue != null ? String(finance.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })) : "—"} />
            <Mini label="EBITDA" value={finance.ebitda != null ? String(finance.ebitda.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })) : "—"} />
            <Mini label="EBITDA %" value={finance.ebitdaPercent != null ? `${finance.ebitdaPercent}%` : "—"} />
            <Mini label="CMV %" value={finance.cogsPercent != null ? `${finance.cogsPercent}%` : "—"} />
            <Mini label="Ponto de equilíbrio" value={finance.breakEven != null ? String(finance.breakEven.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })) : "—"} />
            <Mini label="Gap para meta" value={finance.revenueGap != null ? String(finance.revenueGap.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })) : "—"} />
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Próximos módulos
        </h3>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {FUTURE.map((item) => (
            <div key={item} className="surface-card p-4 opacity-60">
              <p className="text-[13px] font-semibold">{item}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Em breve
              </p>
            </div>
          ))}
        </div>
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
      <p className="mt-1 text-[14px] font-bold">{value}</p>
    </div>
  );
}

function GoldLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
      style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
    >
      {children}
    </Link>
  );
}

function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
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
