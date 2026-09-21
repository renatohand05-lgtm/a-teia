import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  approveConnectionAction,
  archiveConnectionAction,
  createStrategyFromConnectionAction,
  rejectConnectionAction,
  reviewConnectionAction,
} from "@/app/conexoes/actions";
import { ConfirmForm } from "@/components/connections/ConfirmForm";
import { AppShell } from "@/components/layout/AppShell";
import {
  connectionClassLabel,
  connectionStatusLabel,
  connectionTypeLabel,
  displayConnectionScore,
} from "@/lib/connection-engine";
import { getConnection, getConnectionRelated } from "@/services/connectionService";
import { listRelatedPlaybooksForConnection } from "@/services/playbookService";

export const dynamic = "force-dynamic";

export default async function ConnectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  let connection;
  try {
    connection = await getConnection(session.user.id, id);
  } catch {
    notFound();
  }
  const related = await getConnectionRelated(session.user.id, connection);
  const playbooks = await listRelatedPlaybooksForConnection(session.user.id, {
    fromId: connection.fromId,
    toId: connection.toId,
    fromSegment: connection.fromSegment,
    toSegment: connection.toSegment,
    type: connection.type,
  });
  const score = displayConnectionScore(connection.score, connection.scorePartial);
  const destEvidence = related.evidence.filter((item) => item.companyId === connection.toId);
  const originEvidence = related.evidence.filter((item) => item.companyId === connection.fromId);

  return (
    <AppShell title="Conexão" subtitle={`${connection.fromName} → ${connection.toName}`} userName={session.user.name}>
      <div className="mx-auto max-w-[980px] space-y-6">
        <section className="surface-card p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: "var(--gold-soft)" }}>Resumo</p>
          <h1 className="mt-2 text-[24px] font-extrabold">{connectionTypeLabel(connection.type)}</h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            {connectionStatusLabel(connection.status)} · {connectionClassLabel(connection.classification)} · score {score.value}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>{score.caption}</p>
        </section>

        <Block title="Por que esta conexão existe">{connection.hypothesis}</Block>
        <Block title="Dados utilizados">{connection.usedCompanyFields.join(", ") || "Sem dados suficientes."}</Block>
        <Block title="Inferências">{connection.justification}</Block>
        <Block title="Evidências">
          Origem: {originEvidence.length ? originEvidence.map((item) => item.title).join(" · ") : "Nenhuma."}
          {" "}Destino: {destEvidence.length ? destEvidence.map((item) => item.title).join(" · ") : "nenhuma no destino."}
          {" "}Evidência de A não vira evidência de B.
        </Block>
        <Block title="Memórias relacionadas">
          {related.memories.length
            ? related.memories.map((item) => `${item.title} — hipótese no destino${item.limitations ? ` · ${item.limitations}` : ""}`).join(" | ")
            : "Nenhuma memória vinculada."}
        </Block>
        <Block title="Fontes externas">
          {related.external.length
            ? related.external.map((item) => item.question).join(" · ") + " — fonte externa, não evidência interna."
            : "Nenhuma fonte externa nesta conexão."}
        </Block>
        <Block title="Limitações">{connection.limitations}</Block>
        <Block title="Playbooks relacionados">
          {playbooks.length
            ? playbooks.map((item) => `${item.title} — ${item.label}`).join(" | ")
            : "Nenhum playbook relacionado persistido."}
        </Block>
        <Block title="Estratégias possíveis">Criar uma estratégia estruturada permanece hipótese até o teste.</Block>
        <Block title="Próxima ação">{connection.nextAction}</Block>

        <div className="flex flex-wrap gap-2">
          <form action={reviewConnectionAction.bind(null, connection.id)}>
            <button type="submit" className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
              Revisar
            </button>
          </form>
          <ConfirmForm action={approveConnectionAction} hidden={{ connectionId: connection.id }} label="Aprovar" message="Aprovar esta conexão como hipótese operacional? Isso não a transforma em evidência." />
          <ConfirmForm action={rejectConnectionAction} hidden={{ connectionId: connection.id }} label="Rejeitar" message="Rejeitar esta conexão?" tone="danger" />
          <ConfirmForm action={createStrategyFromConnectionAction} hidden={{ connectionId: connection.id }} label="Criar estratégia" message="Criar uma estratégia a partir desta conexão? Ela nascerá como hipótese." />
          <ConfirmForm action={archiveConnectionAction} hidden={{ connectionId: connection.id }} label="Arquivar" message="Arquivar esta conexão?" tone="neutral" />
        </div>
        <Link href="/conexoes" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>Voltar ao mapa</Link>
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
