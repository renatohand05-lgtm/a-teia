import Link from "next/link";
import {
  completePlaybookApplicationAction,
  confirmPlaybookApplicationAction,
  createPlaybookApplicationExperimentAction,
  createPlaybookApplicationPlanAction,
  decidePlaybookApplicationAction,
  proposePlaybookApplicationAction,
  proposePlaybookApplicationMemoryAction,
  recordPlaybookApplicationResultAction,
  rejectPlaybookApplicationAction,
  requestPlaybookDecisionAction,
  reviewPlaybookApplicationAction,
} from "@/app/playbooks/actions";
import { ConfirmForm } from "@/components/connections/ConfirmForm";
import { formatBRL } from "@/lib/format";
import { TRANSFER_EMPTY, TRANSFER_STATUS_LABELS, type TransferStatus } from "@/lib/playbook-transfer-engine";
import type { analyzePlaybookFit, getPlaybookApplicationWorkspace, PlaybookApplicationDTO, PlaybookDTO } from "@/services/playbookService";

type Fit = Awaited<ReturnType<typeof analyzePlaybookFit>>;
type Workspace = Awaited<ReturnType<typeof getPlaybookApplicationWorkspace>>;

export function PlaybookTransferPanel({
  playbook,
  companies,
  selectedCompanyId,
  fit,
  proposal,
  workspace,
  warning,
}: {
  playbook: PlaybookDTO;
  companies: Array<{ id: string; name: string; segment: string | null }>;
  selectedCompanyId: string;
  fit: Fit | null;
  proposal: PlaybookApplicationDTO | null;
  workspace: Workspace | null;
  warning?: boolean;
}) {
  const destinations = companies.filter((item) => item.id !== playbook.originCompanyId);
  return (
    <section className="surface-card space-y-5 p-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--gold-soft)" }}>
          Ciclo de transferência
        </p>
        <h2 className="m-0 mt-1 text-[18px] font-bold">Testar em outra empresa</h2>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
          Evidência da origem não transfere. No destino isto nasce como hipótese.
        </p>
      </div>

      {warning ? (
        <p className="text-[13px]" style={{ color: "var(--gold-soft)" }}>
          Este playbook já está sendo testado nesta empresa.
        </p>
      ) : null}

      <ol className="grid gap-2 text-[11px] font-bold uppercase tracking-[0.08em] sm:grid-cols-3 xl:grid-cols-6" style={{ color: "var(--text-3)" }}>
        {["1. Destino", "2. Compatibilidade", "3. Adaptação", "4. KPI", "5. Revisão", "6. Confirmação"].map((step) => (
          <li key={step} className="rounded-lg border px-2 py-2" style={{ borderColor: "var(--border)" }}>{step}</li>
        ))}
      </ol>

      <form action={proposePlaybookApplicationAction} className="grid gap-3 text-[13px]">
        <input type="hidden" name="playbookId" value={playbook.id} />
        <label>
          Empresa destino
          <select name="companyId" defaultValue={selectedCompanyId} required className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
            <option value="">Selecionar</option>
            {destinations.map((item) => (
              <option key={item.id} value={item.id}>{item.name}{item.segment ? ` · ${item.segment}` : ""}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            KPI
            <input name="kpi" defaultValue={proposal?.kpi ?? playbook.primaryKpi ?? ""} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
          <label>
            Meta adaptada
            <input name="target" type="number" step="0.01" defaultValue={proposal?.proposedTarget ?? playbook.target ?? ""} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
          <label>
            Prazo (dias)
            <input name="horizonDays" type="number" defaultValue={proposal?.horizonDays ?? playbook.durationDays ?? 30} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
          <label>
            Investimento
            <input name="investment" type="number" step="0.01" defaultValue={proposal?.investment ?? playbook.observedInvestment ?? ""} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
        </div>
        <label>
          Canal / adaptação
          <input name="channel" defaultValue={playbook.audience ?? ""} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
        </label>
        <label>
          Hipótese local
          <textarea name="hypothesis" rows={3} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} defaultValue={proposal?.adaptedHypothesis ?? `Testar “${playbook.title}” na empresa destino. Permanece hipótese.`} />
        </label>
        <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
          Analisar compatibilidade e propor
        </button>
      </form>

      {fit ? <CompatibilityBlock fit={fit} /> : null}
      {proposal ? <CycleActions playbookId={playbook.id} application={proposal} workspace={workspace} /> : null}
    </section>
  );
}

