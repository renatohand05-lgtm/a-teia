import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryObservationForm } from "@/components/companies/MemoryObservationForm";
import { requireOwnedCompany } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function NovaObservacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, company } = await requireOwnedCompany(id);

  return (
    <AppShell title="Nova observação" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={`/empresas/${id}/memoria`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Memória da empresa
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h1 className="text-2xl font-black">Registrar observação</h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            Observação não substitui evidência. Não influencia ranking automaticamente.
          </p>
          <div className="mt-5">
            <MemoryObservationForm companyId={id} segment={company.segment} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
