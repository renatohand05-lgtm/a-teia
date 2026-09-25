import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApplicationDetailView } from "@/components/applications/ApplicationDetail";
import { AppShell } from "@/components/layout/AppShell";
import { buildOperationalTimeline } from "@/lib/application-center";
import { getApplicationAudit, getPlaybookApplicationWorkspace } from "@/services/playbookService";

export const dynamic = "force-dynamic";

export default async function AplicacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  try {
    const [workspace, audit] = await Promise.all([
      getPlaybookApplicationWorkspace(session.user.id, id),
      getApplicationAudit(session.user.id, id),
    ]);
    const steps = buildOperationalTimeline({
      proposedAt: workspace.application.proposedAt,
      scored: workspace.application.compatibilityScore != null,
      reviewedAt: workspace.application.reviewedAt,
      decisionId: workspace.application.decisionId,
      approved: ["APROVADA", "PLANEJADA", "EM_TESTE", "MEDIDA", "CONCLUIDA"].includes(workspace.application.status),
      actionPlanId: workspace.application.actionPlanId,
      experimentId: workspace.application.experimentId,
      experimentStarted: Boolean(workspace.destExperiment?.startedAt || workspace.destExperiment?.status === "RUNNING"),
      resultingEvidenceId: workspace.application.resultingEvidenceId,
      resultingMemoryId: workspace.application.resultingMemoryId,
      memoryApproved: Boolean(workspace.memoryValidated || workspace.memoryStatus === "APPROVED"),
      completedAt: workspace.application.completedAt,
    });
    return (
      <AppShell title="Aplicação" subtitle={workspace.application.destinationName} userName={session.user.name}>
        <ApplicationDetailView workspace={workspace} steps={steps} audit={audit} />
      </AppShell>
    );
  } catch {
    notFound();
  }
}
