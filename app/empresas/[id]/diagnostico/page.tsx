import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DiagnosticForm } from "@/components/companies/DiagnosticForm";
import { DiagnosticResult } from "@/components/companies/DiagnosticResult";
import { createDiagnosisAction } from "@/app/empresas/diagnostic-actions";
import { requireOwnedCompany } from "@/lib/access";
import { getDiagnosis, getLatestDiagnosis } from "@/services/diagnosisService";

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

  const saved = query.salvo
    ? await getDiagnosis(userId, id, query.salvo)
    : await getLatestDiagnosis(userId, id);
  const bound = createDiagnosisAction.bind(null, company.id);

  return (
    <AppShell title="Diagnóstico 360°" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/empresas/${company.id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Voltar à empresa
          </Link>
          <Link
            href={`/empresas/${company.id}/diagnostico/historico`}
            className="text-[12px] font-bold"
            style={{ color: "var(--text-2)" }}
          >
            Ver histórico
          </Link>
        </div>

        {saved ? <DiagnosticResult diagnosis={saved} /> : null}

        {saved ? (
          <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Hipóteses de ação
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
                Gerar oportunidades a partir deste diagnóstico. Nada é criado sem a sua seleção.
              </p>
            </div>
            <Link
              href={`/empresas/${company.id}/oportunidades/gerar?diagnostico=${saved.id}`}
              className="rounded-xl px-4 py-2.5 text-[13px] font-extrabold text-[#241a08]"
              style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
            >
              Gerar oportunidades a partir deste diagnóstico
            </Link>
          </section>
        ) : null}

        <section>
          <h2 className="mb-2 text-[18px] font-bold">{saved ? "Novo diagnóstico" : "Realizar diagnóstico"}</h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-2)" }}>
            Cada salvamento cria um registro histórico. O anterior não é apagado.
          </p>
          <DiagnosticForm action={bound} />
        </section>
      </div>
    </AppShell>
  );
}
