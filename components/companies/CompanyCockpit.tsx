import Link from "next/link";
import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import type { CompanyDTO } from "@/services/companyService";
import type { DiagnosisDTO } from "@/services/diagnosisService";
import type { OnboardingDTO } from "@/services/onboardingService";

export function CompanyCockpit({
  company,
  onboarding,
  latest,
  historyCount,
  finance,
  experiments,
  memory,
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
  experiments?: {
    active: number;
    completed: number;
    validated: number;
    inconclusive: number;
  } | null;
  memory?: {
    validated: number;
    recent: Array<{ id: string; title: string }>;
    conflicting: number;
    transferableCount: number;
  } | null;
}) {
  const onboardingLabel = !onboarding ? "Não iniciado" : onboarding.status === "COMPLETE" ? "Completo" : "Em andamento";
  const money = (value: number | null) =>
    value != null
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : "—";

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
            <Mini label="Cidade/UF" value={[onboarding?.city, onboarding?.state].filter(Boolean).join("/") || "—"} />
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

      <section>
        <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
          Módulos da empresa
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ModuleCard
            eyebrow="Diagnóstico"
            title="Diagnóstico 360°"
            body={latest ? `Último score ${latest.overallScore}/100 · ${historyCount} no histórico.` : "Ainda sem diagnóstico persistido."}
            href={`/empresas/${company.id}/diagnostico`}
            cta={latest ? "Abrir diagnóstico" : "Realizar diagnóstico"}
            extra={
              <GhostLink href={`/empresas/${company.id}/diagnostico/historico`}>
                Histórico{historyCount ? ` (${historyCount})` : ""}
              </GhostLink>
            }
          />
          <ModuleCard
            eyebrow="Oportunidades"
            title="Ranking de hipóteses"
            body="Priorize o que atacar. Hipótese não é evidência."
            href={`/empresas/${company.id}/oportunidades`}
            cta="Ver oportunidades"
            extra={
              latest ? (
                <GhostLink href={`/empresas/${company.id}/oportunidades/gerar?diagnostico=${latest.id}`}>
                  Gerar a partir do 360°
                </GhostLink>
              ) : null
            }
          />
          <ModuleCard
            eyebrow="Execução"
            title="Plano 30/60/90"
            body="Tarefa concluída não valida oportunidade. Evidência nasce de experimento."
            href={`/empresas/${company.id}/execucao`}
            cta="Abrir execução"
          />
          <ModuleCard
            eyebrow="Financeiro"
            title="DRE, caixa, metas e cenários"
            body={finance ? "Resumo da competência atual." : "Informe a DRE para ver resultado, equilíbrio e cenários."}
            href={`/empresas/${company.id}/financeiro`}
            cta="Abrir financeiro"
            extra={
              <div className="flex flex-wrap gap-2">
                <GhostLink href={`/empresas/${company.id}/financeiro/dre`}>DRE</GhostLink>
                <GhostLink href={`/empresas/${company.id}/financeiro/fluxo-caixa`}>Fluxo de caixa</GhostLink>
                <GhostLink href={`/empresas/${company.id}/financeiro/metas`}>Metas</GhostLink>
                <GhostLink href={`/empresas/${company.id}/financeiro/cenarios`}>Cenários</GhostLink>
              </div>
            }
          />
          <ModuleCard
            eyebrow="Validação real"
            title="Experimentos e evidências"
            body={
              experiments
                ? `${experiments.completed} concluídos · ${experiments.validated} validados.`
                : "Teste hipóteses com baseline, meta e resultado medido."
            }
            href={`/empresas/${company.id}/experimentos`}
            cta="Ver experimentos"
            extra={
              <GhostLink href={`/empresas/${company.id}/experimentos?status=COMPLETED`}>Ver evidências</GhostLink>
            }
          />
          <ModuleCard
            eyebrow="Aprendizado"
            title="Memória estratégica"
            body={
              memory
                ? `${memory.validated} validados · ${memory.transferableCount} transferíveis.`
                : "O que funcionou, o que não funcionou e em quais condições."
            }
            href={`/empresas/${company.id}/memoria`}
            cta="Ver memória"
          />
        </div>
        <div className="mt-3">
          <GhostLink href={`/empresas/${company.id}/onboarding`}>
            {onboarding ? "Continuar onboarding" : "Iniciar onboarding"}
          </GhostLink>
        </div>
      </section>

      {finance ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
                Resumo financeiro
              </div>
              <h3 className="mt-1 text-[18px] font-black">Competência atual</h3>
            </div>
            <GoldLink href={`/empresas/${company.id}/financeiro`}>Abrir financeiro</GoldLink>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
            <Mini label="Receita" value={money(finance.revenue)} />
            <Mini label="EBITDA" value={money(finance.ebitda)} />
            <Mini label="EBITDA %" value={finance.ebitdaPercent != null ? `${finance.ebitdaPercent}%` : "—"} />
            <Mini label="CMV %" value={finance.cogsPercent != null ? `${finance.cogsPercent}%` : "—"} />
            <Mini label="Ponto de equilíbrio" value={money(finance.breakEven)} />
            <Mini label="Gap para meta" value={money(finance.revenueGap)} />
          </div>
        </section>
      ) : null}

      {experiments ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
                Validação real
              </div>
              <h3 className="mt-1 text-[18px] font-black">Experimentos e evidências</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <GhostLink href={`/empresas/${company.id}/experimentos?status=COMPLETED`}>Evidências</GhostLink>
              <GoldLink href={`/empresas/${company.id}/experimentos`}>Ver experimentos</GoldLink>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Experimentos ativos" value={String(experiments.active)} />
            <Mini label="Concluídos" value={String(experiments.completed)} />
            <Mini label="Estratégias validadas" value={String(experiments.validated)} />
            <Mini label="Testes inconclusivos" value={String(experiments.inconclusive)} />
          </div>
        </section>
      ) : null}

      {memory ? (
        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
                Memória estratégica
              </div>
              <h3 className="mt-1 text-[18px] font-black">O que já aprendemos</h3>
            </div>
            <GoldLink href={`/empresas/${company.id}/memoria`}>Ver memória</GoldLink>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Aprendizados validados" value={String(memory.validated)} />
            <Mini label="Aprendizados recentes" value={String(memory.recent.length)} />
            <Mini label="Evidências divergentes" value={String(memory.conflicting)} />
            <Mini label="Aprendizados transferíveis" value={String(memory.transferableCount)} />
          </div>
          {memory.recent.length > 0 ? (
            <ul className="mt-3 space-y-1 text-[13px]" style={{ color: "var(--text-2)" }}>
              {memory.recent.map((item) => (
                <li key={item.id}>· {item.title}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px]" style={{ color: "var(--text-3)" }}>
              Nenhum aprendizado registrado ainda.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ModuleCard({
  eyebrow,
  title,
  body,
  href,
  cta,
  extra,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
        {eyebrow}
      </p>
      <h4 className="mt-1 text-[16px] font-bold">{title}</h4>
      <p className="mt-2 flex-1 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <GoldLink href={href}>{cta}</GoldLink>
        {extra}
      </div>
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

function GoldLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
      style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
    >
      {children}
    </Link>
  );
}

function GhostLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex rounded-xl border px-4 py-2.5 text-[13px] font-bold"
      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
    >
      {children}
    </Link>
  );
}
