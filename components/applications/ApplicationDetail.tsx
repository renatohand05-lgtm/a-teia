import Link from "next/link";
import {
  completePlaybookApplicationAction,
  confirmPlaybookApplicationAction,
  createPlaybookApplicationExperimentAction,
  createPlaybookApplicationPlanAction,
  decidePlaybookApplicationAction,
  proposePlaybookApplicationMemoryAction,
  recordPlaybookApplicationResultAction,
  rejectPlaybookApplicationAction,
  requestPlaybookDecisionAction,
  reviewPlaybookApplicationAction,
} from "@/app/playbooks/actions";
import { ConfirmForm } from "@/components/connections/ConfirmForm";
import { APPLICATION_EMPTY, applicationStatusLabel, memoryStateLabel, operationalProgress } from "@/lib/application-center";
import { auditActionLabel } from "@/lib/audit-ui";
import { formatBRL } from "@/lib/format";
import type { getApplicationAudit, getPlaybookApplicationWorkspace } from "@/services/playbookService";

type Workspace = Awaited<ReturnType<typeof getPlaybookApplicationWorkspace>>;
type AuditRow = Awaited<ReturnType<typeof getApplicationAudit>>[number];

export function ApplicationDetailView({
  workspace,
  steps,
  audit,
}: {
  workspace: Workspace;
  steps: Array<{ key: string; label: string; done: boolean }>;
  audit: AuditRow[];
}) {
  const { playbook, application, learning, destEvidence, destExperiment, originEvidence, nextAction } = workspace;
  const progress = operationalProgress(steps);
  const score = application.compatibilityScore;
  return (
    <div className="mx-auto max-w-[920px] space-y-5">
      <section className="surface-card p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--gold-soft)" }}>
          {applicationStatusLabel(application.status)}
        </p>
        <h1 className="mt-2 text-[24px] font-extrabold">{playbook.title}</h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
          {playbook.originCompanyName} → {application.destinationName} · KPI {application.kpi || "sem dados"} ·{" "}
          {score == null ? "compatibilidade sem dados" : `${score}/100`}
        </p>
        <p className="mt-2 text-[13px] font-bold" style={{ color: "var(--gold-soft)" }}>Próxima ação: {nextAction.label}</p>
      </section>

      <section className="surface-card p-5">
        <h2 className="m-0 text-[14px] font-bold">Progresso operacional</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{progress.caption}</p>
        <ol className="mt-3 grid gap-2 text-[12px]">
          {steps.map((item) => (
            <li key={item.key} style={{ color: item.done ? "var(--text-1)" : "var(--text-3)" }}>
              {item.done ? "●" : "○"} {item.label}
            </li>
          ))}
        </ol>
      </section>

      <Block title="Playbook">
        <Link href={`/playbooks/${playbook.id}`} style={{ color: "var(--gold-soft)" }}>{playbook.title}</Link>
        {playbook.problem ? ` · ${playbook.problem}` : ""}
      </Block>
      <Block title="Empresa origem">{playbook.originCompanyName}{playbook.originSegment ? ` · ${playbook.originSegment}` : ""}</Block>
      <Block title="Empresa destino">{application.destinationName}{application.destinationSegment ? ` · ${application.destinationSegment}` : ""}</Block>

      <section className="surface-card space-y-2 p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Compatibilidade</h2>
        <p>Score: {score == null ? "Sem dados" : `${score}/100`}</p>
        <p>Cobertura: {application.scorePartial ? "Parcial" : "Completa"}</p>
        <p>Fatores favoráveis: {application.favorable.join(" · ") || "Sem dados"}</p>
        <p>Diferenças: {application.differences.join(" · ") || application.contrary.join(" · ") || "Sem dados"}</p>
        <p>Dados ausentes: {application.factorsMissing.join(" · ") || "Nenhum dado crítico ausente."}</p>
        <p>Riscos: Evidência da origem não transfere. Resultado da origem não é resultado esperado no destino.</p>
      </section>

      <section className="surface-card p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Origem vs destino</h2>
        <div className="mt-3 hidden md:block">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr style={{ color: "var(--text-3)" }}><th>Campo</th><th>Origem</th><th>Destino</th></tr>
            </thead>
            <tbody>
              {learning.rows.map((row) => (
                <tr key={row.label}><td className="capitalize">{row.label}</td><td>{row.origin}</td><td>{row.destination}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-2 md:hidden">
          {learning.rows.map((row) => (
            <article key={row.label} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="font-bold capitalize" style={{ color: "var(--text-1)" }}>{row.label}</p>
              <p>Origem: {row.origin}</p>
              <p>Destino: {row.destination}</p>
            </article>
          ))}
        </div>
        <p className="mt-3">{learning.caution}</p>
      </section>

      <section className="surface-card grid gap-3 p-5 text-[13px] md:grid-cols-2" style={{ color: "var(--text-2)" }}>
        <div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>Playbook original</p>
          <p>Investimento: {playbook.observedInvestment == null ? "Sem dados" : formatBRL(playbook.observedInvestment)}</p>
          <p>Prazo: {playbook.durationDays == null ? "Sem dados" : `${playbook.durationDays} dias`}</p>
          <p>Canal: {playbook.audience || "Sem dados"}</p>
          <p>Meta: {playbook.target == null ? "Sem dados" : playbook.target}</p>
        </div>
        <div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>Aplicação adaptada</p>
          <p>Investimento: {application.investment == null ? "Sem dados" : formatBRL(application.investment)}</p>
          <p>Prazo: {application.horizonDays == null ? "Sem dados" : `${application.horizonDays} dias`}</p>
          <p>KPI: {application.kpi || "Sem dados"}</p>
          <p>Meta: {application.proposedTarget == null ? "Sem dados" : application.proposedTarget}</p>
        </div>
      </section>

      {application.status === "AGUARDANDO_APROVACAO" || nextAction.key === "decide" ? (
        <section className="surface-card space-y-3 p-5">
          <h2 className="m-0 text-[14px] font-bold">Decisão necessária</h2>
          <div className="grid gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            <p><b>O que será testado:</b> {application.adaptedHypothesis || playbook.title}</p>
            <p><b>Por que:</b> Hipótese local no destino. Evidência da origem não transfere.</p>
            <p><b>Compatibilidade:</b> {score == null ? "Sem dados" : `${score}/100${application.scorePartial ? " parcial" : ""}`}</p>
            <p><b>Investimento:</b> {application.investment == null ? "Sem dados" : formatBRL(application.investment)}</p>
            <p><b>Prazo:</b> {application.horizonDays == null ? "Sem dados" : `${application.horizonDays} dias`}</p>
            <p><b>KPI:</b> {application.kpi || "Sem dados"}</p>
            <p><b>Meta:</b> {application.proposedTarget == null ? "Sem dados" : application.proposedTarget}</p>
            <p><b>Riscos:</b> Resultado da origem não é resultado esperado no destino.</p>
            <p><b>Dados ausentes:</b> {application.factorsMissing.join(" · ") || "Nenhum dado crítico ausente."}</p>
            <p>A IA não aprova.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ConfirmForm action={decidePlaybookApplicationAction} hidden={{ applicationId: application.id, playbookId: playbook.id, decision: "approve" }} label="Aprovar" message="Aprovar o teste nesta empresa?" />
            <ConfirmForm action={decidePlaybookApplicationAction} hidden={{ applicationId: application.id, playbookId: playbook.id, decision: "reject" }} label="Rejeitar" message="Rejeitar esta aplicação?" tone="danger" />
            <form action={reviewPlaybookApplicationAction}>
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="playbookId" value={playbook.id} />
              <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Revisar</button>
            </form>
            <form action={decidePlaybookApplicationAction}>
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="playbookId" value={playbook.id} />
              <input type="hidden" name="decision" value="defer" />
              <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Adiar</button>
            </form>
          </div>
        </section>
      ) : (
        <Block title="Decisão">{application.decisionId ? "Decisão vinculada." : "Ainda sem decisão humana."}</Block>
      )}

      <section className="surface-card space-y-3 p-5">
        <h2 className="m-0 text-[14px] font-bold">Plano</h2>
        {application.actionPlanId ? (
          <Link href={`/empresas/${application.destinationCompanyId}/execucao/${application.actionPlanId}`} style={{ color: "var(--gold-soft)" }}>
            Abrir plano vinculado
          </Link>
        ) : (
          <form action={createPlaybookApplicationPlanAction}>
            <input type="hidden" name="applicationId" value={application.id} />
            <input type="hidden" name="playbookId" value={playbook.id} />
            <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Criar plano</button>
          </form>
        )}
      </section>

      <section className="surface-card space-y-2 p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Experimento</h2>
        <p>Hipótese: {application.adaptedHypothesis || "Sem dados"}</p>
        <p>KPI: {destExperiment?.kpi ?? application.kpi ?? "Sem dados"}</p>
        <p>Baseline: {destExperiment?.baseline != null ? Number(destExperiment.baseline) : "Sem dados"}</p>
        <p>Meta: {destExperiment?.target != null ? Number(destExperiment.target) : application.proposedTarget ?? "Sem dados"}</p>
        <p>Período: {application.horizonDays == null ? "Sem dados" : `${application.horizonDays} dias`}</p>
        <p>Investimento planejado: {destExperiment?.investment != null ? formatBRL(Number(destExperiment.investment)) : application.investment == null ? "Sem dados" : formatBRL(application.investment)}</p>
        <p>Investimento realizado: {destExperiment?.realizedInvestment != null ? formatBRL(Number(destExperiment.realizedInvestment)) : "Sem dados"}</p>
        <p>Responsável: {workspace.ownerName || "Sem dados"}</p>
        <p>Status: {destExperiment?.status ?? (application.experimentId ? "Criado" : "Sem experimento")}</p>
        {application.experimentId ? (
          <Link href={`/empresas/${application.destinationCompanyId}/experimentos/${application.experimentId}`} style={{ color: "var(--gold-soft)" }}>
            Abrir experimento
          </Link>
        ) : (
          <form action={createPlaybookApplicationExperimentAction}>
            <input type="hidden" name="applicationId" value={application.id} />
            <input type="hidden" name="playbookId" value={playbook.id} />
            <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Criar experimento</button>
          </form>
        )}
      </section>

      {application.experimentId && !application.resultingEvidenceId ? (
        <section className="surface-card space-y-3 p-5">
          <h2 className="m-0 text-[14px] font-bold">Resultado pendente</h2>
          <form action={recordPlaybookApplicationResultAction} className="grid gap-2 text-[13px] sm:grid-cols-2">
            <input type="hidden" name="applicationId" value={application.id} />
            <input type="hidden" name="playbookId" value={playbook.id} />
            <label>
              Resultado medido
              <input name="finalValue" type="number" step="0.01" required className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
            </label>
            <label>
              Investimento realizado
              <input name="realizedInvestment" type="number" step="0.01" className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
            </label>
            <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08] sm:col-span-2" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
              Registrar resultado
            </button>
          </form>
        </section>
      ) : (
        <Block title="Resultado">
          {destExperiment?.finalValue != null ? `Resultado medido: ${Number(destExperiment.finalValue)}` : APPLICATION_EMPTY.results}
        </Block>
      )}

      <section className="surface-card p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Evidência local — empresa destino</h2>
        {destEvidence ? (
          <>
            <p>Origem: Experimento</p>
            <p>{destEvidence.title}</p>
            <p>A evidência da origem ({originEvidence?.title ?? "sem título"}) continua na empresa de origem.</p>
          </>
        ) : (
          <p>{APPLICATION_EMPTY.evidence}</p>
        )}
      </section>

      <section className="surface-card space-y-3 p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Memória</h2>
        <p>{memoryStateLabel(workspace.memoryStatus, workspace.memoryValidated)}</p>
        {application.resultingEvidenceId && !application.resultingMemoryId ? (
          <form action={proposePlaybookApplicationMemoryAction}>
            <input type="hidden" name="applicationId" value={application.id} />
            <input type="hidden" name="playbookId" value={playbook.id} />
            <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Propor memória local</button>
          </form>
        ) : null}
        {application.resultingEvidenceId && application.status === "MEDIDA" ? (
          <ConfirmForm action={completePlaybookApplicationAction} hidden={{ applicationId: application.id, playbookId: playbook.id }} label="Concluir ciclo" message="Concluir com evidência local?" />
        ) : null}
      </section>

      <section className="surface-card p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Cobertura do playbook</h2>
        <p>Aplicações totais: {playbook.applicationCount}</p>
        <p>Aplicações medidas: {playbook.measuredApplications}</p>
        <p>Empresas testadas: {playbook.testedCompanies}</p>
        <p>Segmentos testados: {playbook.testedSegments}</p>
        <p>Resultados positivos / negativos / inconclusivos: somente os medidos no destino. Sem percentual de chance.</p>
        <p>Maturidade: {playbook.maturity.replace("_", " ")}</p>
        <p>Maturidade mede quantidade e diversidade de evidência — não garantia de sucesso.</p>
      </section>

      <section className="surface-card p-5 text-[13px]" style={{ color: "var(--text-2)" }}>
        <h2 className="m-0 text-[14px] font-bold" style={{ color: "var(--text-1)" }}>Histórico</h2>
        {!audit.length ? (
          <p className="mt-2">Nenhum evento persistido.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {audit.map((item) => (
              <li key={item.id}>
                {item.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {item.actor?.name ?? "Sistema"} · {auditActionLabel(item.action)} · {item.success ? "ok" : "falhou"}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <ConfirmForm action={confirmPlaybookApplicationAction} hidden={{ applicationId: application.id, playbookId: playbook.id }} label="Criar oportunidade" message="Criar oportunidade no destino como hipótese?" />
        <form action={requestPlaybookDecisionAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbook.id} />
          <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Pedir decisão</button>
        </form>
        <ConfirmForm action={rejectPlaybookApplicationAction} hidden={{ applicationId: application.id, playbookId: playbook.id }} label="Rejeitar" message="Rejeitar esta aplicação?" tone="danger" />
      </div>
      <Link href="/aplicacoes" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>Voltar à central</Link>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="m-0 text-[14px] font-bold">{title}</h2>
      <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{children}</p>
    </section>
  );
}
