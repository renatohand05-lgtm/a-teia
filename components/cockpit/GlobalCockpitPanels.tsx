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
import { DecisionReasonForm } from "@/components/decisions/DecisionReasonForm";
import { COCKPIT_PERIOD_OPTIONS } from "@/lib/cockpit-period";
import { EmptyState } from "@/components/ui/States";
import { displayHours, displayMoney, isAllocationDecisionTitle, scenarioFromDecisionTitle } from "@/lib/allocation-ui";
import { assistantHref } from "@/lib/assistant-ui";
import { PORTFOLIO_SHORTCUTS } from "@/lib/global-priority-engine";
import { formatBRL, formatDateBR } from "@/lib/format";
import { priorityLevelLabel, signalKindLabel } from "@/lib/cockpit-ui";
import { dataHealthLabel, displaySegment } from "@/lib/company-ux";
import { calculatePaybackMonths } from "@/lib/opportunity-score";
import { displayEvidence, displayPaybackMonths } from "@/lib/opportunity-ui";
import { displayRecordCount } from "@/lib/experiment-ui";
import { cockpitPriorityCta } from "@/lib/journey-ui";
import { DECISION_STATUS_LABELS, statusLabel } from "@/lib/status-labels";
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
  filters: { companyId?: string; segment?: string; level?: string; kind?: string; period?: string };
}) {
  const bundle = snapshot.portfolio;

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} companies={snapshot.companies} />

      <section id="cockpit-prioridades">
        <Header title="Prioridades" subtitle="Onde agir primeiro, com o dado que já existe." />
        {bundle.priorities.length ? (
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            {bundle.priorities.map((item, index) => (
              <PriorityRow key={item.id} item={item} rank={index + 1} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={snapshot.counts.companiesActive ? "Nenhuma prioridade com os dados atuais" : "Nenhuma empresa cadastrada"}
            body={
              snapshot.counts.companiesActive
                ? "Complete diagnóstico ou financeiro para gerar a fila."
                : "Cadastre a primeira empresa para montar a carteira."
            }
            action={
              <Link href={snapshot.counts.companiesActive ? "/empresas" : "/empresas/nova"} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                {snapshot.counts.companiesActive ? "Abrir empresas" : "Cadastrar empresa"}
              </Link>
            }
          />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <Header title="Alertas" subtitle="Condição detectada. Não prova fraude, perda ou falha de gestão." />
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[12px]">
            <div className="rounded-xl border px-2 py-2" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--text-3)" }}>Críticos</p>
              <p className="font-bold">{snapshot.automation.criticalAlerts}</p>
            </div>
            <div className="rounded-xl border px-2 py-2" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--text-3)" }}>Atenção</p>
              <p className="font-bold">{snapshot.automation.attentionAlerts}</p>
            </div>
            <div className="rounded-xl border px-2 py-2" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--text-3)" }}>Pendências</p>
              <p className="font-bold">{bundle.decisions.length}</p>
            </div>
          </div>
          {bundle.alerts.length ? (
            <ul className="space-y-2">
              {bundle.alerts.map((alert) => (
                <li key={alert.id} className="rounded-xl border px-3 py-2.5 transition hover:bg-white/[0.03]" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {signalKindLabel(alert.kind)} · {alert.companyName}
                  </p>
                  <Link href={alert.href} className="mt-0.5 block text-[13px] font-bold">
                    {alert.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhum alerta aberto no momento."
              body="Os números acima usam alertas reais. Zero é zero; ausência de cobertura não inventa alarme."
            />
          )}
          <Link href="/alertas" className="mt-3 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Ver todos os alertas
          </Link>
        </div>
        <DecisionCenter decisions={bundle.decisions} />
      </section>

      <section>
        <Header title="Empresas" subtitle="Completude dos dados, não se a empresa é boa ou ruim." />
        {bundle.portfolio.length ? (
          <>
            <div className="hidden overflow-hidden rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
              <table className="min-w-full text-left text-[12px]">
                <thead style={{ color: "var(--text-3)" }}>
                  <tr>
                    {["Empresa", "Segmento", "Dados", "360°", "Receita", "Oport.", "Execução", "Exp.", "Prioridade"].map((col) => (
                      <th key={col} className="px-3 py-2 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bundle.portfolio.map((row) => (
                    <tr key={row.company.id} className="border-t transition hover:bg-white/[0.03]" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2.5 font-bold">
                        <Link href={`/empresas/${row.company.id}`}>{row.company.name}</Link>
                      </td>
                      <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{displaySegment(row.company.segment)}</td>
                      <td className="px-3 py-2.5" title={row.health.explanation}>{row.health.level}</td>
                      <td className="px-3 py-2.5">{row.diagnosisScore ?? "Não informado"}</td>
                      <td className="px-3 py-2.5">{row.revenue == null ? "Não informado" : formatBRL(row.revenue)}</td>
                      <td className="px-3 py-2.5">{row.opportunityCount}</td>
                      <td className="px-3 py-2.5">{row.planCount}</td>
                      <td className="px-3 py-2.5">{row.experimentCount}</td>
                      <td className="px-3 py-2.5" style={{ color: LEVEL_TONE[row.topPriority?.level ?? "BAIXA"] }}>
                        {priorityLevelLabel(row.topPriority?.level)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {bundle.portfolio.map((row) => (
                <article key={row.company.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {displaySegment(row.company.segment)} · {dataHealthLabel(row.health.level)}
                  </p>
                  <Link href={`/empresas/${row.company.id}`} className="mt-1 block text-[15px] font-bold">
                    {row.company.name}
                  </Link>
                  <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                    Receita {row.revenue == null ? "Não informado" : formatBRL(row.revenue)} · Prioridade {priorityLevelLabel(row.topPriority?.level)}
                  </p>
                  <Link href={`/empresas/${row.company.id}`} className="mt-3 inline-block rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
                    Abrir empresa
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="Carteira vazia"
            body="Cadastre a primeira empresa para montar o portfólio."
            action={
              <Link href="/empresas/nova" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                Cadastrar empresa
              </Link>
            }
          />
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Execução" rows={[
          ["Planos ativos", String(bundle.execution.activePlans)],
          ["Tarefas pendentes", String(bundle.execution.pendingTasks)],
          ["Tarefas vencidas", String(bundle.execution.overdueTasks)],
        ]} href="/empresas?modulo=execucao" />
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-[13px] font-bold">Oportunidades</p>
          {bundle.opportunities.length ? (
            <ul className="mt-2 space-y-2">
              {bundle.opportunities.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-[13px] font-semibold">{item.title}</Link>
                  <p className="truncate text-[11px]" style={{ color: "var(--text-3)" }}>
                    {item.companyName} · {item.hasPlan ? "com plano" : "sem plano"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhuma oportunidade"
              body="Gere hipóteses a partir do diagnóstico."
              action={
                <Link href="/empresas" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Ver empresas
                </Link>
              }
            />
          )}
        </div>
        <SummaryCard title="Experimentos" rows={[
          ["Em andamento", displayRecordCount(bundle.experiments.withEvidence + bundle.experiments.withoutEvidence > 0, bundle.experiments.active)],
          ["Resultados para avaliar", displayRecordCount(bundle.experiments.withEvidence + bundle.experiments.withoutEvidence > 0, bundle.experiments.waitingResult)],
          ["Com evidência", displayRecordCount(bundle.experiments.withEvidence + bundle.experiments.withoutEvidence > 0, bundle.experiments.withEvidence)],
        ]} href="/empresas" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <Header title="Memória" subtitle="Aprendizado da empresa separado do transversal." />
          {bundle.memories.company.length || bundle.memories.transversal.length ? (
            <ul className="space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
              {bundle.memories.company.slice(0, 5).map((item) => (
                <li key={`${item.companyId}-${item.title}`}>Empresa · {item.title}</li>
              ))}
              {bundle.memories.transversal.slice(0, 3).map((item) => (
                <li key={item.title}>Transversal · {item.title}</li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhuma memória" body="Transforme evidência em aprendizado." action={<Link href="/memoria" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>Ver memória</Link>} />
          )}
        </div>
        <div>
          <Header title="O que mudou" subtitle="Somente eventos registrados." />
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
            <EmptyState
              title="Sem mudanças recentes"
              body="Ainda não há eventos nesta sessão."
              action={
                <Link href="/auditoria" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Ver auditoria
                </Link>
              }
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
          <Header title="Alocação" subtitle="Simulação não é dinheiro comprometido." />
          <div className="grid grid-cols-2 gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
            <p>Capital disponível · {displayMoney(snapshot.allocation.capitalAvailable)}</p>
            <p>Capital aguardando decisão · {snapshot.allocation.pendingDecisions}</p>
            <p>Proposto · {displayMoney(snapshot.allocation.capitalProposed)}</p>
            <p>Horas · {displayHours(snapshot.allocation.hoursAvailable)}</p>
          </div>
          <Link href="/alocacao" className="mt-3 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Abrir alocação
          </Link>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
          <Header title="Automações" subtitle="Detecção determinística." />
          <div className="grid grid-cols-2 gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
            <p>Automações ativas · {snapshot.automation.activeAutomations}</p>
            <p>Alertas abertos · {snapshot.automation.openAlerts}</p>
            <p>Alertas críticos · {snapshot.automation.criticalAlerts}</p>
          </div>
          <Link href="/automacoes" className="mt-3 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Abrir automações
          </Link>
        </div>
      </section>

      {snapshot.marketIntel.recentResearchCount > 0 ? (
        <section className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-bold">Inteligência de mercado</p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {snapshot.marketIntel.recentResearchCount} pesquisas · {snapshot.marketIntel.recentSourceCount} fontes. Fonte externa não é evidência.
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.22)" }}>
        <p className="text-[13px] font-bold">Perguntar à A TEIA</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PORTFOLIO_SHORTCUTS.map((item) => (
            <Link
              key={item.prompt}
              href={assistantHref(filters.companyId, item.prompt)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/[0.04]"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PriorityRow({ item, rank }: { item: CockpitSnapshot["portfolio"]["priorities"][number]; rank: number }) {
  const [, start] = useTransition();
  return (
    <article className="border-b px-3 py-3 last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-7 text-[12px] font-bold" style={{ color: "var(--text-3)" }}>#{rank}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{item.companyName}</p>
          <p className="truncate text-[12px]" style={{ color: "var(--text-2)" }}>
            {signalKindLabel(item.category)} · {item.reason}
          </p>
        </div>
        <span className="text-[11px] font-semibold" style={{ color: LEVEL_TONE[item.level] }}>
          {priorityLevelLabel(item.level)}
        </span>
        <Link
          href={item.href}
          className="rounded-xl border px-3 py-1.5 text-[11px] font-bold"
          style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
        >
          {cockpitPriorityCta(item.nextAction)}
        </Link>
      </div>
      <details
        className="mt-2"
        onToggle={(event) => {
          if ((event.target as HTMLDetailsElement).open) start(() => openPriorityAction(item.id));
        }}
      >
        <summary className="cursor-pointer text-[11px]" style={{ color: "var(--gold-soft)" }}>
          Por que esta empresa é prioridade?
        </summary>
        <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
          {item.nextAction}. {item.limitations.join(" ") || "Com os dados disponíveis."}
        </p>
      </details>
    </article>
  );
}

function DecisionCenter({ decisions }: { decisions: CockpitSnapshot["portfolio"]["decisions"] }) {
  const [pending, start] = useTransition();
  return (
    <div id="cockpit-decisoes">
      <Header title="Decisões pendentes" subtitle="A IA propõe. Só você aprova." />
      {decisions.length ? (
        <ul className="space-y-3">
          {decisions.map((item) => (
            <li key={item.id} className="rounded-xl border px-3 py-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-[13px] font-bold">{item.title}</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {item.companyName ?? "Portfólio"} · {statusLabel(item.status, DECISION_STATUS_LABELS)}
                {item.opportunityTitle ? ` · ${item.opportunityTitle}` : ""}
                {isAllocationDecisionTitle(item.title) && scenarioFromDecisionTitle(item.title) ? ` · ${scenarioFromDecisionTitle(item.title)}` : ""}
                {` · ${formatDateBR(item.createdAt)}`}
              </p>
              <dl className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2" style={{ color: "var(--text-2)" }}>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                    Por quê
                  </dt>
                  <dd>{item.rationale || "Sem justificativa registrada."}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                    Custo / retorno estimados
                  </dt>
                  <dd>
                    {formatBRL(item.estimatedInvestment)} · {formatBRL(item.expectedMonthlyReturn)} · payback{" "}
                    {displayPaybackMonths(calculatePaybackMonths(item.estimatedInvestment, item.expectedMonthlyReturn))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                    Evidência
                  </dt>
                  <dd>{displayEvidence(item.opportunityEvidenceLevel)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
                    Se aprovar
                  </dt>
                  <dd>A decisão fica registrada em seu nome. A IA não executa e não move capital.</dd>
                </div>
              </dl>
              {item.humanReason ? (
                <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                  Justificativa: {item.humanReason}
                </p>
              ) : null}
              {item.deferredAt ? (
                <p className="mt-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Adiada em {formatDateBR(item.deferredAt)} — ainda aguarda decisão humana.
                </p>
              ) : null}
              {item.companyId ? (
                <Link href={`/empresas/${item.companyId}`} className="mt-2 inline-block text-[11px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Abrir empresa
                </Link>
              ) : null}
              <DecisionReasonForm
                decisionId={item.id}
                companyId={item.companyId}
                title={item.title}
                onApprove={(id, reason) => approveDecisionAction(id, reason)}
                onReject={(id, reason) => rejectDecisionAction(id, reason)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={pending} className="text-[11px] font-semibold disabled:opacity-50" style={{ color: "var(--text-2)" }} onClick={() => start(() => reviewDecisionAction(item.id))}>
                  Revisar
                </button>
                <button type="button" disabled={pending} className="text-[11px] font-semibold disabled:opacity-50" style={{ color: "var(--text-2)" }} onClick={() => start(() => deferDecisionAction(item.id))}>
                  Adiar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nenhuma decisão pendente."
          body="Propostas da IA e da alocação esperam aqui. Nenhuma é aprovada automaticamente."
        />
      )}
    </div>
  );
}

function FilterBar({
  filters,
  companies,
}: {
  filters: { companyId?: string; segment?: string; level?: string; kind?: string; period?: string };
  companies: CockpitSnapshot["companies"];
}) {
  const segments = [...new Set(companies.map((item) => item.segment).filter(Boolean))] as string[];
  return (
    <form className="flex flex-wrap gap-2" action="/cockpit" aria-label="Filtros do Cockpit">
      <select name="empresa" defaultValue={filters.companyId ?? ""} className="teia-select max-w-[180px]" aria-label="Empresa">
        <option value="">Empresa</option>
        {companies.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      <select name="segmento" defaultValue={filters.segment ?? ""} className="teia-select max-w-[180px]" aria-label="Segmento">
        <option value="">Segmento</option>
        {segments.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select name="prioridade" defaultValue={filters.level ?? ""} className="teia-select max-w-[180px]" aria-label="Prioridade">
        <option value="">Prioridade</option>
        <option value="CRITICA">Crítica</option>
        <option value="ALTA">Alta</option>
        <option value="MEDIA">Média</option>
        <option value="BAIXA">Baixa</option>
      </select>
      <select name="tipo" defaultValue={filters.kind ?? ""} className="teia-select max-w-[180px]" aria-label="Tipo">
        <option value="">Tipo</option>
        {["RISK", "OPPORTUNITY", "EXECUTION", "FINANCIAL", "DIAGNOSIS", "EXPERIMENT", "EVIDENCE", "DATA_GAP"].map((item) => (
          <option key={item} value={item}>{signalKindLabel(item)}</option>
        ))}
      </select>
      <select name="periodo" defaultValue={filters.period ?? "atual"} className="teia-select max-w-[180px]" aria-label="Período">
        {COCKPIT_PERIOD_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
        Filtrar
      </button>
    </form>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="m-0 text-[18px] font-bold">{title}</h2>
      <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>{subtitle}</p>
    </div>
  );
}

function SummaryCard({ title, rows, href }: { title: string; rows: Array<[string, string]>; href: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="text-[13px] font-bold">{title}</p>
      <ul className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
        {rows.map(([label, value]) => (
          <li key={label} className="flex justify-between gap-2">
            <span>{label}</span>
            <b>{value}</b>
          </li>
        ))}
      </ul>
      <Link href={href} className="mt-3 inline-block text-[11px] font-bold" style={{ color: "var(--gold-soft)" }}>
        Abrir
      </Link>
    </div>
  );
}
