import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryProposeForm } from "@/components/companies/MemoryProposeForm";
import { requireOwnedCompany } from "@/lib/access";
import { previewMemoryFromEvidence } from "@/services/memoryService";

export const dynamic = "force-dynamic";

export default async function ProporMemoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ evidenceId?: string }>;
}) {
  const { id } = await params;
  const { evidenceId } = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  if (!evidenceId) redirect(`/empresas/${id}/experimentos`);

  let draft;
  try {
    draft = await previewMemoryFromEvidence(userId, id, evidenceId);
  } catch {
    redirect(`/empresas/${id}/experimentos`);
  }

  return (
    <AppShell title="Transformar em aprendizado" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={`/empresas/${id}/experimentos`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Experimentos
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h1 className="text-2xl font-black">Preview do aprendizado</h1>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            Confirme a proposta. A aprovação humana é um passo seguinte e separado.
          </p>
          {draft.hypothesis ? (
            <p className="mt-3 text-[13px]" style={{ color: "var(--text-3)" }}>Hipótese original: {draft.hypothesis}</p>
          ) : null}
          <div className="mt-5">
            <MemoryProposeForm companyId={id} evidenceId={evidenceId} draft={draft} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
