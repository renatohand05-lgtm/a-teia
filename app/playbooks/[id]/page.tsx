import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approvePlaybookAction,
  archivePlaybookAction,
  submitPlaybookAction,
} from "@/app/playbooks/actions";
import { ConfirmForm } from "@/components/connections/ConfirmForm";
import { AppShell } from "@/components/layout/AppShell";
import { PlaybookTransferPanel } from "@/components/playbooks/PlaybookTransferPanel";
import { formatBRL } from "@/lib/format";
import {
  VALIDATED_PLAYBOOK_COPY,
  playbookFamilyLabel,
  playbookStatusLabel,
  transferClassification,
} from "@/lib/playbook-engine";
import { TRANSFER_EMPTY, TRANSFER_STATUS_LABELS, type TransferStatus } from "@/lib/playbook-transfer-engine";
import {
  analyzePlaybookFit,
  getPlaybookApplicationWorkspace,
  getPlaybookDetail,
} from "@/services/playbookService";

export const dynamic = "force-dynamic";

export default async function PlaybookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ aplicar?: string; empresa?: string; proposta?: string; aviso?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const query = (await searchParams) ?? {};
  let detail;
  try {
    detail = await getPlaybookDetail(session.user.id, id, Number(query.page ?? 1) || 1);
  } catch {
    notFound();
  }
  const { playbook, applications, evidence, memory, companies, coverage, multiContextNote } = detail;
  const applying = query.aplicar === "1";
  const selectedCompanyId = query.empresa && query.empresa !== playbook.originCompanyId ? query.empresa : "";
  const fit = selectedCompanyId ? await analyzePlaybookFit(session.user.id, playbook.id, selectedCompanyId) : null;
  const proposal =
    applications.find((item) => item.id === query.proposta) ??
    applications.find((item) => item.destinationCompanyId === selectedCompanyId) ??
    applications[0] ??
    null;
  const workspace = proposal ? await getPlaybookApplicationWorkspace(session.user.id, proposal.id).catch(() => null) : null;
  const transfer = transferClassification();

  return (
    <AppShell title="Playbook" subtitle={playbook.originCompanyName} userName={session.user.name}>
      <div className="mx-auto max-w-[920px] space-y-5">
        <section className="surface-card p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--gold-soft)" }}>
            {playbookStatusLabel(playbook.status)} · {playbookFamilyLabel(playbook.family)}
          </p>
          <h1 className="mt-2 text-[24px] font-extrabold">{playbook.title}</h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{playbook.description}</p>
          <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>{VALIDATED_PLAYBOOK_COPY}</p>
          {multiContextNote ? <p className="mt-2 text-[12px]" style={{ color: "var(--gold-soft)" }}>{multiContextNote}</p> : null}
        </section>

        <section className="surface-card p-5">
          <h2 className="m-0 text-[14px] font-bold">Cobertura de evidência</h2>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{coverage.caption}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] md:grid-cols-3">
            <Coverage label="Aplicações medidas" value={coverage.measured} />
            <Coverage label="Empresas" value={coverage.companies} />
            <Coverage label="Segmentos" value={coverage.segments} />
            <Coverage label="Positivas" value={coverage.positives} />
            <Coverage label="Negativas" value={coverage.negatives} />
            <Coverage label="Inconclusivas" value={coverage.inconclusive} />
          </div>
          <p className="mt-3 text-[12px]" style={{ color: "var(--text-3)" }}>
            Maturidade {coverage.maturity} mede quantidade e diversidade da evidência, não probabilidade de sucesso.
          </p>
        </section>

        <Block title="Resumo executivo">
          Origem {playbook.originCompanyName}
          {playbook.originSegment ? ` · ${playbook.originSegment}` : ""}. KPI {playbook.primaryKpi || "não informado"}.
          Resultado observado: {playbook.observedResult == null ? "sem dados" : playbook.observedResult}.
        </Block>
        <Block title="Problema">{playbook.problem || "Sem dados"}</Block>
        <Block title="Contexto de origem">{playbook.scenario || "Sem dados"}</Block>
        <Block title="Como foi executado">{playbook.steps.length ? playbook.steps.join(" → ") : "Passos não informados."}</Block>
        <Block title="Investimento">{playbook.observedInvestment == null ? "Sem dados" : formatBRL(playbook.observedInvestment)}</Block>
        <Block title="KPIs">
          Principal: {playbook.primaryKpi || "Sem dados"}. Baseline {playbook.baseline ?? "sem dados"} · meta {playbook.target ?? "sem dados"}.
        </Block>
        <Block title="Resultado medido">{playbook.observedResultText || (playbook.observedResult == null ? "Sem dados" : String(playbook.observedResult))}</Block>
        <Block title="Evidências">
          {evidence ? `${evidence.title} — evidência da empresa de origem.` : "Nenhuma evidência vinculada. Sem evidência o registro não pode ser validado."}
        </Block>
        <Block title="Limitações">{playbook.limitations || "Sem dados"}</Block>
        <Block title="Memórias relacionadas">{memory ? memory.title : "Nenhuma memória vinculada."}</Block>

        <section className="surface-card p-5">
          <h2 className="m-0 text-[14px] font-bold">Aplicações</h2>
          {!applications.length ? (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{TRANSFER_EMPTY.applications}</p>
          ) : (
            <>
              <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr style={{ color: "var(--text-3)" }}>
                      <th className="pb-2">Empresa</th>
                      <th>Segmento</th>
                      <th>Status</th>
                      <th>Compatibilidade</th>
                      <th>Experimento</th>
                      <th>Evidência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1">{item.destinationName}</td>
                        <td>{item.destinationSegment || "Sem dados"}</td>
                        <td>{TRANSFER_STATUS_LABELS[item.status as TransferStatus] ?? item.status}</td>
                        <td>{item.compatibilityScore == null ? "Sem dados" : `${item.compatibilityScore}/100${item.scorePartial ? " parcial" : ""}`}</td>
                        <td>{item.experimentId ? "Sim" : "Não"}</td>
                        <td>{item.resultingEvidenceId ? "Local" : TRANSFER_EMPTY.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid gap-2 md:hidden">
                {applications.map((item) => (
                  <article key={item.id} className="rounded-xl border p-3 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                    <p className="font-bold" style={{ color: "var(--text-1)" }}>{item.destinationName}</p>
                    <p>{item.destinationSegment || "Sem dados"} · {TRANSFER_STATUS_LABELS[item.status as TransferStatus] ?? item.status}</p>
                    <p>Compatibilidade: {item.compatibilityScore == null ? "Sem dados" : `${item.compatibilityScore}/100`}</p>
                    <p>Evidência: {item.resultingEvidenceId ? "Local" : TRANSFER_EMPTY.evidence}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Na origem: {transfer.origin}. No destino: {transfer.destination}. Evidência de A não vira evidência de B.
        </p>

        {applying ? (
          <PlaybookTransferPanel
            playbook={playbook}
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            fit={fit}
            proposal={proposal}
            workspace={workspace}
            warning={query.aviso === "1"}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {playbook.status === "RASCUNHO" ? (
            <form action={submitPlaybookAction.bind(null, playbook.id)}>
              <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>Enviar para revisão</button>
            </form>
          ) : null}
          {playbook.status !== "VALIDADO" && playbook.status !== "ARQUIVADO" ? (
            <ConfirmForm action={approvePlaybookAction} hidden={{ playbookId: playbook.id }} label="Validar registro" message="Validar o registro deste aprendizado? Isso não garante resultado em outra empresa." />
          ) : null}
          <Link href={`/playbooks/${playbook.id}?aplicar=1`} className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
            Testar em outra empresa
          </Link>
          <ConfirmForm action={archivePlaybookAction} hidden={{ playbookId: playbook.id }} label="Arquivar" message="Arquivar este playbook?" tone="neutral" />
        </div>
        <Link href="/playbooks" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>Voltar à biblioteca</Link>
      </div>
    </AppShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="m-0 text-[14px] font-bold">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>{children}</p>
    </section>
  );
}

function Coverage({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
      <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="mt-1 text-[16px] font-extrabold">{value}</p>
    </div>
  );
}
