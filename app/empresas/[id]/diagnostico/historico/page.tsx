import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/States";
import { requireOwnedCompany } from "@/lib/access";
import { formatDateBR } from "@/lib/format";
import { listDiagnoses } from "@/services/diagnosisService";

export const dynamic = "force-dynamic";

export default async function HistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, name, company } = await requireOwnedCompany(id);
  const history = await listDiagnoses(userId, id);

  return (
    <AppShell title="Histórico 360°" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href={`/empresas/${company.id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Voltar à empresa
        </Link>
        {history.length ? (
          <div className="space-y-3">
            {history.map((item, index) => (
              <Link
                key={item.id}
                href={`/empresas/${company.id}/diagnostico?salvo=${item.id}`}
                className="surface-card flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                    Diagnóstico {String(history.length - index).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[18px] font-bold">
                    {item.overallScore}/100 · {item.maturity}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                    Gargalo: {item.bottleneck}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {formatDateBR(item.createdAt)}
                  </p>
                </div>
                <span className="text-[28px] font-black" style={{ color: "var(--gold-soft)" }}>
                  {item.overallScore}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum diagnóstico ainda"
            body="Nenhum diagnóstico realizado. O histórico aparece quando você salvar o primeiro 360°."
            action={
              <Link href={`/empresas/${company.id}/diagnostico`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                Realizar diagnóstico
              </Link>
            }
          />
        )}
      </div>
    </AppShell>
  );
}
