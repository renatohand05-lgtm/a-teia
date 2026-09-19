import Link from "next/link";
import { ConnectionsPreview } from "@/components/cockpit/ConnectionsPreview";
import { GlobalCockpitPanels } from "@/components/cockpit/GlobalCockpitPanels";
import { EmptyState } from "@/components/ui/States";
import { SourceCard } from "@/components/ui/SourceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { displayPriorityScore, showCountBadge } from "@/lib/cockpit-ui";
import { formatBRL } from "@/lib/format";
import { cockpitPriorityCta, journeyChipValue } from "@/lib/journey-ui";
import type { CockpitSnapshot } from "@/services/cockpitService";

export function CockpitView({
  snapshot,
  filters,
}: {
  snapshot: CockpitSnapshot;
  filters?: { companyId?: string; segment?: string; level?: string; kind?: string };
}) {
  const { companies, ranked, counts, action, journey, briefing } = snapshot;
  const active = companies.filter((company) => company.status === "ACTIVE");
  const topPriority = snapshot.portfolio.priorities[0] ?? null;
  const focusName = topPriority?.companyName ?? briefing.companyName ?? ranked[0]?.company.name ?? null;
  const focusId = topPriority?.companyId ?? briefing.companyId ?? ranked[0]?.company.id ?? null;
  const motive = topPriority?.reason ?? ranked[0]?.reason ?? null;
  const nextStep = topPriority?.nextAction ?? action.title;
  const pendingDecisions = snapshot.portfolio.decisions.length;
  const score = displayPriorityScore(ranked[0]?.score, active.length > 0);
  const consolidation = snapshot.portfolio.consolidation;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <section
        className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]"
        data-testid="cockpit-hero"
      >
        <div
          className="rounded-2xl border px-5 py-5"
          style={{ background: "linear-gradient(145deg,#111216,#08090b)", borderColor: "var(--border)" }}
        >
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            Centro de Decisão Empresarial
          </p>
          <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">Meu Cockpit</h2>
          {focusName ? (
            <div className="mt-4 space-y-2">
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Prioridade atual
              </p>
              <p className="text-[20px] font-bold">{focusName}</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Motivo
              </p>
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                {motive ?? action.body}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Próxima ação
              </p>
              <p className="text-[13px] font-semibold">{nextStep}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={topPriority?.href ?? (focusId ? `/empresas/${focusId}` : action.href)}
                  className="rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]"
                  style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
                >
                  {cockpitPriorityCta(topPriority?.nextAction ?? action.cta)}
                </Link>
                <Link
                  href={focusId ? `/empresas/${focusId}/assistente?pergunta=${encodeURIComponent("Onde devo agir primeiro?")}` : "/assistente"}
                  className="rounded-xl border px-4 py-2 text-[12px] font-bold"
                  style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
                >
                  Analisar esta prioridade com IA
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Nenhuma empresa na carteira"
                body="Cadastre o primeiro negócio para ver prioridade, alertas e a próxima ação."
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
            </div>
          )}
          <ol className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Jornada da empresa">
            {journey.map((stage) => (
              <li key={stage.key} className="shrink-0">
                <Link
                  href={stage.href}
                  className="surface-card-interactive block min-w-[88px] rounded-xl border px-2 py-2 text-center"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="block text-[11px] font-semibold">{stage.label}</span>
                  <span className="mt-1 block text-[12px] font-bold">{journeyChipValue(snapshot.progress, stage.key)}</span>
                  <span className="mt-1 inline-flex">
                    <StatusChip status={stage.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <Signal href="/empresas" label="Carteira" value={`${counts.companiesActive} empresa${counts.companiesActive === 1 ? "" : "s"}`} hint="Monitoradas" />
          <Signal
            href="/automacoes#alertas"
            label="Alertas"
            value={String(snapshot.automation.openAlerts)}
            hint={showCountBadge(snapshot.automation.openAlerts) ? "Abertos agora" : "Nada aberto"}
          />
          <Signal
            href="/cockpit#cockpit-decisoes"
            label="Decisões pendentes"
            value={pendingDecisions ? String(pendingDecisions) : "Nenhuma"}
            hint="Aprovação humana"
          />
          <Signal
            href="/cockpit#cockpit-prioridades"
            label="Score de prioridade"
            value={score.value == null ? "Sem dados" : String(score.value)}
            hint={score.value == null ? "Sem empresa ativa" : "Com base nos sinais disponíveis"}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" data-testid="cockpit-kpis">
        <Kpi href="/empresas" label="Empresas" value={String(counts.companiesActive)} hint="Monitoradas" />
        <Kpi
          href={stageLink(snapshot, "financeiro")}
          label="Receita consolidada"
          value={formatBRL(consolidation.revenue)}
          hint={coverageOrDash(consolidation.revenueUsed ?? consolidation.total, consolidation.total, "receita")}
        />
        <Kpi
          href={stageLink(snapshot, "financeiro")}
          label="EBITDA consolidado"
          value={formatBRL(consolidation.ebitda)}
          hint={`${consolidation.ebitdaUsed}/${consolidation.total} empresas com dados`}
        />
        <Kpi href={stageLink(snapshot, "execucao")} label="Planos ativos" value={String(snapshot.portfolio.execution.activePlans)} hint="Em execução" />
        <Kpi href="/automacoes#alertas" label="Alertas" value={String(snapshot.automation.openAlerts)} hint="Abertos agora" />
        <Kpi href="/cockpit#cockpit-decisoes" label="Decisões" value={String(pendingDecisions)} hint="Aguardando humano" />
      </section>

      <GlobalCockpitPanels snapshot={snapshot} filters={filters ?? {}} />

      <ConnectionsPreview companies={active.map((company) => ({ id: company.id, name: company.name }))} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SourceCard kind="INTERNAL_DATA" title="Dado interno" body="Cadastro, 360°, financeiro e evidências." />
        <SourceCard kind="HYPOTHESIS" title="Hipótese" body="Ainda não validada. Exige experimento." />
        <SourceCard kind="EVIDENCE" title="Evidência" body="Resultado medido. Nunca inventado." />
        <SourceCard kind="EXTERNAL_SOURCE" title="Fonte externa" body="Pesquisa web rotulada. Não altera score." />
        <SourceCard kind="INFERENCE" title="Inferência" body="Leitura a partir dos dados persistidos." />
        <SourceCard kind="RECOMMENDATION" title="Recomendação" body="Sugestão. Execução só com aprovação." />
      </section>
    </div>
  );
}

function coverageOrDash(used: number, total: number, noun: string) {
  if (!total) return "Sem empresas";
  return `${used}/${total} empresas com ${noun}`;
}

function stageLink(snapshot: CockpitSnapshot, key: string) {
  return snapshot.journey.find((stage) => stage.key === key)?.href ?? snapshot.action.href;
}

function Signal({ href, label, value, hint }: { href: string; label: string; value: string; hint: string }) {
  return (
    <Link href={href} className="rounded-2xl border px-4 py-3 transition hover:bg-white/[0.03]" style={{ borderColor: "var(--border)" }}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="mt-1 text-[18px] font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-2)" }}>
        {hint}
      </p>
    </Link>
  );
}

function Kpi({ href, label, value, hint }: { href: string; label: string; value: string; hint: string }) {
  return (
    <Link href={href} className="rounded-2xl border px-3.5 py-3 transition hover:bg-white/[0.03]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="mt-1 text-[18px] font-bold tabular-nums leading-tight">{value}</p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>
        {hint}
      </p>
    </Link>
  );
}
