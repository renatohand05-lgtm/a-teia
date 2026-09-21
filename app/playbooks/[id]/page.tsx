import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approvePlaybookAction,
  archivePlaybookAction,
  confirmPlaybookApplicationAction,
  proposePlaybookApplicationAction,
  rejectPlaybookApplicationAction,
  submitPlaybookAction,
} from "@/app/playbooks/actions";
import { ConfirmForm } from "@/components/connections/ConfirmForm";
import { AppShell } from "@/components/layout/AppShell";
import { formatBRL } from "@/lib/format";
import {
  VALIDATED_PLAYBOOK_COPY,
  displayCompatibilityScore,
  playbookFamilyLabel,
  playbookStatusLabel,
  transferClassification,
} from "@/lib/playbook-engine";
import { analyzePlaybookFit, getPlaybookDetail } from "@/services/playbookService";

export const dynamic = "force-dynamic";

export default async function PlaybookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ aplicar?: string; empresa?: string; proposta?: string; aviso?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const query = (await searchParams) ?? {};
  let detail;
  try {
    detail = await getPlaybookDetail(session.user.id, id);
  } catch {
    notFound();
  }
  const { playbook, applications, evidence, memory, companies } = detail;
  const applying = query.aplicar === "1";
  const selectedCompanyId = query.empresa && query.empresa !== playbook.originCompanyId ? query.empresa : "";
  const fit = selectedCompanyId ? await analyzePlaybookFit(session.user.id, playbook.id, selectedCompanyId) : null;
  const proposal = applications.find((item) => item.id === query.proposta) ?? applications.find((item) => item.destinationCompanyId === selectedCompanyId && item.status === "PROPOSTA");
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
        <Block title="Empresas compatíveis">
          Compatibilidade é prioridade para teste, não chance de sucesso. {playbook.recommendedAdaptations}
        </Block>
        <Block title="Aplicações">
          {applications.length
            ? applications.map((item) => `${item.destinationName} · ${item.status} · ${item.classification === "HYPOTHESIS" ? "hipótese no destino" : item.classification}`).join(" | ")
            : "Nenhuma aplicação ainda."}
        </Block>
        <Block title="Fontes">
          Internas: origem, evidência e memória da carteira. Fonte externa, se houver, permanece fonte externa.
        </Block>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Na origem: {transfer.origin}. No destino: {transfer.destination}. Evidência de A não vira evidência de B.
        </p>

        {applying ? (
          <section className="surface-card space-y-4 p-5">
            <h2 className="m-0 text-[16px] font-bold">Testar em outra empresa</h2>
            {query.aviso === "1" ? (
              <p className="text-[13px]" style={{ color: "var(--gold-soft)" }}>Este playbook já está sendo avaliado nesta empresa.</p>
            ) : null}
            <form action={proposePlaybookApplicationAction} className="grid gap-3 text-[13px]">
              <input type="hidden" name="playbookId" value={playbook.id} />
              <label>
                Empresa destino
                <select name="companyId" defaultValue={selectedCompanyId} required className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
                  <option value="">Selecionar</option>
                  {companies.filter((item) => item.id !== playbook.originCompanyId).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                KPI
                <input name="kpi" defaultValue={playbook.primaryKpi ?? ""} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
              </label>
              <label>
                Prazo (dias)
                <input name="horizonDays" type="number" defaultValue={playbook.durationDays ?? 30} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
              </label>
              <label>
                Investimento
                <input name="investment" type="number" step="0.01" defaultValue={playbook.observedInvestment ?? ""} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} />
              </label>
              <label>
                Hipótese adaptada
                <textarea name="hypothesis" rows={3} className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }} defaultValue={`Possível reutilização em outra empresa. Permanece hipótese até o teste.`} />
              </label>
              <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
                Analisar e propor
              </button>
            </form>
            {fit ? (
              <div className="rounded-xl border p-4 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                <p>Score de compatibilidade: {displayCompatibilityScore(fit.score.score, fit.score.partial).value}</p>
                <p>{fit.score.caption}</p>
                <p>Fatores usados: {fit.score.factorsUsed.join(", ") || "nenhum"}</p>
                <p>Dados ausentes: {fit.score.factorsMissing.join(", ") || "nenhum crítico"}</p>
                <p>Favoráveis: {fit.score.favorable.join(" · ") || "—"}</p>
                <p>Contrários: {fit.score.contrary.join(" · ") || "—"}</p>
                <p>{fit.warning}</p>
              </div>
            ) : null}
            {proposal ? (
              <div className="flex flex-wrap gap-2">
                <ConfirmForm
                  action={confirmPlaybookApplicationAction}
                  hidden={{ applicationId: proposal.id, playbookId: playbook.id }}
                  label="Confirmar criação da oportunidade"
                  message="Criar oportunidade no destino? Ela nascerá como hipótese e não copiará evidência da origem."
                />
                <ConfirmForm
                  action={rejectPlaybookApplicationAction}
                  hidden={{ applicationId: proposal.id, playbookId: playbook.id }}
                  label="Rejeitar aplicação"
                  message="Rejeitar esta aplicação?"
                  tone="danger"
                />
              </div>
            ) : null}
          </section>
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
