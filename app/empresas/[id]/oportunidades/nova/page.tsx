import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OpportunityForm } from "@/components/companies/OpportunityForm";
import { createOpportunityAction } from "@/app/empresas/opportunity-actions";
import { requireOwnedCompany } from "@/lib/access";
import { getLatestDiagnosis } from "@/services/diagnosisService";

export const dynamic = "force-dynamic";

export default async function NovaOportunidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const latest = await getLatestDiagnosis(userId, id);
  const bound = createOpportunityAction.bind(null, company.id);

  return (
    <AppShell title="Nova oportunidade" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href={`/empresas/${company.id}/oportunidades`}
          className="text-[12px] font-bold"
          style={{ color: "var(--gold-soft)" }}
        >
          ← Voltar ao ranking
        </Link>
        <OpportunityForm action={bound} diagnosisId={latest?.id} submitLabel="Salvar hipótese" />
      </div>
    </AppShell>
  );
}