function CompatibilityBlock({ fit }: { fit: Fit }) {
  const score = fit.transferScore;
  return (
    <div className="space-y-3 rounded-xl border p-4 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
      <p className="font-bold" style={{ color: "var(--text-1)" }}>
        Score de compatibilidade: {score.score}/100
      </p>
      <p>{score.caption}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {score.dimensions.map((item) => (
          <p key={item.key}>
            {item.label}: {item.missing ? "Sem dados" : `${item.value}/${item.max}`}
          </p>
        ))}
      </div>
      <p>Fatores favoráveis: {score.favorable.join(" · ") || TRANSFER_EMPTY.data}</p>
      <p>Diferenças: {score.differences.join(" · ") || "Nenhuma diferença crítica persistida."}</p>
      <p>Dados ausentes: {score.missing.join(" · ") || "Nenhum dado crítico ausente."}</p>
      <p>Riscos: {score.risks.join(" · ")}</p>
      <p>{fit.warning}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>Playbook original</p>
          <p>Prazo: {fit.adaptation.original.prazo}</p>
          <p>Investimento: {fit.adaptation.original.investimento}</p>
          <p>Meta: {fit.adaptation.original.meta}</p>
          <p>Canal: {fit.adaptation.original.canal}</p>
        </div>
        <div>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>Adaptação proposta</p>
          <p>Prazo: {fit.adaptation.proposed.prazo}</p>
          <p>Investimento: {fit.adaptation.proposed.investimento}</p>
          <p>Meta: {fit.adaptation.proposed.meta}</p>
          <p>Canal: {fit.adaptation.proposed.canal}</p>
        </div>
      </div>
    </div>
  );
}

