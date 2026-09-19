"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  approveDecisionAction,
  deferDecisionAction,
  openPriorityAction,
  rejectDecisionAction,
  reviewDecisionAction,
} from "@/app/cockpit/actions";
import { EmptyState } from "@/components/ui/States";
import { PORTFOLIO_SHORTCUTS } from "@/lib/global-priority-engine";
import { formatBRL, formatPercent } from "@/lib/format";
import type { CockpitSnapshot } from "@/services/cockpitService";

const LEVEL_TONE: Record<string, string> = {
  CRITICA: "#f09a93",
  ALTA: "var(--gold-soft)",
  MEDIA: "var(--text-1)",
  BAIXA: "var(--text-3)",
};

export function GlobalCockpitPanels({
  snapshot,
  filters,
}: {
  snapshot: CockpitSnapshot;
  filters: { companyId?: string; segment?: string; level?: string; kind?: string };
}) {
  const bundle = snapshot.portfolio;
  const consolidation = bundle.consolidation;

  return (
    <div className="space-y-8">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Empresas ativas" value={String(snapshot.counts.companiesActive)} hint={snapshot.counts.companiesActive ? "Carteira do owner" : "Cadastrar primeira empresa"} />
        <Mini
          label="Receita consolidada"
          value={formatBRL(consolidation.revenue)}
          hint={consolidation.label}
        />
        <Mini
          label="EBITDA consolidado"
          value={formatBRL(consolidation.ebitda)}
          hint={`${consolidation.ebitdaUsed}/${consolidation.total} empresas com EBITDA`}
        />
        <Mini
          label="Margem EBITDA"
          value={formatPercent(consolidation.ebitdaMargin)}
          hint={consolidation.ebitdaMargin == null ? "Cobertura incompleta" : "Somente empresas com receita e EBITDA"}
        />
        <Mini
          label="Caixa"
          value={formatBRL(consolidation.cash)}
          hint={`${consolidation.cashUsed}/${consolidation.total} com fluxo persistido`}
        />
        <Mini label="Oportunidades ativas" value={String(snapshot.counts.opportunitiesActive)} hint="Abertas na carteira" />
        <Mini label="Planos em execução" value={String(bundle.execution.activePlans)} hint={`${bundle.execution.overdueTasks} tarefas vencidas`} />
        <Mini label="Experimentos ativos" value={String(bundle.experiments.active)} hint={`${bundle.experiments.waitingResult} aguardando resultado`} />
        <Mini label="Alertas" value={String(bundle.alerts.length)} hint="Deduplicados" />
        <Mini label="Evidências recentes" value={String(snapshot.counts.evidenceValidated)} hint="Validadas" />
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.28)", background: "rgba(232,191,122,.05)" }}>
        <Header title="Alocação de recursos" subtitle="Quanto alocar, em qual empresa e com qual risco. A IA não aprova sozinha." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Mini label="Capital disponível" value={formatBRL(snapshot.allocation.capitalAvailable)} hint={snapshot.allocation.capitalAvailable == null ? "Não informado" : "Persistido pelo owner"} />
          <Mini label="Capital proposto" value={formatBRL(snapshot.allocation.capitalProposed)} hint={snapshot.allocation.status ?? "Sem simulação"} />
          <Mini label="Capital preservado" value={formatBRL(snapshot.allocation.capitalPreserved)} hint="Não força 100%" />
          <Mini label="Horas / capacidade" value={snapshot.allocation.hoursProposed == null ? "Não informado" : `${snapshot.allocation.hoursProposed}h`} hint={`Capacidade ${snapshot.allocation.capacityUsed ?? "—"}/${snapshot.allocation.capacityLimit ?? "não definida"} · ${snapshot.allocation.pendingDecisions} decisões`} />
        </div>
        <Link href="/alocacao" className="mt-3 inline-block text-[12px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
          Simular alocação
        </Link>
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
        <Header title="Automações e alertas" subtitle="Detecção determinística. A IA só explica." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Mini label="Alertas hoje" value={String(snapshot.automation.alertsToday)} hint="Novos no dia" />
          <Mini label="Automações ativas" value={String(snapshot.automation.activeAutomations)} hint="Ligadas pelo owner" />
          <Mini label="Falhas" value={String(snapshot.automation.failedRuns)} hint="Sem stack trace" />
          <Mini label="Próxima rotina" value={snapshot.automation.nextRunAt ? snapshot.automation.nextRunAt.slice(11, 16) : "Não agendada"} hint="Timezone America/São Paulo" />
        </div>
        <Link href="/automacoes" className="mt-3 inline-block text-[12px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
          Abrir Central de Automações
        </Link>
      </section>

      <FilterBar filters={filters} companies={snapshot.companies} />

      <section id="cockpit-prioridades">
        <Header title="Central de Decisão" subtitle="Onde agir primeiro? Ranking determinístico, sem caixa-preta." />
        {bundle.priorities.length ? (
          <div className="space-y-3">
            {bundle.priorities.map((item, index) => (
              <PriorityCard key={item.id} item={item} rank={index + 1} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={snapshot.counts.companiesActive ? "Nenhuma prioridade crítica identificada com os dados atuais." : "Cadastrar primeira empresa"}
            body={
              snapshot.counts.companiesActive
                ? "Complete os dados necessários para gerar prioridades."
                : "O centro de decisão começa com um negócio real na carteira."
            }
            action={
              <Link href={snapshot.counts.companiesActive ? "/empresas" : "/empresas/nova"} className="text-[12px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
                {snapshot.counts.companiesActive ? "Abrir empresas" : "Cadastrar empresa"}
              </Link>
            }
          />
        )}
      </section>

      <section>
        <Header title="Portfólio" subtitle="Saúde dos dados mede completude, não se a empresa é boa ou ruim." />
        {bundle.portfolio.length ? (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <table className="min-w-full text-left text-[12px]">
              <thead style={{ color: "var(--text-3)" }}>
                <tr>
                  {["Empresa", "Segmento", "Dados", "360°", "Financeiro", "Oport.", "Execução", "Exp.", "Prioridade"].map((col) => (
                    <th key={col} className="px-3 py-2 font-extrabold uppercase tracking-[0.06em]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundle.portfolio.map((row) => (
                  <tr key={row.company.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2.5 font-bold">
                      <Link href={`/empresas/${row.company.id}`}>{row.company.name}</Link>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{row.company.segment ?? "Não informado"}</td>
                    <td className="px-3 py-2.5" title={row.health.explanation}>{row.health.level}</td>
                    <td className="px-3 py-2.5">{row.diagnosisScore ?? "Não informado"}</td>
                    <td className="px-3 py-2.5">{row.revenue == null ? "Não informado" : formatBRL(row.revenue)}</td>
                    <td className="px-3 py-2.5">{row.opportunityCount}</td>
                    <td className="px-3 py-2.5">{row.planCount}</td>
                    <td className="px-3 py-2.5">{row.experimentCount}</td>
                    <td className="px-3 py-2.5" style={{ color: LEVEL_TONE[row.topPriority?.level ?? "BAIXA"] }}>
                      {row.topPriority?.level ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Portfólio vazio" body="Cadastre a primeira empresa para montar a carteira." />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <Header title="Alertas executivos" subtitle="Agrupados. Falta de dado não vira alarme financeiro." />
          {bundle.alerts.length ? (
            <ul className="space-y-2">
              {bundle.alerts.map((alert) => (
                <li key={alert.id} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                    {alert.kind} · {alert.companyName}
                  </p>
                  <Link href={alert.href} className="mt-1 block text-[13px] font-bold">{alert.title}</Link>
                  <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{alert.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sem alertas" body="Nenhum alerta derivado dos dados atuais." />
          )}
        </div>
        <DecisionCenter decisions={bundle.decisions} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Execução global" rows={[
          ["Planos ativos", String(bundle.execution.activePlans)],
          ["Tarefas pendentes", String(bundle.execution.pendingTasks)],
          ["Tarefas vencidas", String(bundle.execution.overdueTasks)],
          ["Tarefas concluídas", String(bundle.execution.doneTasks)],
        ]} href="/empresas?modulo=execucao" />
        <SummaryCard title="Experimentos globais" rows={[
          ["Ativos", String(bundle.experiments.active)],
          ["Aguardando resultado", String(bundle.experiments.waitingResult)],
          ["Concluídos", String(bundle.experiments.completed)],
          ["Com evidência", String(bundle.experiments.withEvidence)],
        ]} href="/empresas?modulo=experimentos" />
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>Oportunidades globais</p>
          {bundle.opportunities.length ? (
            <ul className="mt-2 space-y-2">
              {bundle.opportunities.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-[13px] font-bold">{item.title}</Link>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {item.companyName} · score {item.score ?? "—"} · {item.hasPlan ? "com plano" : "sem plano"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>Nenhuma oportunidade persistida.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <Header title="Memória" subtitle="Aprendizado da empresa separado do transversal. Sem transferência automática de segmento." />
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            Empresa: {bundle.memories.company.length || "nenhuma"} · Transversal: {bundle.memories.transversal.length || "nenhuma"}
          </p>
          <ul className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {bundle.memories.company.slice(0, 5).map((item) => (
              <li key={`${item.companyId}-${item.title}`}>Memória da empresa · {item.title}</li>
            ))}
            {bundle.memories.transversal.slice(0, 3).map((item) => (
              <li key={item.title}>Aprendizado transversal · {item.title} — não promove entre segmentos.</li>
            ))}
          </ul>
        </div>
        <div>
          <Header title="O que mudou?" subtitle="Trilha de auditoria existente. Sem inventar evento." />
          {bundle.changes.length ? (
            <ul className="space-y-1.5 text-[12px]" style={{ color: "var(--text-2)" }}>
              {bundle.changes.map((item) => (
                <li key={item.id}>
                  {item.title}
                  {item.companyName ? ` · ${item.companyName}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sem mudanças recentes" body="Ainda não há eventos de auditoria nesta sessão." />
          )}
          {bundle.trends.length ? (
            <ul className="mt-3 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
              {bundle.trends.map((item) => (
                <li key={`${item.companyId}-${item.metric}`}>
                  {item.companyName}: {item.metric} {item.direction === "up" ? "↑ melhorando" : item.direction === "down" ? "↓ piorando" : "→ estável"} ({item.period})
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12px]" style={{ color: "var(--text-3)" }}>Tendência só aparece com dois ou mais períodos persistidos.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.28)", background: "rgba(232,191,122,.06)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Perguntar à A TEIA
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
          A IA sugere e explica. Não aprova investimento, não valida evidência e não executa ação crítica.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PORTFOLIO_SHORTCUTS.map((item) => (
            <Link
              key={item.prompt}
              href={`/assistente?pergunta=${encodeURIComponent(item.prompt)}`}
              className="rounded-full border px-3 py-1.5 text-[11px] font-bold"
              style={{ borderColor: "rgba(232,191,122,.3)", color: "var(--gold-soft)" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PriorityCard({ item, rank }: { item: CockpitSnapshot["portfolio"]["priorities"][number]; rank: number }) {
  const [, start] = useTransition();
  return (
    <article className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: LEVEL_TONE[item.level] }}>
            {rank}. {item.companyName} · {item.level} · {item.category}
          </p>
          <h3 className="mt-1 text-[16px] font-bold">{item.situation}</h3>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>{item.reason}</p>
          <p className="mt-2 text-[12px] font-semibold">Próxima ação: {item.nextAction}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/empresas/${item.companyId}`} className="rounded-xl border px-3 py-2 text-[11px] font-extrabold" style={{ borderColor: "var(--border)" }}>
            Ver empresa
          </Link>
          <Link href={`/empresas/${item.companyId}/assistente?pergunta=${encodeURIComponent(item.situation)}`} className="rounded-xl px-3 py-2 text-[11px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
            Analisar com IA
          </Link>
        </div>
      </div>
      <details className="mt-3" onToggle={(event) => {
        if ((event.target as HTMLDetailsElement).open) start(() => openPriorityAction(item.id));
      }}>
        <summary className="cursor-pointer text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
          Por que isso é prioridade?
        </summary>
        <ul className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
          <li>Dados utilizados: {item.reason}</li>
          <li>Regras: {item.factors.join(", ")}</li>
          <li>Impacto: {item.impact}</li>
          <li>Urgência: {item.urgency}</li>
          <li>Evidência: {item.evidenceAvailable}</li>
          <li>Limitações: {item.limitations.join(" ") || "—"}</li>
          <li>Dados ausentes: {item.missingData.join(", ") || "nenhum neste sinal"}</li>
        </ul>
      </details>
    </article>
  );
}

function DecisionCenter({ decisions }: { decisions: CockpitSnapshot["portfolio"]["decisions"] }) {
  const [, start] = useTransition();
  return (
    <div id="cockpit-decisoes">
      <Header title="Decisões pendentes" subtitle="Human-in-the-loop. A IA não executa sozinha." />
      {decisions.length ? (
        <ul className="space-y-2">
          {decisions.map((item) => (
            <li key={item.id} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
              <p className="text-[13px] font-bold">{item.title}</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {item.companyName ?? "Sem empresa"} · {item.origin} · {item.status} · {item.createdAt.slice(0, 10)}
              </p>
              {item.rationale ? <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>{item.rationale}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => reviewDecisionAction(item.id))}>
                  Revisar
                </button>
                <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => approveDecisionAction(item.id))}>
                  Aprovar
                </button>
                <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => rejectDecisionAction(item.id))}>
                  Rejeitar
                </button>
                <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => deferDecisionAction(item.id))}>
                  Adiar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhuma decisão pendente" body="Propostas da IA e decisões críticas aparecem aqui para aprovação humana." />
      )}
    </div>
  );
}

function FilterBar({
  filters,
  companies,
}: {
  filters: { companyId?: string; segment?: string; level?: string; kind?: string };
  companies: CockpitSnapshot["companies"];
}) {
  const segments = [...new Set(companies.map((item) => item.segment).filter(Boolean))] as string[];
  return (
    <form className="flex flex-wrap gap-2" action="/cockpit">
      <select name="empresa" defaultValue={filters.companyId ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
        <option value="">Todas as empresas</option>
        {companies.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      <select name="segmento" defaultValue={filters.segment ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
        <option value="">Todos os segmentos</option>
        {segments.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="prioridade" defaultValue={filters.level ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
        <option value="">Todas as prioridades</option>
        {["CRITICA", "ALTA", "MEDIA", "BAIXA"].map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="tipo" defaultValue={filters.kind ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
        <option value="">Todos os sinais</option>
        {["RISK", "OPPORTUNITY", "EXECUTION", "FINANCIAL", "DIAGNOSIS", "EXPERIMENT", "EVIDENCE", "DATA_GAP"].map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
        Filtrar
      </button>
    </form>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="m-0 flex items-center gap-2 text-[20px] font-bold">
        <span className="inline-block h-5 w-1 rounded" style={{ background: "linear-gradient(180deg,var(--gold),var(--silver))" }} />
        {title}
      </h2>
      <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>{subtitle}</p>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="mt-1 text-[18px] font-black">{value}</p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>{hint}</p>
    </div>
  );
}

function SummaryCard({ title, rows, href }: { title: string; rows: Array<[string, string]>; href: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>{title}</p>
      <ul className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
        {rows.map(([label, value]) => (
          <li key={label} className="flex justify-between gap-2">
            <span>{label}</span>
            <b>{value}</b>
          </li>
        ))}
      </ul>
      <Link href={href} className="mt-3 inline-block text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
        Abrir →
      </Link>
    </div>
  );
}
