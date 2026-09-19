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
        <FinancialNav companyId={id} period={period} current="dre" availablePeriods={dash.availablePeriods} />
        <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-[13px] font-bold">DRE da competência</p>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            <Line label="Faturamento bruto" value={moneyOrMissing(dash.dre.grossRevenue, dash.dre.informed.grossRevenue)} />
            <Line label="(−) Deduções / impostos" value={moneyOrMissing(dash.dre.deductions, dash.dre.informed.deductions)} />
            <Line label="= Receita líquida" value={moneyOrMissing(dash.dre.netRevenue)} strong />
            <Line label="(−) CMV" value={moneyOrMissing(dash.dre.cogs, dash.dre.informed.cogs)} />
            <Line label="= Margem bruta" value={moneyOrMissing(dash.dre.grossMargin)} strong />
            <Line label="(−) Folha" value={moneyOrMissing(dash.dre.input.payroll, dash.dre.informed.payroll)} />
            <Line label="(−) Despesas operacionais" value={moneyOrMissing(dash.dre.operatingCosts, true)} />
            <Line label="= EBITDA" value={moneyOrMissing(dash.dre.ebitda)} strong />
          </ul>
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
            EBITDA não é caixa. Campo vazio permanece sem dado; zero só entra se você registrar zero.
          </p>
        </section>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <DreForm companyId={id} period={period} values={dash.dre.input} notes={dash.notes} />
        </section>
      </div>
    </AppShell>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex justify-between gap-3" style={{ fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: "var(--text-2)" }}>{label}</span>
      <span>{value}</span>
    </li>
  );
}
