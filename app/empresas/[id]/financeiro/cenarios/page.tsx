import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialNav, moneyOrMissing, percentOrMissing } from "@/components/companies/FinancialNav";
import { RequiredRevenueForm } from "@/components/companies/RequiredRevenueForm";
import { requireOwnedCompany } from "@/lib/access";
import { SCENARIO_MULTIPLIERS } from "@/lib/financial-engine";
import { contributionRatesFromDre } from "@/lib/financial-engine";
import { parsePeriod } from "@/lib/period";
import { getFinancialDashboard } from "@/services/financialService";

export const dynamic = "force-dynamic";

export default async function CenariosPage({
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
  const rates = contributionRatesFromDre(dash.dre);

  return (
    <AppShell title="Cenários" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href={`/empresas/${id}/financeiro`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Resultado financeiro
        </Link>
        <FinancialNav companyId={id} period={period} current="cenarios" />
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          Conservador {SCENARIO_MULTIPLIERS.CONSERVATIVE * 100}%, base {SCENARIO_MULTIPLIERS.BASE * 100}% e agressivo{" "}
          {SCENARIO_MULTIPLIERS.AGGRESSIVE * 100}% sobre a receita. Custos fixos não mudam. Variáveis acompanham a receita.
        </p>
        <section className="grid gap-3 md:grid-cols-3">
          {dash.scenarios.map((scenario) => (
            <div key={scenario.key} className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--gold-soft)" }}>
                {scenario.label} · {Math.round(scenario.multiplier * 100)}%
              </div>
              <div className="mt-4 space-y-2 text-[13px]">
                <Row label="Faturamento" value={moneyOrMissing(scenario.dre.grossRevenue)} />
                <Row label="CMV" value={moneyOrMissing(scenario.dre.cogs)} />
                <Row label="Margem bruta" value={moneyOrMissing(scenario.dre.grossMargin)} />
                <Row label="Custos" value={moneyOrMissing(scenario.dre.operatingCosts, true)} />
                <Row label="EBITDA" value={moneyOrMissing(scenario.dre.ebitda)} />
                <Row label="EBITDA %" value={percentOrMissing(scenario.ratios.ebitdaPercent)} />
                <Row label="Resultado final" value={moneyOrMissing(scenario.dre.ebitda)} />
              </div>
            </div>
          ))}
        </section>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="mb-4 text-[16px] font-black">Quanto preciso faturar?</h2>
          <RequiredRevenueForm
            defaults={{
              desiredProfit: dash.goals.ebitdaTarget,
              cogsPercent: dash.ratios.cogsPercent,
              taxPercent: rates.taxPercent,
              deliveryPercent: rates.deliveryPercent,
              otherVariablePercent: rates.otherVariablePercent,
              fixedCosts: dash.dre.fixedCosts,
            }}
          />
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
