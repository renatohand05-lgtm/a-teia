import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CashFlowForm } from "@/components/companies/CashFlowForm";
import { FinancialNav } from "@/components/companies/FinancialNav";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL } from "@/lib/format";
import { parsePeriod } from "@/lib/period";
import { getFinancialDashboard, listCashEntries } from "@/services/financialService";

export const dynamic = "force-dynamic";

export default async function FluxoCaixaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { id } = await params;
  const period = parsePeriod(await searchParams);
  const { userId, name, company } = await requireOwnedCompany(id);
  const [dash, entries] = await Promise.all([
    getFinancialDashboard(userId, id, period),
    listCashEntries(userId, id, period),
  ]);
  if (!dash) return null;

  return (
    <AppShell title="Fluxo de caixa" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={`/empresas/${id}/financeiro`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Resultado financeiro
        </Link>
        <FinancialNav companyId={id} period={period} current="fluxo" />
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Entradas" value={formatBRL(dash.cashMonth.inflows)} />
          <Mini label="Saídas" value={formatBRL(dash.cashMonth.outflows)} />
          <Mini label="Saldo operacional" value={formatBRL(dash.cashMonth.operatingBalance)} />
          <Mini label="Saldo acumulado" value={formatBRL(dash.cashMonth.accumulatedBalance)} />
        </section>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="mb-4 text-[16px] font-black">Novo lançamento</h2>
          <CashFlowForm companyId={id} />
        </section>
        <section className="space-y-3">
          <h2 className="text-[16px] font-black">Lançamentos do mês</h2>
          {entries.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Nenhum lançamento nesta competência.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{entry.direction === "INFLOW" ? "Entrada" : "Saída"} · {entry.category}</div>
                    <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                      {new Intl.DateTimeFormat("pt-BR").format(new Date(entry.occurredAt))}
                      {entry.description ? ` · ${entry.description}` : ""}
                    </div>
                  </div>
                  <div className="font-black">{formatBRL(entry.amount)}</div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}
