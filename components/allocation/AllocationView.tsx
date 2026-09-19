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
import { formatBRL } from "@/lib/format";
import { fromCents, fromHourHundredths } from "@/lib/money";
import { ALLOCATION_SHORTCUTS } from "@/lib/resource-allocation-engine";
import type { AllocationWorkspace } from "@/services/allocationService";

export function AllocationView({ workspace }: { workspace: AllocationWorkspace }) {
  const [, start] = useTransition();
  const result = workspace.result;
  const latest = workspace.latest;

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <section
        className="rounded-[24px] border p-6"
        style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}
      >
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
          Alocação de recursos
        </p>
        <h1 className="mt-2 text-[26px] font-bold">Onde colocar capital, tempo e capacidade?</h1>
        <p className="mt-2 max-w-3xl text-[14px]" style={{ color: "var(--text-2)" }}>
          A A TEIA recomenda. O humano decide. Sem números inventados, sem ROI mágico e sem movimentar dinheiro.
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
          {workspace.coverage}
        </p>
      </section>

      <form action={simulateAllocationAction} className="rounded-2xl border p-4 space-y-4" style={{ borderColor: "var(--border)" }}>
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
              <option value="BALANCEADO">Balanceado</option>
              <option value="EXPANSAO">Expansão</option>
            </select>
          </label>
        </div>
        <button type="submit" className="rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
          Simular alocação
        </button>
      </form>

      {!result ? (
        <EmptyState
          title={workspace.companies.length ? "Informe os recursos disponíveis para iniciar uma simulação." : "Cadastrar primeira empresa"}
          body={workspace.companies.length ? "Capital, horas ou capacidade precisam ser informados. A A TEIA não inventa disponibilidade." : "Sem empresas na carteira não há o que alocar."}
          action={<Link href={workspace.companies.length ? "/empresas" : "/empresas/nova"} className="text-[12px] font-extrabold" style={{ color: "var(--gold-soft)" }}>{workspace.companies.length ? "Abrir empresas" : "Cadastrar empresa"}</Link>}
        />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Mini label="Capital disponível" value={formatBRL(fromCents(result.capitalAvailableCents))} hint="Informado pelo usuário" />
            <Mini label="Capital proposto" value={formatBRL(fromCents(result.capitalAllocatedCents))} hint={`${result.allocated.length} iniciativas`} />
            <Mini label="Capital preservado" value={formatBRL(fromCents(result.capitalPreservedCents))} hint="Não é obrigatório alocar 100%" />
            <Mini label="Horas propostas" value={hoursLabel(result.hoursAllocatedHundredths)} hint={`Disponíveis: ${hoursLabel(result.hoursAvailableHundredths)}`} />
          </section>
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            {result.reserveLabel} · Capacidade usada: {result.capacityUsed}
            {result.capacityLimit != null ? `/${result.capacityLimit}` : " · capacidade não definida"} · Prontidão: {result.readiness}
          </p>
          {result.warnings.map((item) => (
            <p key={item} className="text-[12px]" style={{ color: "var(--gold-soft)" }}>{item}</p>
          ))}
          {result.emptyReason ? <EmptyState title={result.emptyReason} body="A engine não inventa iniciativa nem consome orçamento sem dado." /> : null}

          <section>
            <Header title="Proposta de alocação" subtitle={`Cenário ${result.scenario} · horizonte ${result.horizonMonths} meses. Estimativa, não garantia.`} />
            {result.allocated.length ? (
              <div className="space-y-3">
                {result.allocated.map((item) => (
                  <article key={item.candidateId} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                      {item.companyName} · {item.risk} · {item.evidenceClass}
                      {item.concentration ? " · CONCENTRAÇÃO ELEVADA" : ""}
                    </p>
                    <h3 className="mt-1 text-[16px] font-bold">{item.title}</h3>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                      Capital {formatBRL(fromCents(item.capitalCents))} · Tempo {hoursLabel(item.hoursHundredths)} · Payback {item.paybackMonthsHundredths != null ? `${(item.paybackMonthsHundredths / 100).toFixed(1)} meses` : "não informado"}
                    </p>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                      {item.expectedMonthlyReturnCents != null
                        ? `Retorno estimado informado/modelado: ${formatBRL(fromCents(item.expectedMonthlyReturnCents))}/mês`
                        : "Retorno estimado não informado."}
                      {item.roiBps != null ? ` · ROI estimado no horizonte: ${(item.roiBps / 100).toFixed(1)}% (estimativa)` : ""}
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

          {result.opportunityCosts.length ? (
            <section>
              <Header title="Custo de oportunidade" subtitle="O ranking explica os fatores. O usuário decide o vencedor." />
              <ul className="space-y-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                {result.opportunityCosts.map((item) => (
                  <li key={`${item.chosenTitle}-${item.skippedTitle}`} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                    <b>Opção A</b> {item.chosenTitle}: {item.chosenSummary}<br />
                    <b>Opção B</b> {item.skippedTitle}: {item.skippedSummary}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-2">
            <div>
              <Header title="Mapa de capital" subtitle="Valores persistidos da proposta. Sem gráfico sofisticado neste sprint." />
              <ul className="space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                {workspace.result ? companyRows(workspace.result).map((row) => (
                  <li key={row.companyId} className="flex justify-between gap-2">
                    <span>{row.companyName}</span>
                    <b>{formatBRL(fromCents(row.capitalCents))}</b>
                  </li>
                )) : null}
                <li className="flex justify-between gap-2">
                  <span>Preservado</span>
                  <b>{formatBRL(fromCents(result.capitalPreservedCents))}</b>
                </li>
              </ul>
            </div>
            <div>
              <Header title="Mapa de tempo" subtitle="Horas planejadas por empresa e capacidade livre." />
              <ul className="space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                {workspace.result ? companyRows(workspace.result).map((row) => (
                  <li key={`h-${row.companyId}`} className="flex justify-between gap-2">
                    <span>{row.companyName}</span>
                    <b>{hoursLabel(row.hoursHundredths)}</b>
                  </li>
                )) : null}
                <li className="flex justify-between gap-2">
                  <span>Horas livres</span>
                  <b>{hoursLabel(result.hoursPreservedHundredths)}</b>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <Header title="Portfólio de recursos" subtitle="Capital, horas, risco e evidência por empresa alocada." />
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
              <table className="min-w-full text-left text-[12px]">
                <thead style={{ color: "var(--text-3)" }}>
                  <tr>
                    {["Empresa", "Capital", "Horas", "Iniciativas", "Risco", "Evidência", "Status"].map((col) => (
                      <th key={col} className="px-3 py-2 font-extrabold uppercase tracking-[0.06em]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companyRows(result).map((row) => (
                    <tr key={row.companyId} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2.5 font-bold">{row.companyName}</td>
                      <td className="px-3 py-2.5">{formatBRL(fromCents(row.capitalCents))}</td>
                      <td className="px-3 py-2.5">{hoursLabel(row.hoursHundredths)}</td>
                      <td className="px-3 py-2.5">{row.count}</td>
                      <td className="px-3 py-2.5">{row.risk}</td>
                      <td className="px-3 py-2.5">{row.evidence}</td>
                      <td className="px-3 py-2.5">{latest?.status ?? "SIMULATION"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {workspace.comparison ? (
            <section>
              <Header title="Comparação de cenários" subtitle="Não existe melhor cenário automático. Você escolhe." />
              <div className="grid gap-3 md:grid-cols-3">
                {workspace.comparison.map((item) => (
                  <div key={item.scenario} className="rounded-2xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[10px] font-extrabold" style={{ color: "var(--gold-soft)" }}>{item.scenario}</p>
                    <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                      Capital alocado {formatBRL(fromCents(item.capitalAllocatedCents))}<br />
                      Preservado {formatBRL(fromCents(item.capitalPreservedCents))}<br />
                      Horas {hoursLabel(item.hoursAllocatedHundredths)}<br />
                      Iniciativas {item.initiatives} · Risco alto {item.highRisk} · Evidência validada {item.validatedEvidence}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {workspace.sensitivity ? (
            <section>
              <Header title="Sensibilidade" subtitle="Variações simples. Sem Monte Carlo e sem probabilidade inventada." />
              <ul className="grid gap-2 md:grid-cols-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                <li>Capital -20%: {formatBRL(fromCents(workspace.sensitivity.capitalMinus20.capitalAllocatedCents))} alocados</li>
                <li>Capital +20%: {formatBRL(fromCents(workspace.sensitivity.capitalPlus20.capitalAllocatedCents))} alocados</li>
                <li>Horas -20%: {hoursLabel(workspace.sensitivity.hoursMinus20.hoursAllocatedHundredths)}</li>
                <li>Horizonte 12 meses: {workspace.sensitivity.horizon12.allocated.length} iniciativas</li>
              </ul>
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
                  Abrir Decision Center
                </Link>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: "var(--text-2)" }}>Simule para gerar uma versão persistida.</p>
            )}
            {workspace.proposals.length ? (
              <ul className="mt-3 space-y-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                {workspace.proposals.map((item) => (
                  <li key={item.id}>Simulação #{item.version} · {item.status} · {item.scenario} · {item.updatedAt.slice(0, 16)}</li>
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

function companyRows(result: NonNullable<AllocationWorkspace["result"]>) {
  const map = new Map<string, { companyId: string; companyName: string; capitalCents: number; hoursHundredths: number; count: number; risk: string; evidence: string }>();
  for (const item of result.allocated) {
    const current = map.get(item.companyId) ?? {
      companyId: item.companyId,
      companyName: item.companyName,
      capitalCents: 0,
      hoursHundredths: 0,
      count: 0,
      risk: item.risk,
      evidence: item.evidenceClass,
    };
    current.capitalCents += item.capitalCents ?? 0;
    current.hoursHundredths += item.hoursHundredths ?? 0;
    current.count += 1;
    map.set(item.companyId, current);
  }
  return [...map.values()];
}

function hoursLabel(value: number | null | undefined) {
  const hours = fromHourHundredths(value ?? null);
  return hours == null ? "Não informado" : `${hours}h`;
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
