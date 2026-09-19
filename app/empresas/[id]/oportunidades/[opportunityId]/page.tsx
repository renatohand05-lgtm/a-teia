import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { OpportunityDetail } from "@/components/companies/OpportunityDetail";
import { requireOwnedCompany } from "@/lib/access";
import { getOpportunity } from "@/services/opportunityService";
import { listExperiments } from "@/services/experimentService";
import { getOpportunityMemoryPreview } from "@/services/memoryService";
import { listOpportunityDecisions } from "@/services/decisionService";

export const dynamic = "force-dynamic";

export default async function OportunidadePage({
  params,
}: {
  params: Promise<{ id: string; opportunityId: string }>;
}) {
  const { id, opportunityId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const opportunity = await getOpportunity(userId, id, opportunityId);
  if (!opportunity) redirect(`/empresas/${company.id}/oportunidades`);
  const [experiments, decisions, memoryPreview] = await Promise.all([
    listExperiments(userId, id, { opportunityId }),
    listOpportunityDecisions(userId, id, opportunityId),
    getOpportunityMemoryPreview(userId, id, {
      id: opportunity.id,
      sourceDimension: opportunity.sourceDimension,
      priorityScore: opportunity.priorityScore,
    }),
  ]);

  return (
    <AppShell title="Oportunidade" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/empresas/${company.id}/oportunidades`}
          className="text-[12px] font-bold"
          style={{ color: "var(--gold-soft)" }}
        >
          ← Voltar ao ranking
        </Link>
        <OpportunityDetail
          companyId={company.id}
          opportunity={opportunity}
          experiments={experiments}
          decisions={decisions}
          relatedMemories={memoryPreview.related}
          scorePreview={memoryPreview.preview}
          memoryConflicts={memoryPreview.conflicts}
          repetition={memoryPreview.repetition}
        />
      </div>
    </AppShell>
  );
}
