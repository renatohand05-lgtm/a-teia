import Link from "next/link";
import { createDiagnosisAction } from "@/app/empresas/diagnostic-actions";
import { DiagnosticForm } from "@/components/companies/DiagnosticForm";
import { DiagnosticResult } from "@/components/companies/DiagnosticResult";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/States";
import { requireOwnedCompany } from "@/lib/access";
import { formatDateBR } from "@/lib/format";
import { getDiagnosis, listDiagnoses } from "@/services/diagnosisService";

export const dynamic = "force-dynamic";

export default async function DiagnosticoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { userId, name, company } = await requireOwnedCompany(id);
  const history = await listDiagnoses(userId, id);
  const saved = query.salvo
    ? (history.find((item) => item.id === query.salvo) ?? (await getDiagnosis(userId, id, query.salvo)))
    : (history[0] ?? null);
  const chronological = history.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const previous = saved
    ? chronological[chronological.findIndex((item) => item.id === saved.id) - 1] ?? null
    : null;
  const bound = createDiagnosisAction.bind(null, company.id);

  return (
    <AppShell title="Diagnóstico 360°" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${company.id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Voltar à empresa
          </Link>
          {history.length > 1 ? (
            <Link href={`/empresas/${company.id}/diagnostico/historico`} className="text-[12px] font-bold" style={{ color: "var(--text-2)" }}>
              Ver histórico
            </Link>
          ) : null}
        </div>

        {history.length > 1 ? (
          <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Histórico de diagnósticos">
            {history
              .slice()
              .reverse()
              .map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/empresas/${company.id}/diagnostico?salvo=${item.id}`}
                    className="block shrink-0 rounded-xl border px-3 py-2 text-[12px]"
                    style={{ borderColor: item.id === saved?.id ? "rgba(232,191,122,.45)" : "var(--border)" }}
                  >
                    {formatDateBR(item.createdAt)} · {item.overallScore}
                  </Link>
                </li>
              ))}
          </ol>
        ) : null}

        {saved ? (
          <DiagnosticResult diagnosis={saved} previous={previous} companyId={company.id} />
        ) : (
          <EmptyState
            title="Nenhum Diagnóstico 360° realizado."
            body="Avalie as 10 dimensões para localizar o gargalo e decidir o próximo movimento."
            action={
              <a href="#realizar-diagnostico" className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                Realizar Diagnóstico 360°
              </a>
            }
          />
        )}

        <section>
          <h2 className="mb-2 text-[18px] font-bold">{saved ? "Novo diagnóstico" : "Realizar diagnóstico"}</h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-2)" }}>
            Cada salvamento cria um registro. O anterior permanece.
          </p>
          <DiagnosticForm action={bound} />
        </section>
      </div>
    </AppShell>
  );
}
