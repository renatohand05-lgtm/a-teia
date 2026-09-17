import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { GenerateOpportunitiesForm } from "@/components/companies/GenerateOpportunitiesForm";
import { generateOpportunitiesAction } from "@/app/empresas/opportunity-actions";
import { requireOwnedCompany } from "@/lib/access";
import { getLatestDiagnosis, getDiagnosis } from "@/services/diagnosisService";
import { listSuggestionGroups } from "@/services/opportunityService";

export const dynamic = "force-dynamic";

export default async function GerarOportunidadesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ diagnostico?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const diagnosis = query.diagnostico
    ? await getDiagnosis(userId, id, query.diagnostico)
    : await getLatestDiagnosis(userId, id);

  if (!diagnosis) {
    return (
      <AppShell title="Gerar oportunidades" subtitle={company.name} userName={name}>
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href={`/empresas/${company.id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Voltar à empresa
          </Link>
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            Salve um Diagnóstico 360° antes de gerar hipóteses. Sem diagnóstico não há gargalo medido.
          </p>
          <Link href={`/empresas/${company.id}/diagnostico`} className="text-[13px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Realizar diagnóstico
          </Link>
        </div>
      </AppShell>
    );
  }

  const groups = await listSuggestionGroups(userId, id, diagnosis.id);
  const bound = generateOpportunitiesAction.bind(null, company.id);

  return (
    <AppShell title="Gerar oportunidades" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href={`/empresas/${company.id}/oportunidades`}
          className="text-[12px] font-bold"
          style={{ color: "var(--gold-soft)" }}
        >
          ← Voltar ao ranking
        </Link>
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          Diagnóstico {diagnosis.overallScore}/100 · {diagnosis.maturity}. Gargalo: {diagnosis.bottleneck}.
        </p>
        <GenerateOpportunitiesForm diagnosisId={diagnosis.id} groups={groups} action={bound} />
      </div>
    </AppShell>
  );
}
