import Link from "next/link";
import { ActionPanel } from "@/components/ui/ActionPanel";
import { DecisionCard } from "@/components/ui/DecisionCard";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { NetworkMap } from "@/components/ui/NetworkMap";
import { OpportunityCard } from "@/components/ui/OpportunityCard";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { EmptyState } from "@/components/ui/States";
import { cockpitPriorityFromCompany } from "@/lib/priority";
import { formatBRL } from "@/lib/format";
import type { CompanyDTO } from "@/services/companyService";
import { AIChat } from "@/components/ui/AIChat";
import { ChartCard } from "@/components/ui/ChartCard";
import { SourceCard } from "@/components/ui/SourceCard";

const FLOW = ["EMPRESA", "360°", "FINANCEIRO", "OPORTUNIDADE", "DECISÃO", "AÇÃO", "RESULTADO", "MEMÓRIA"];

export function CockpitView({
  companies,
  userName,
}: {
  companies: CompanyDTO[];
  userName: string;
}) {
  const active = companies.filter((c) => c.status === "ACTIVE");
  const ranked = [...active]
    .map((company) => ({ company, ...cockpitPriorityFromCompany(company) }))
    .sort((a, b) => b.score - a.score);
  const top3 = ranked.slice(0, 3);
  const demoCount = active.filter((c) => c.isDemo).length;

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
            ● USO PESSOAL · CENTRO DE DECISÃO
          </span>
          <h2 className="mt-3 mb-2 text-[26px] font-bold">Meu Cockpit Executivo</h2>
          <p className="m-0 leading-relaxed" style={{ color: "var(--text-2)" }}>
            Uma única tela para decidir onde agir, onde investir e qual negócio precisa da sua atenção primeiro. O
            sistema organiza sinais — sem estrutura desnecessária de multiusuário.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {FLOW.map((step, index) => (
              <div
                key={step}
                className="rounded-[14px] border px-2 py-3 text-center text-[10px] font-extrabold"
                style={{
                  borderColor: index === 0 ? "rgba(232,191,122,.45)" : "var(--border)",
                  color: index === 0 ? "var(--gold-soft)" : "var(--text-2)",
                  background: index === 0 ? "rgba(232,191,122,.08)" : "rgba(255,255,255,.035)",
                }}
              >
                {step}
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
          <h3 className="mt-2 text-[21px]">{active.length ? top3[0]?.company.name : "Cadastrar dados reais"}</h3>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {active.length
              ? top3[0]?.reason
              : "Comece cadastrando uma empresa. A fila de decisão ficará mais precisa conforme os dados reais substituírem exemplos."}
          </p>
          <div className="mt-4 space-y-0">
            <MetricLine label="Empresas ativas" value={String(active.length)} />
            <MetricLine label="Marcadas DEMO" value={String(demoCount)} />
            <MetricLine label="Arquivadas" value={String(companies.length - active.length)} />
          </div>
        </div>
      </section>

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
                O Cockpit lê a carteira persistida no PostgreSQL. Números abaixo vêm do cadastro real — não de
                simulação.
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
          {top3.length ? (
            <div className="grid gap-2.5 md:grid-cols-3">
              {top3.map((item, index) => (
                <Link
                  key={item.company.id}
                  href={`/empresas/${item.company.id}`}
                  className="flex min-h-[160px] flex-col rounded-2xl border p-3.5"
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
          ) : (
            <EmptyState
              title="Carteira vazia"
              body="Cadastre a primeira empresa para gerar o briefing automático. Nada aqui é inventado."
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
            <MiniStat label="Empresas monitoradas" value={String(active.length)} />
            <MiniStat
              label="Risco crítico"
              value={String(ranked.filter((r) => r.zone === "critical").length)}
            />
            <MiniStat
              label="Faturamento informado"
              value={formatBRL(active.reduce((sum, c) => sum + (c.revenueMonthly ?? 0), 0))}
            />
            <MiniStat label="Com gargalo registrado" value={String(active.filter((c) => c.perceivedBottlenecks).length)} />
          </div>
          <div className="mt-3">
            <ActionPanel
              kicker="Ação recomendada agora"
              title={active.length ? `Abrir ${top3[0].company.name}` : "Cadastre sua carteira"}
              body={
                active.length
                  ? "Complete dados faltantes e, nas próximas sprints, o 360° e o financeiro entram neste mesmo fluxo."
                  : "Assim que houver empresas no banco, o A Teia indica o primeiro movimento do dia."
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Empresas ativas" value={active.length} hint="Persistidas no PostgreSQL" />
        <MetricCard label="Dados DEMO" value={demoCount} hint="Identificados explicitamente" />
        <MetricCard
          label="Módulos desta sprint"
          value="Fundação"
          hint="360°, financeiro e oportunidades ainda não ativos"
        />
        <MetricCard label="IA automática" value="Off" hint="Arquitetura pronta, sem ação destrutiva" />
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
            Ranking inicial a partir do cadastro. O motor completo de prioridade fica para a próxima sprint.
          </p>
          <div className="space-y-2">
            {ranked.length ? (
              ranked.slice(0, 5).map((item, index) => (
                <DecisionCard
                  key={item.company.id}
                  rank={index + 1}
                  title={item.company.name}
                  detail={`${item.company.segment || "Sem segmento"} · ${item.reason}`}
                  score={item.score}
                  demo={item.company.isDemo}
                />
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
                Score preliminar — não substitui o Diagnóstico 360°.
              </p>
              <div className="mt-3">
                <RiskBadge
                  label={ranked[0]?.zone === "critical" ? "Atenção imediata" : "Base em formação"}
                  tone={ranked[0]?.zone === "critical" ? "bad" : "warn"}
                />
              </div>
            </div>
            <ScoreGauge score={ranked[0]?.score ?? 0} caption={active.length ? "Prioridade" : "Vazio"} />
          </div>
          <OpportunityCard
            title="Motor de oportunidades"
            description="Preparado no banco (Opportunity, Strategy, Experiment). Não calculado automaticamente nesta sprint."
            demo
          />
        </div>
      </section>

      <NetworkMap />

      <section className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
        <AIChat />
        <div className="space-y-2.5">
          <SourceCard
            kind="INTERNAL_DATA"
            title="Dado interno"
            body="Cadastro de empresas, métricas e evidências persistidas no PostgreSQL."
          />
          <SourceCard
            kind="EXTERNAL_SOURCE"
            title="Fonte externa"
            body="Pesquisa web futura. URLs e conclusões ficarão em ResearchSession."
          />
          <SourceCard
            kind="INFERENCE"
            title="Inferência"
            body="Leitura produzida a partir dos dados — sempre rotulada."
          />
          <SourceCard
            kind="HYPOTHESIS"
            title="Hipótese"
            body="Ideia ainda não validada. Exige experimento."
          />
          <SourceCard kind="EVIDENCE" title="Evidência" body="Resultado medido. Nunca sobrescreve o histórico." />
          <SourceCard
            kind="RECOMMENDATION"
            title="Recomendação"
            body="Sugestão prática. Execução só após aprovação humana."
          />
        </div>
      </section>

      <ChartCard title="Fluxo operacional da Teia" demo>
        <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Empresa → 360° → Financeiro → Oportunidade → Decisão → Ação → Resultado → Memória. Somente Empresa está ativo
          na Sprint 0.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.07)" }}>
          <span
            className="block h-full w-[14%] rounded-full"
            style={{ background: "linear-gradient(90deg,var(--gold-deep),var(--gold-soft))" }}
          />
        </div>
      </ChartCard>
    </div>
  );
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
