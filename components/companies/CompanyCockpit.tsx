import Link from "next/link";
import type { ReactNode } from "react";
import { formatBRL, formatDateBR, formatPercent } from "@/lib/format";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { StatusChip } from "@/components/ui/StatusChip";
import type { ModuleStatus } from "@/lib/cockpit";
import type { JourneyChip } from "@/lib/journey-ui";
import type { CompanyDTO } from "@/services/companyService";
import type { DiagnosisDTO } from "@/services/diagnosisService";
import type { OnboardingDTO } from "@/services/onboardingService";

export function CompanyCockpit({
  company,
  journey,
  onboarding,
  latest,
  historyCount,
  finance,
  opportunities,
  execution,
  experiments,
  memory,
}: {
  company: CompanyDTO;
  journey?: JourneyChip[];
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
  opportunities?: {
    total: number;
    active: number;
  } | null;
  execution?: {
    totalPlans: number;
    activePlans: number;
    overdueTasks: number;
  } | null;
  experiments?: {
    total?: number;
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
  const money = (value: number | null) => (value != null ? formatBRL(value) : "Sem dados");

  const diagnosisStatus: ModuleStatus = latest ? "CONCLUIDO" : "SEM_DADOS";
  const opportunityStatus: ModuleStatus =
    (opportunities?.active ?? 0) > 0 ? "EM_ANDAMENTO" : (opportunities?.total ?? 0) > 0 ? "INICIADO" : "SEM_DADOS";
  const executionStatus: ModuleStatus =
    (execution?.overdueTasks ?? 0) > 0
      ? "ATENCAO"
      : (execution?.activePlans ?? 0) > 0
        ? "EM_ANDAMENTO"
        : (execution?.totalPlans ?? 0) > 0
          ? "CONCLUIDO"
          : "SEM_DADOS";
  const financeStatus: ModuleStatus = finance ? "INICIADO" : "SEM_DADOS";
  const experimentStatus: ModuleStatus =
    (experiments?.active ?? 0) > 0 ? "EM_ANDAMENTO" : (experiments?.completed ?? 0) > 0 ? "CONCLUIDO" : "SEM_DADOS";
  const memoryStatus: ModuleStatus =
    (memory?.validated ?? 0) > 0 ? "CONCLUIDO" : (memory?.recent.length ?? 0) > 0 ? "INICIADO" : "SEM_DADOS";

  return (
    <div className="space-y-5">
      {journey?.length ? (
        <section>
          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
            Jornada da empresa
          </h3>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8" aria-label="Progresso da jornada">
            {journey.map((stage) => (
              <li key={stage.key}>
                <Link
                  href={stage.href}
                  className="block rounded-xl border px-3 py-2 transition hover:bg-white/[0.03]"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                    {stage.label}
                  </p>
                  <p className="mt-1 text-[14px] font-bold">{stage.value}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

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
                  {formatDateBR(latest.createdAt)}
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
            status={diagnosisStatus}
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
            title="Oportunidades"
            status={opportunityStatus}
            body={
              opportunities
                ? `${opportunities.active} priorizadas · ${opportunities.total} abertas.`
                : "Priorize o que atacar. Hipótese não é evidência."
            }
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
            status={executionStatus}
            body="Tarefa concluída não valida oportunidade. Evidência nasce de experimento."
            href={`/empresas/${company.id}/execucao`}
            cta="Abrir plano 30/60/90"
          />
          <ModuleCard
            eyebrow="Financeiro"
            title="DRE, caixa, metas e cenários"
            status={financeStatus}
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
            status={experimentStatus}
            body={
              experiments && (experiments.total ?? experiments.completed + experiments.active) > 0
                ? `${experiments.completed} concluídos · ${experiments.validated} com meta atingida neste teste.`
                : "Você ainda não está validando nenhuma hipótese."
            }
            href={(experiments?.total ?? 0) > 0 ? `/empresas/${company.id}/experimentos` : `/empresas/${company.id}/experimentos/novo`}
            cta={(experiments?.total ?? 0) > 0 ? "Ver experimentos" : "Criar primeiro experimento"}
            extra={
              <GhostLink href={`/empresas/${company.id}/experimentos?status=COMPLETED`}>Ver evidências</GhostLink>
            }
          />
          <ModuleCard
            eyebrow="Aprendizado"
            title="Memória Estratégica"
            status={memoryStatus}
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
            <Mini label="EBITDA %" value={finance.ebitdaPercent != null ? formatPercent(finance.ebitdaPercent) : "Sem dados"} />
            <Mini label="CMV %" value={finance.cogsPercent != null ? formatPercent(finance.cogsPercent) : "Sem dados"} />
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
            <Mini label="Experimentos em andamento" value={(experiments.total ?? 0) > 0 ? String(experiments.active) : "Sem dados"} />
            <Mini label="Concluídos" value={(experiments.total ?? 0) > 0 ? String(experiments.completed) : "Sem dados"} />
            <Mini label="Meta atingida neste teste" value={(experiments.total ?? 0) > 0 ? String(experiments.validated) : "Sem dados"} />
            <Mini label="Testes inconclusivos" value={(experiments.total ?? 0) > 0 ? String(experiments.inconclusive) : "Sem dados"} />
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
            <Mini label="Aprendizados validados" value={memory.validated + memory.recent.length > 0 ? String(memory.validated) : "Sem dados"} />
            <Mini label="Novos aprendizados" value={memory.recent.length > 0 ? String(memory.recent.length) : "Sem dados"} />
            <Mini label="Evidências divergentes" value={memory.validated + memory.recent.length > 0 ? String(memory.conflicting) : "Sem dados"} />
            <Mini label="Possível transferência" value={memory.transferableCount > 0 ? String(memory.transferableCount) : "Sem dados"} />
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
  status,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  extra?: ReactNode;
  status: ModuleStatus;
}) {
  return (
    <div className="flex flex-col rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          {eyebrow}
        </p>
        <StatusChip status={status} />
      </div>
      <h4 className="mt-1 text-[16px] font-bold">{title}</h4>
      <p className="mt-2 flex-1 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <GhostLink href={href}>{cta}</GhostLink>
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
