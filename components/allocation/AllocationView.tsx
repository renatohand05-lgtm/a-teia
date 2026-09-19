"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  createPlanFromAllocationAction,
  reviewAllocationAction,
  sendAllocationDecisionAction,
  simulateAllocationAction,
} from "@/app/alocacao/actions";
import { EmptyState } from "@/components/ui/States";
import {
  allocationStatusLabel,
  displayHours,
  displayHoursFromHundredths,
  displayMoney,
  displayMoneyFromCents,
  emptyAllocationCopy,
  evidenceLabel,
  riskLabel,
  scenarioLabel,
} from "@/lib/allocation-ui";
import { assistantHref } from "@/lib/assistant-ui";
import { contextualAssistantPrompt } from "@/lib/journey-ui";
import { ALLOCATION_SHORTCUTS } from "@/lib/resource-allocation-engine";
import type { AllocationWorkspace } from "@/services/allocationService";

export function AllocationView({ workspace }: { workspace: AllocationWorkspace }) {
  const [, start] = useTransition();
  const result = workspace.result;
  const latest = workspace.latest;
  const empty = emptyAllocationCopy(workspace.companies.length > 0);
  const eligible = result
    ? [...result.allocated, ...result.unallocated].filter((item) => item.eligibility === "ELEGIVEL" || item.eligibility === "ELEGIVEL_COM_RESSALVAS").length
    : null;

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <section
        className="rounded-[24px] border p-6"
        style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}
      >
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
          Central de alocação
        </p>
        <h1 className="mt-2 text-[26px] font-bold">Tenho recursos limitados. Onde faz mais sentido investir?</h1>
        <p className="mt-2 max-w-3xl text-[14px]" style={{ color: "var(--text-2)" }}>
          O motor recomenda. Você decide. Simulação não compromete orçamento e não move dinheiro.
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
          {workspace.coverage}
        </p>
        <Link
          href={assistantHref(workspace.companies[0]?.id, contextualAssistantPrompt("alocacao"))}
          className="mt-3 inline-flex text-[12px] font-bold"
          style={{ color: "var(--gold-soft)" }}
        >
          Analisar com IA
        </Link>
      </section>

      <form action={simulateAllocationAction} className="rounded-2xl border p-4 space-y-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-[13px] font-bold">1. Definir recursos → 2. Escolher cenário → 3. Simular → 4. Revisar → 5. Enviar para decisão</p>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Field name="capitalAvailable" label="Capital disponível (R$)" defaultValue={workspace.budget.capitalAvailable} />
          <Field name="hoursAvailable" label="Horas disponíveis" defaultValue={workspace.budget.hoursAvailable} />
          <Field name="capacityLimit" label="Capacidade simultânea" defaultValue={workspace.budget.capacityLimit} />
          <Field name="reserveMinimum" label="Reserva mínima (R$)" defaultValue={workspace.budget.reserveMinimum} />
          <Field name="maxPerCompany" label="Máximo por empresa (R$)" defaultValue={workspace.budget.maxPerCompany} />
          <Field name="maxPerInitiative" label="Máximo por iniciativa (R$)" defaultValue={workspace.budget.maxPerInitiative} />
          <Field name="maxPercentPerInitiative" label="Máximo % por iniciativa" defaultValue={workspace.budget.maxPercentPerInitiative} />
          <label className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
            Horizonte
            <select name="horizon" defaultValue={workspace.budget.horizon ?? "DAYS_90"} className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
              <option value="DAYS_30">30 dias</option>
              <option value="DAYS_60">60 dias</option>
              <option value="DAYS_90">90 dias</option>
              <option value="MONTHS_6">6 meses</option>
              <option value="MONTHS_12">12 meses</option>
            </select>
          </label>
          <label className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
            Cenário
            <select name="scenario" defaultValue={workspace.budget.scenario ?? "BALANCEADO"} className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
              <option value="CONSERVADOR">Conservador</option>
              <option value="BALANCEADO">Base</option>
              <option value="EXPANSAO">Expansão</option>
            </select>
          </label>
        </div>
        <button type="submit" className="rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
          Simular
        </button>
      </form>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Mini label="Capital disponível" value={displayMoney(workspace.summary.capitalAvailable)} hint="Informado por você" />
        <Mini label="Horas disponíveis" value={displayHours(workspace.summary.hoursAvailable)} hint="Informadas por você" />
        <Mini label="Empresas analisadas" value={workspace.companies.length ? String(workspace.companies.length) : "Sem dados"} hint="Carteira ativa" />
        <Mini label="Oportunidades elegíveis" value={eligible == null ? "Sem dados" : String(eligible)} hint="Com dado suficiente" />
        <Mini label="Capital sugerido" value={displayMoney(workspace.summary.capitalProposed)} hint="Recomendação, não compromisso" />
        <Mini label="Horas sugeridas" value={displayHours(workspace.summary.hoursProposed)} hint="Tempo proposto" />
        <Mini label="Saldo não alocado" value={displayMoney(workspace.summary.capitalPreserved)} hint="Não é obrigatório usar 100%" />
        <Mini label="Status" value={allocationStatusLabel(workspace.summary.status)} hint="Simulação ≠ decisão" />
      </section>

      {!result ? (
        <EmptyState
          title={empty.title}
          body={empty.body}
          action={<Link href={empty.href} className="text-[12px] font-extrabold" style={{ color: "var(--gold-soft)" }}>{empty.cta}</Link>}
        />
      ) : (
        <>
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            {result.reserveLabel} · Capacidade usada: {result.capacityUsed}
            {result.capacityLimit != null ? `/${result.capacityLimit}` : " · capacidade não definida"} · Prontidão: {result.readiness}
          </p>
          {result.warnings.map((item) => (
            <p key={item} className="text-[12px]" style={{ color: "var(--gold-soft)" }}>{item}</p>
          ))}
          {result.emptyReason ? <EmptyState title={result.emptyReason} body="A engine não inventa iniciativa nem consome orçamento sem dado." /> : null}

          <section>
            <Header title="Proposta de alocação" subtitle={`Cenário ${scenarioLabel(result.scenario)} · horizonte ${result.horizonMonths} meses. Estimativa, não garantia.`} />
            {result.allocated.length ? (
              <div className="space-y-3">
                {result.allocated.map((item) => (
                  <article key={item.candidateId} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                      {item.companyName} · {riskLabel(item.risk)} · {evidenceLabel(item.evidenceClass)}
                      {item.concentration ? " · concentração elevada" : ""}
                    </p>
                    <h3 className="mt-1 text-[16px] font-bold">{item.title}</h3>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                      Capital sugerido {displayMoneyFromCents(item.capitalCents)} · Horas sugeridas {displayHoursFromHundredths(item.hoursHundredths)}
                    </p>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                      {item.rationale}
                    </p>
                    <p className="mt-2 text-[12px] font-semibold">Próxima ação: {item.nextAction}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>Por que esta alocação?</summary>
                      <ul className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                        {item.explanation.dataUsed.map((line) => <li key={line}>Dado: {line}</li>)}
                        <li>Regras: {item.explanation.rules.join(" · ")}</li>
                        <li>Restrições: {item.explanation.constraints.join(" · ")}</li>
                        <li>Trade-offs: {item.explanation.tradeoffs.join(" ")}</li>
                        <li>Riscos: {item.explanation.risks.join(" ")}</li>
                        <li>Evidências: {item.explanation.evidence.join(" ")}</li>
                        <li>Dados ausentes: {item.explanation.missingData.join(", ") || "nenhum neste item"}</li>
                        <li>Limitações: {item.explanation.limitations.join(" ")}</li>
                      </ul>
                    </details>
                    <Link href={item.href} className="mt-2 inline-block text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>Ver iniciativa</Link>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhuma iniciativa alocada" body="A A TEIA não força o uso de 100% do capital ou das horas." />
            )}
          </section>

          <section>
            <Header title="Não priorizados agora" subtitle="Cada item explica por que ficou de fora." />
            {result.unallocated.length ? (
              <ul className="space-y-2">
                {result.unallocated.map((item) => (
                  <li key={item.candidateId} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[13px] font-bold">{item.companyName} · {item.title}</p>
                    <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{item.skipReason}</p>
                    {item.readiness === "INSUFICIENTE" ? (
                      <Link href={item.href} className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>Completar estimativas</Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sem itens excluídos" body="Todos os candidatos cabem nas restrições atuais ou não há candidatos." />
            )}
          </section>

          {workspace.comparison ? (
            <section>
              <Header title="Comparar cenários" subtitle="Conservador, Base e Expansão. Não existe melhor cenário automático." />
              <div className="grid gap-3 md:grid-cols-3">
                {workspace.comparison.map((item) => (
                  <div key={item.scenario} className="rounded-2xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[10px] font-extrabold" style={{ color: "var(--gold-soft)" }}>{scenarioLabel(item.scenario)}</p>
                    <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                      Capital sugerido {displayMoneyFromCents(item.capitalAllocatedCents)}<br />
                      Saldo {displayMoneyFromCents(item.capitalPreservedCents)}<br />
                      Horas {displayHoursFromHundredths(item.hoursAllocatedHundredths)}<br />
                      Iniciativas {item.initiatives}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.28)" }}>
            <Header title="Revisão humana" subtitle="Simulação ≠ proposta ≠ aprovado. A IA não aprova e não move dinheiro." />
            {latest ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-[11px] font-extrabold"
                  style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}
                  onClick={() => start(() => reviewAllocationAction(latest.id, latest.updatedAt))}
                >
                  Revisar proposta
                </button>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-[11px] font-extrabold text-[#241a08]"
                  style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
                  onClick={() => start(() => sendAllocationDecisionAction(latest.id, latest.updatedAt))}
                  disabled={latest.status === "APPROVED"}
                >
                  Enviar para decisão
                </button>
                {latest.status === "APPROVED" ? (
                  <button
                    type="button"
                    className="rounded-xl border px-3 py-2 text-[11px] font-extrabold"
                    style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}
                    onClick={() => start(() => createPlanFromAllocationAction(latest.id))}
                  >
                    Criar plano de execução
                  </button>
                ) : null}
                <Link href="/cockpit#cockpit-decisoes" className="rounded-xl border px-3 py-2 text-[11px] font-extrabold" style={{ borderColor: "var(--border)" }}>
                  Abrir Central de Decisão
                </Link>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: "var(--text-2)" }}>Simule para gerar uma versão persistida.</p>
            )}
            {workspace.proposals.length ? (
              <ul className="mt-3 space-y-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                {workspace.proposals.map((item) => (
                  <li key={item.id}>#{item.version} · {allocationStatusLabel(item.status)} · {scenarioLabel(item.scenario)} · {item.updatedAt.slice(0, 10)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      )}

      <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.28)", background: "rgba(232,191,122,.06)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>Perguntar à A TEIA</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
          A IA explica o cenário. Não altera orçamento, não aprova investimento e não executa pagamento.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALLOCATION_SHORTCUTS.map((item) => (
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

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
}) {
  return (
    <label className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
      {label}
      <input
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px] font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
      />
    </label>
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
