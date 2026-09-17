import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { OpportunityForm } from "@/components/companies/OpportunityForm";
import { updateOpportunityAction } from "@/app/empresas/opportunity-actions";
import { requireOwnedCompany } from "@/lib/access";
import { getOpportunity } from "@/services/opportunityService";

export const dynamic = "force-dynamic";

export default async function EditarOportunidadePage({
  params,
}: {
  params: Promise<{ id: string; opportunityId: string }>;
}) {
  const { id, opportunityId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const opportunity = await getOpportunity(userId, id, opportunityId);
  if (!opportunity) redirect(`/empresas/${company.id}/oportunidades`);
  const bound = updateOpportunityAction.bind(null, company.id, opportunity.id);

  return (
    <AppShell title="Editar oportunidade" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href={`/empresas/${company.id}/oportunidades/${opportunity.id}`}
          className="text-[12px] font-bold"
          style={{ color: "var(--gold-soft)" }}
        >
          ← Voltar ao detalhe
        </Link>
        <OpportunityForm
          action={bound}
          opportunity={opportunity}
          diagnosisId={opportunity.diagnosisId}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
