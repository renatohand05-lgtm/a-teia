import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DreForm } from "@/components/companies/DreForm";
import { FinancialNav, moneyOrMissing } from "@/components/companies/FinancialNav";
import { requireOwnedCompany } from "@/lib/access";
import { parsePeriod } from "@/lib/period";
import { getFinancialDashboard } from "@/services/financialService";

export const dynamic = "force-dynamic";

export default async function DrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { id } = await params;
  const period = parsePeriod(await searchParams);
  const { userId, name, company } = await requireOwnedCompany(id);
  const dash = await getFinancialDashboard(userId, id, period);
  if (!dash) return null;

  return (
    <AppShell title="DRE gerencial" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={`/empresas/${id}/financeiro`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Resultado financeiro
        </Link>
        <FinancialNav companyId={id} period={period} current="dre" />
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Receita líquida" value={moneyOrMissing(dash.dre.netRevenue)} />
          <Mini label="Margem bruta" value={moneyOrMissing(dash.dre.grossMargin)} />
          <Mini label="EBITDA" value={moneyOrMissing(dash.dre.ebitda)} />
          <Mini label="Custos fixos" value={moneyOrMissing(dash.dre.fixedCosts, true)} />
        </section>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <DreForm companyId={id} period={period} values={dash.dre.input} notes={dash.notes} />
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