function CycleActions({
  playbookId,
  application,
  workspace,
}: {
  playbookId: string;
  application: PlaybookApplicationDTO;
  workspace: Workspace | null;
}) {
  const status = TRANSFER_STATUS_LABELS[application.status as TransferStatus] ?? application.status;
  return (
    <div className="space-y-4">
      <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
        Status: {status}. Classificação: hipótese no destino. Compatibilidade {application.compatibilityScore ?? "parcial"}/100
        {application.scorePartial ? " · parcial por falta de dados" : ""}.
      </p>
      {workspace ? <Timeline items={workspace.timeline} /> : null}
      {workspace ? <CompareTable learning={workspace.learning} /> : null}

      <div className="flex flex-wrap gap-2">
        <ConfirmForm
          action={confirmPlaybookApplicationAction}
          hidden={{ applicationId: application.id, playbookId }}
          label="Criar oportunidade"
          message="Criar oportunidade no destino? Ela nascerá como hipótese e não copiará evidência da origem."
        />
        <form action={reviewPlaybookApplicationAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbookId} />
          <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Revisar</button>
        </form>
        <form action={requestPlaybookDecisionAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbookId} />
          <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Pedir decisão</button>
        </form>
        <ConfirmForm
          action={decidePlaybookApplicationAction}
          hidden={{ applicationId: application.id, playbookId, decision: "approve" }}
          label="Aprovar"
          message="Aprovar o teste nesta empresa? A IA não aprova."
        />
        <ConfirmForm
          action={decidePlaybookApplicationAction}
          hidden={{ applicationId: application.id, playbookId, decision: "reject" }}
          label="Rejeitar"
          message="Rejeitar esta aplicação?"
          tone="danger"
        />
        <form action={decidePlaybookApplicationAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbookId} />
          <input type="hidden" name="decision" value="defer" />
          <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Adiar</button>
        </form>
        <ConfirmForm
          action={rejectPlaybookApplicationAction}
          hidden={{ applicationId: application.id, playbookId }}
          label="Cancelar aplicação"
          message="Rejeitar esta aplicação?"
          tone="danger"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={createPlaybookApplicationPlanAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbookId} />
          <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Gerar plano 30/60/90</button>
        </form>
        <form action={createPlaybookApplicationExperimentAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbookId} />
          <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Criar experimento</button>
        </form>
      </div>

      {application.experimentId && !application.resultingEvidenceId ? (
        <form action={recordPlaybookApplicationResultAction} className="grid gap-2 rounded-xl border p-3 text-[13px] sm:grid-cols-2" style={{ borderColor: "var(--border)" }}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="playbookId" value={playbookId} />
          <label>
            Resultado medido
            <input name="finalValue" type="number" step="0.01" required className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
          <label>
            Investimento realizado
            <input name="realizedInvestment" type="number" step="0.01" className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="sm:col-span-2">
            Receita incremental observada
            <input name="realizedReturn" type="number" step="0.01" className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
          </label>
          <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08] sm:col-span-2" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
            Registrar resultado local
          </button>
        </form>
      ) : null}

      {application.resultingEvidenceId ? (
        <div className="rounded-xl border p-3 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
          <p className="font-bold" style={{ color: "var(--text-1)" }}>Evidência local</p>
          <p>Origem: experimento da empresa destino. Não pertence automaticamente ao playbook global.</p>
          <p>Empresa: {application.destinationName}</p>
          {application.investment != null ? <p>Investimento: {formatBRL(application.investment)}</p> : <p>Investimento: Sem dados</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={proposePlaybookApplicationMemoryAction}>
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="playbookId" value={playbookId} />
              <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Propor memória local</button>
            </form>
            <ConfirmForm
              action={completePlaybookApplicationAction}
              hidden={{ applicationId: application.id, playbookId }}
              label="Concluir ciclo"
              message="Concluir o ciclo com evidência local? Isso não transfere evidência para o playbook global."
            />
          </div>
        </div>
      ) : null}

      {application.opportunityId ? (
        <Link href={`/empresas/${application.destinationCompanyId}/oportunidades/${application.opportunityId}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          Abrir oportunidade do destino
        </Link>
      ) : null}
    </div>
  );
}

function Timeline({ items }: { items: Array<{ key: string; label: string; done: boolean }> }) {
  return (
    <ol className="grid gap-2 text-[12px] md:grid-cols-2">
      {items.map((item) => (
        <li key={item.key} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", color: item.done ? "var(--text-1)" : "var(--text-3)" }}>
          {item.done ? "●" : "○"} {item.label}
        </li>
      ))}
    </ol>
  );
}

function CompareTable({ learning }: { learning: Workspace["learning"] }) {
  return (
    <div className="space-y-2 text-[13px]" style={{ color: "var(--text-2)" }}>
      <p className="font-bold" style={{ color: "var(--text-1)" }}>Origem vs destino</p>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr style={{ color: "var(--text-3)" }}>
              <th className="pb-2">Campo</th>
              <th>Origem</th>
              <th>Destino</th>
            </tr>
          </thead>
          <tbody>
            {learning.rows.map((row) => (
              <tr key={row.label}>
                <td className="py-1 capitalize">{row.label}</td>
                <td>{row.origin}</td>
                <td>{row.destination}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 md:hidden">
        {learning.rows.map((row) => (
          <article key={row.label} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <p className="font-bold capitalize" style={{ color: "var(--text-1)" }}>{row.label}</p>
            <p>Origem: {row.origin}</p>
            <p>Destino: {row.destination}</p>
          </article>
        ))}
      </div>
      <p>O que se repetiu: {learning.repeated.join(", ") || TRANSFER_EMPTY.data}</p>
      <p>O que mudou: {learning.changed.join(", ") || "Nada comparado com dados suficientes."}</p>
      <p>O que funcionou: {learning.worked.join(" · ") || TRANSFER_EMPTY.results}</p>
      <p>O que não funcionou: {learning.failed.join(" · ") || TRANSFER_EMPTY.results}</p>
      <p>{learning.caution}</p>
    </div>
  );
}
