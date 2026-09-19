import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  MemoryConfidenceBadge,
  MemoryFamilyBadge,
  MemoryOriginBadge,
  MemoryPolarityBadge,
  MemoryStatusBadge,
} from "@/components/companies/MemoryBadges";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL } from "@/lib/format";
import { calculateTransferability, detectConflictingMemories, familyLabel } from "@/lib/memory-engine";
import { displayMemoryConfidence, memoryValidationLabel, transferabilityCopy } from "@/lib/memory-ui";
import { approveMemoryAction, rejectMemoryAction } from "@/app/empresas/memory-actions";
import { getMemory, listOwnerMemories } from "@/services/memoryService";

export const dynamic = "force-dynamic";

export default async function MemoriaDetalhePage({
  params,
}: {
  params: Promise<{ id: string; memoryId: string }>;
}) {
  const { id, memoryId } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const memory = await getMemory(userId, memoryId, id);
  if (!memory) redirect(`/empresas/${id}/memoria`);

  const others = await listOwnerMemories(userId, { status: "APPROVED" });
  const conflicts = detectConflictingMemories([memory, ...others.filter((item) => item.id !== memory.id)]);
  const reusable = others
    .filter((item) => item.id !== memory.id && item.companyId && item.companyId !== id)
    .map((item) => ({
      item,
      transfer: calculateTransferability({
        source: {
          companyId: memory.companyId,
          segment: memory.segment,
          family: memory.family,
          kpi: memory.kpi,
          opportunityId: memory.opportunityId,
          teamSize: company.teamSize,
          units: company.units,
        },
        target: {
          companyId: item.companyId,
          segment: item.segment,
          family: item.family,
          kpi: item.kpi,
          opportunityId: item.opportunityId,
          teamSize: null,
          units: null,
        },
        evidenceQuality: memory.classification,
      }),
    }))
    .filter((entry) => entry.transfer.score >= 40)
    .slice(0, 6);

  return (
    <AppShell title="Aprendizado" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href={`/empresas/${id}/memoria`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Memória da empresa
        </Link>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex flex-wrap gap-2">
            <MemoryStatusBadge status={memory.status} />
            <MemoryOriginBadge origin={memory.origin} />
            <MemoryPolarityBadge polarity={memory.polarity} />
            <MemoryConfidenceBadge confidence={memory.confidence} />
            <MemoryFamilyBadge family={memory.family} />
          </div>
          <h1 className="mt-4 text-2xl font-black">{memory.title}</h1>
          <p className="mt-2 text-[12px]" style={{ color: "var(--gold-soft)" }}>
            {memoryValidationLabel(memory.validated, memory.origin)}
          </p>
        </section>

        <Block title="O que aprendemos" body={memory.lesson} />
        <Block title="Por que aprendemos" body={memory.explanation} />
        <Block title="Contexto" body={memory.context} />
        <Block title="Limitações" body={memory.limitations} />
        <Block title="Condições" body={memory.conditions} />

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="KPI" value={memory.kpi ?? "Não informado"} />
          <Mini label="Baseline" value={memory.baseline != null ? String(memory.baseline) : "Não informado"} />
          <Mini label="Meta" value={memory.target != null ? String(memory.target) : "Não informada"} />
          <Mini label="Resultado" value={memory.measuredResult != null ? String(memory.measuredResult) : "Não medido"} />
          <Mini label="Investimento" value={formatBRL(memory.investment)} />
          <Mini label="Segmento" value={memory.segment ?? "Não informado"} />
          <Mini label="Família" value={familyLabel(memory.family)} />
          <Mini label="Confiança" value={displayMemoryConfidence(memory.confidence)} />
        </section>

        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-[16px] font-black">Rastreabilidade</h2>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
            {memory.evidenceId ? `Evidência ${memory.evidenceId}` : "Sem evidência — observação/lição manual."}
          </p>
          {memory.experimentId ? (
            <p className="mt-1 text-[13px]">
              Experimento de origem:{" "}
              <Link href={`/empresas/${id}/experimentos/${memory.experimentId}`} style={{ color: "var(--gold-soft)" }}>
                {memory.experimentTitle ?? memory.experimentId}
              </Link>
            </p>
          ) : null}
          {memory.opportunityId ? (
            <p className="mt-1 text-[13px]">
              Oportunidade:{" "}
              <Link href={`/empresas/${id}/oportunidades/${memory.opportunityId}`} style={{ color: "var(--gold-soft)" }}>
                {memory.opportunityTitle ?? memory.opportunityId}
              </Link>
            </p>
          ) : null}
          {memory.hypothesis ? <p className="mt-2 text-[13px]" style={{ color: "var(--text-3)" }}>Hipótese: {memory.hypothesis}</p> : null}
          {memory.approvedAt ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
              Aprovado por {memory.approvedByName ?? "owner"} em {new Intl.DateTimeFormat("pt-BR").format(new Date(memory.approvedAt))}
            </p>
          ) : null}
        </section>

        {conflicts.length > 0 ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[16px] font-black">Evidências divergentes</h2>
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Existem aprendizados contraditórios no mesmo mecanismo/KPI. Ambos os contextos são preservados.
            </p>
          </section>
        ) : null}

        <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-[16px] font-black">Onde pode ser reutilizado</h2>
          <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>
            {transferabilityCopy(false).title} {transferabilityCopy(false).warning}
          </p>
          {reusable.length === 0 ? (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>Nenhum contexto transversal evidente com os dados persistidos.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {reusable.map(({ item, transfer }) => (
                <div key={item.id} className="rounded-xl border p-3 text-[13px]" style={{ borderColor: "var(--border)" }}>
                  <div className="font-bold">{item.companyName} · {item.title}</div>
                  <div style={{ color: "var(--text-3)" }}>{transfer.label} · {transfer.warning}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {memory.status === "PROPOSED" ? (
          <div className="flex flex-wrap gap-2">
            <form action={approveMemoryAction}>
              <input type="hidden" name="companyId" value={id} />
              <input type="hidden" name="memoryId" value={memory.id} />
              <button className="rounded-xl px-4 py-3 text-[12px] font-black" style={{ background: "var(--gold)", color: "#111" }}>
                Aprovar aprendizado
              </button>
            </form>
            <form action={rejectMemoryAction}>
              <input type="hidden" name="companyId" value={id} />
              <input type="hidden" name="memoryId" value={memory.id} />
              <button className="rounded-xl border px-4 py-3 text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                Rejeitar
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Block({ title, body }: { title: string; body: string | null }) {
  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="text-[16px] font-black">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>{body || "Não informado."}</p>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-1 text-[13px] font-bold">{value}</div>
    </div>
  );
}
