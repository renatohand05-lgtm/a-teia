import Link from "next/link";
import { ActionPanel } from "@/components/ui/ActionPanel";
import { DecisionCard } from "@/components/ui/DecisionCard";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { NetworkMap } from "@/components/ui/NetworkMap";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { EmptyState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { SourceCard } from "@/components/ui/SourceCard";
import { MODULE_STATUS_LABEL } from "@/lib/cockpit";
import { formatBRL } from "@/lib/format";
import type { CockpitSnapshot } from "@/services/cockpitService";
import { GlobalCockpitPanels } from "@/components/cockpit/GlobalCockpitPanels";

export function CockpitView({
  snapshot,
  userName,
  filters,
}: {
  snapshot: CockpitSnapshot;
  userName: string;
  filters?: { companyId?: string; segment?: string; level?: string; kind?: string };
}) {
  const { companies, ranked, counts, action, journey, briefing } = snapshot;
  const active = companies.filter((company) => company.status === "ACTIVE");
  const demoCount = active.filter((company) => company.isDemo).length;
  const top3 = ranked.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div
          className="rounded-[24px] border p-6 shadow-[var(--shadow-lg)]"
          style={{
            background: "linear-gradient(145deg,#111216,#08090b)",
            borderColor: "rgba(232,191,122,.22)",
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold text-[#73df96]"
            style={{ background: "rgba(52,199,111,.1)", borderColor: "rgba(52,199,111,.25)" }}
          >
            ● USO PESSOAL · CENTRO DE DECISÃO EMPRESARIAL
          </span>
          <h2 className="mt-3 mb-2 text-[26px] font-bold">Meu Cockpit Executivo</h2>
          <p className="m-0 leading-relaxed" style={{ color: "var(--text-2)" }}>
            Dados → Diagnóstico → Oportunidades → Decisão → Execução → Resultado → Evidência → Memória → nova
            decisão.
          </p>
          <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {journey.map((stage, index) => (
              <div key={stage.key} className="flex shrink-0 items-center gap-2">
                {index > 0 ? (
                  <span className="text-[11px] font-black" style={{ color: "var(--gold-soft)" }}>
                    →
                  </span>
                ) : null}
                <Link
                  href={stage.href}
                  className="min-w-[108px] rounded-[14px] border px-2 py-3 text-center transition hover:-translate-y-0.5"
                  style={{
                    borderColor:
                      stage.status === "SEM_DADOS" ? "var(--border)" : "rgba(232,191,122,.45)",
                    background:
                      stage.status === "SEM_DADOS" ? "rgba(255,255,255,.035)" : "rgba(232,191,122,.08)",
                  }}
                >
                  <span
                    className="block text-[10px] font-extrabold uppercase tracking-[0.08em]"
                    style={{ color: stage.status === "SEM_DADOS" ? "var(--text-2)" : "var(--gold-soft)" }}
                  >
                    {stage.label}
                  </span>
                  <span className="mt-1.5 inline-flex">
                    <StatusChip status={stage.status} />
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div
          className="rounded-[20px] border p-5"
          style={{
            background: "linear-gradient(145deg,rgba(232,191,122,.13),rgba(255,255,255,.035))",
            borderColor: "rgba(232,191,122,.25)",
          }}
        >
          <small className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold)" }}>
            Prioridade do sistema
          </small>
          <h3 className="mt-2 text-[21px]">{action.title}</h3>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {action.body}
          </p>
          <Link
            href={action.href}
            className="mt-4 inline-flex rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            {action.cta}
          </Link>
          <div className="mt-4 space-y-0">
            <MetricLine label="Empresas ativas" value={String(counts.companiesActive)} />
            <MetricLine label="Marcadas DEMO" value={String(demoCount)} />
            <MetricLine label="Arquivadas" value={String(companies.length - active.length)} />
          </div>
        </div>
      </section>

      <GlobalCockpitPanels snapshot={snapshot} filters={filters ?? {}} />

      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div
          className="rounded-[22px] border p-[22px]"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))",
            borderColor: "var(--border)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span
                className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]"
                style={{
                  color: "var(--gold-soft)",
                  background: "rgba(232,191,122,.1)",
                  borderColor: "rgba(232,191,122,.22)",
                }}
              >
                Briefing executivo
              </span>
              <h3 className="mt-2 mb-1 text-[20px]">{userName}, onde agir primeiro</h3>
              <p className="m-0 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                Somente o que já existe na carteira. Nada inventado.
              </p>
            </div>
            <Link
              href="/empresas"
              className="rounded-xl border px-3 py-2 text-[12px] font-bold"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              Abrir empresas
            </Link>
          </div>
          {briefing.companyName ? (
            <div className="grid gap-2.5 md:grid-cols-2">
              <BriefItem label="Empresa" value={briefing.companyName} href={`/empresas/${briefing.companyId}`} />
              {briefing.bottleneck ? <BriefItem label="Gargalo" value={briefing.bottleneck} /> : null}
              {briefing.opportunityTitle ? (
                <BriefItem
                  label="Oportunidade prioritária"
                  value={briefing.opportunityTitle}
                  href={briefing.opportunityHref}
                />
              ) : null}
              {briefing.planTitle ? <BriefItem label="Plano em andamento" value={briefing.planTitle} /> : null}
              {briefing.experimentTitle ? (
                <BriefItem label="Experimento relevante" value={briefing.experimentTitle} />
              ) : null}
              {briefing.evidenceTitle ? <BriefItem label="Evidência recente" value={briefing.evidenceTitle} /> : null}
              {briefing.memoryTitle ? <BriefItem label="Memória relevante" value={briefing.memoryTitle} /> : null}
            </div>
          ) : (
            <EmptyState
              title="Carteira vazia"
              body="Cadastre a primeira empresa para gerar o briefing. Nada aqui é inventado."
              action={
                <Link
                  href="/empresas/nova"
                  className="inline-flex rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
                  style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
                >
                  Cadastrar empresa
                </Link>
              }
            />
          )}
          {top3.length ? (
            <div className="mt-4 grid gap-2.5 md:grid-cols-3">
              {top3.map((item, index) => (
                <Link
                  key={item.company.id}
                  href={`/empresas/${item.company.id}`}
                  className="flex min-h-[140px] flex-col rounded-2xl border p-3.5"
                  style={{ background: "rgba(255,255,255,.025)", borderColor: "var(--border)" }}
                >
                  <span
                    className="mb-2.5 grid h-7 w-7 place-items-center rounded-[9px] text-[12px] font-black text-[#241a08]"
                    style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <b className="text-[13px]">{item.company.name}</b>
                    {item.company.isDemo ? <DemoBadge /> : null}
                  </div>
                  <p className="mt-1.5 mb-2 text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {item.reason}
                  </p>
                  <span className="mt-auto text-[22px] font-black" style={{ color: "var(--gold-soft)" }}>
                    {item.score}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className="rounded-[22px] border p-[22px]"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))",
            borderColor: "var(--border)",
          }}
        >
          <h3 className="mt-0 mb-3 text-[20px]">Resumo de hoje</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <MiniStat label="Empresas monitoradas" value={String(counts.companiesActive)} />
            <MiniStat label="Risco crítico" value={String(ranked.filter((item) => item.zone === "critical").length)} />
            <MiniStat
              label="Faturamento informado"
              value={formatBRL(active.reduce((sum, company) => sum + (company.revenueMonthly ?? 0), 0))}
            />
            <MiniStat
              label="Com gargalo registrado"
              value={String(active.filter((company) => company.perceivedBottlenecks).length)}
            />
          </div>
          <div className="mt-3">
            <ActionPanel kicker="Ação recomendada agora" title={action.title} body={action.body}>
              <Link
                href={action.href}
                className="mt-3 inline-flex text-[11px] font-extrabold"
                style={{ color: "var(--gold-soft)" }}
              >
                {action.cta} →
              </Link>
            </ActionPanel>
          </div>
          <Link
            href={briefing.companyId ? `/empresas/${briefing.companyId}/assistente` : "/assistente"}
            className="mt-3 flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{ borderColor: "rgba(232,191,122,.28)", background: "rgba(232,191,122,.08)" }}
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Assistente IA
              </p>
              <p className="mt-1 text-[14px] font-bold">Perguntar à A TEIA</p>
            </div>
            <span className="text-[12px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
              Abrir →
            </span>
          </Link>
          {snapshot.marketIntel.recentResearchCount > 0 ? (
            <div className="mt-3 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Inteligência de mercado
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
                {snapshot.marketIntel.recentResearchCount} pesquisas recentes · {snapshot.marketIntel.recentSourceCount} fontes analisadas
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricLink href="/empresas" label="Empresas" value={counts.companiesActive} hint={counts.companiesActive ? "Ativas na carteira" : "Cadastrar primeira empresa"} />
        <MetricLink
          href={stageLink(snapshot, "diagnostico")}
          label="Diagnósticos"
          value={counts.diagnoses}
          hint={counts.diagnoses ? "360° persistidos" : "Realizar Diagnóstico 360°"}
        />
        <MetricLink
          href={stageLink(snapshot, "oportunidade")}
          label="Oportunidades"
          value={`${counts.opportunitiesPrioritized}/${counts.opportunitiesActive}`}
          hint={counts.opportunitiesActive ? "priorizadas / abertas" : "Analisar oportunidades"}
        />
        <MetricLink
          href={stageLink(snapshot, "execucao")}
          label="Planos em execução"
          value={counts.plans}
          hint={counts.plans ? "Planos 30/60/90" : "Criar plano 30/60/90"}
        />
        <MetricLink
          href={stageLink(snapshot, "financeiro")}
          label="Financeiro"
          value={counts.financialStatements}
          hint={counts.financialStatements ? "DRE e competências" : "Informar dados financeiros"}
        />
        <MetricLink
          href={stageLink(snapshot, "experimento")}
          label="Experimentos"
          value={`${counts.experimentsActive}/${counts.experimentsCompleted}`}
          hint={counts.experimentsActive || counts.experimentsCompleted ? "ativos / concluídos" : "Criar experimento"}
        />
        <MetricLink
          href={stageLink(snapshot, "evidencia")}
          label="Evidências"
          value={counts.evidenceValidated}
          hint={counts.evidenceValidated ? "validadas" : counts.evidenceTotal ? `${counts.evidenceTotal} registradas` : "Ainda sem evidências"}
        />
        <MetricLink
          href="/memoria"
          label="Memórias"
          value={counts.memoriesValidated}
          hint={counts.memoriesValidated ? "validadas" : "Transformar evidência em aprendizado"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div>
          <h2 className="mb-2 flex items-center gap-2.5 text-[22px] font-bold">
            <span
              className="inline-block h-5 w-1 rounded"
              style={{ background: "linear-gradient(180deg,var(--gold),var(--silver))" }}
            />
            Fila de decisão
          </h2>
          <p className="mb-4 max-w-[900px] text-[14.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Ranking da carteira a partir dos dados cadastrados. O próximo movimento está na prioridade do sistema.
          </p>
          <div className="space-y-2">
            {ranked.length ? (
              ranked.slice(0, 5).map((item, index) => (
                <Link key={item.company.id} href={`/empresas/${item.company.id}`} className="block">
                  <DecisionCard
                    rank={index + 1}
                    title={item.company.name}
                    detail={`${item.company.segment || "Sem segmento"} · ${item.reason}`}
                    score={item.score}
                    demo={item.company.isDemo}
                  />
                </Link>
              ))
            ) : (
              <EmptyState title="Nenhuma decisão aberta" body="Cadastre empresas para montar a fila." />
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="surface-card flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
                Saúde da carteira
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
                {ranked[0]
                  ? `Prioridade atual: ${ranked[0].company.name}.`
                  : "Sem empresa ativa. Cadastre a primeira para medir a carteira."}
              </p>
              <div className="mt-3">
                <RiskBadge
                  label={ranked[0]?.zone === "critical" ? "Atenção imediata" : active.length ? "Carteira em operação" : "Base em formação"}
                  tone={ranked[0]?.zone === "critical" ? "bad" : active.length ? "good" : "warn"}
                />
              </div>
            </div>
            <ScoreGauge score={ranked[0]?.score ?? 0} caption={active.length ? "Prioridade" : "Vazio"} />
          </div>
          <div className="surface-card p-[18px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
              Jornada da empresa em foco
            </p>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              {briefing.companyName ?? "Nenhuma empresa selecionada."}
            </p>
            <ul className="mt-3 space-y-1.5 text-[12px]" style={{ color: "var(--text-2)" }}>
              {journey.map((stage) => (
                <li key={stage.key}>
                  <Link href={stage.href} className="flex items-center justify-between gap-2">
                    <span>{stage.label}</span>
                    <span style={{ color: "var(--text-3)" }}>{MODULE_STATUS_LABEL[stage.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <NetworkMap />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SourceCard kind="INTERNAL_DATA" title="Dado interno" body="Cadastro, 360°, financeiro e evidências persistidos." />
        <SourceCard kind="INFERENCE" title="Inferência" body="Leitura produzida a partir dos dados — sempre rotulada." />
        <SourceCard kind="HYPOTHESIS" title="Hipótese" body="Oportunidade ainda não validada. Exige experimento." />
        <SourceCard kind="EVIDENCE" title="Evidência" body="Resultado medido. Nunca sobrescreve o histórico." />
        <SourceCard kind="RECOMMENDATION" title="Recomendação" body="Sugestão prática. Execução só após aprovação humana." />
        <SourceCard kind="EXTERNAL_SOURCE" title="Fonte externa" body="Pesquisa web ainda não está disponível neste produto." />
      </section>
    </div>
  );
}

function stageLink(snapshot: CockpitSnapshot, key: string) {
  return snapshot.journey.find((stage) => stage.key === key)?.href ?? snapshot.action.href;
}

function MetricLink({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Link href={href} className="block">
      <MetricCard label={label} value={value} hint={hint} />
    </Link>
  );
}

function BriefItem({ label, value, href }: { label: string; value: string; href?: string | null }) {
  const content = (
    <div className="rounded-2xl border p-3.5" style={{ background: "rgba(255,255,255,.025)", borderColor: "var(--border)" }}>
      <small className="mb-1.5 block text-[9px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
        {label}
      </small>
      <b className="text-[13px] leading-snug">{value}</b>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2.5 text-[11px]" style={{ borderColor: "var(--border)" }}>
      <span style={{ color: "var(--text-2)" }}>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[15px] border p-3.5" style={{ background: "rgba(255,255,255,.025)", borderColor: "var(--border)" }}>
      <small className="mb-1.5 block text-[9px] uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
        {label}
      </small>
      <b className="text-[17px]">{value}</b>
    </div>
  );
}
