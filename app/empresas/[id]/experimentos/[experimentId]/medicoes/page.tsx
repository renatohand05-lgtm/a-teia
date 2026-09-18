import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MeasurementForm } from "@/components/companies/MeasurementForm";
import { requireOwnedCompany } from "@/lib/access";
import { getExperiment } from "@/services/experimentService";

export const dynamic = "force-dynamic";

export default async function MedicoesPage({ params }: { params: Promise<{ id: string; experimentId: string }> }) {
  const { id, experimentId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const experiment = await getExperiment(userId, id, experimentId);
  if (!experiment) redirect(`/empresas/${id}/experimentos`);
  const measurements = experiment.measurements.filter((item) => item.outcome === "MEASUREMENT");

  return (
    <AppShell title="Medições" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={`/empresas/${id}/experimentos/${experimentId}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Voltar ao experimento
        </Link>
        <h1 className="text-xl font-black">{experiment.title}</h1>
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Cada medição vira uma linha nova. Nada é sobrescrito.</p>
        {measurements.map((item) => (
          <div key={item.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="font-bold">{item.measuredValue}</div>
            <div className="text-[12px]" style={{ color: "var(--text-3)" }}>
              {new Intl.DateTimeFormat("pt-BR").format(new Date(item.recordedAt))}
              {item.notes ? ` · ${item.notes}` : ""}
            </div>
          </div>
        ))}
        {experiment.status === "RUNNING" ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <MeasurementForm companyId={id} experimentId={experiment.id} />
          </section>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Medições só entram enquanto o experimento está em teste.</p>
        )}
      </div>
    </AppShell>
  );
}
