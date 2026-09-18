import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ExperimentResultForm } from "@/components/companies/ExperimentResultForm";
import { requireOwnedCompany } from "@/lib/access";
import { getExperiment } from "@/services/experimentService";

export const dynamic = "force-dynamic";

export default async function ResultadoPage({ params }: { params: Promise<{ id: string; experimentId: string }> }) {
  const { id, experimentId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const experiment = await getExperiment(userId, id, experimentId);
  if (!experiment) redirect(`/empresas/${id}/experimentos`);

  return (
    <AppShell title="Resultado do experimento" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={`/empresas/${id}/experimentos/${experimentId}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Voltar ao experimento
        </Link>
        <h1 className="text-xl font-black">{experiment.title}</h1>
        {experiment.status === "RUNNING" ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <ExperimentResultForm companyId={id} experimentId={experiment.id} latestMeasurement={experiment.latestMeasurement} />
          </section>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            {experiment.status === "COMPLETED"
              ? experiment.classificationReason
              : "O resultado final só é registrado ao encerrar um teste em andamento."}
          </p>
        )}
      </div>
    </AppShell>
  );
}
