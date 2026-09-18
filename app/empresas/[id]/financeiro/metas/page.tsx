import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialNav, moneyOrMissing, percentOrMissing } from "@/components/companies/FinancialNav";
import { GoalForm } from "@/components/companies/GoalForm";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { requireOwnedCompany } from "@/lib/access";
import { formatPercent } from "@/lib/format";
import { parsePeriod } from "@/lib/period";
import { getFinancialDashboard } from "@/services/financialService";
import type { TargetComparison } from "@/lib/financial-engine";

export const dynamic = "force-dynamic";

export default async function MetasPage({
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

  const rows: Array<[string, TargetComparison, boolean]> = [
    ["Faturamento", dash.comparisons.revenue, true],
    ["EBITDA", dash.comparisons.ebitda, true],
    ["EBITDA %", dash.comparisons.ebitdaPercent, false],
    ["CMV %", dash.comparisons.cogsPercent, false],
    ["Folha %", dash.comparisons.payrollPercent, false],
  ];

  return (
    <AppShell title="Metas financeiras" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={`/empresas/${id}/financeiro`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Resultado financeiro
        </Link>
        <FinancialNav companyId={id} period={period} current="metas" />
        <section className="space-y-3">
          {rows.map(([label, item, money]) => (
            <div key={label} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black">{label}</div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                    Realizado {fmt(item.actual, money)} · Meta {fmt(item.target, money)}
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                    Diferença {fmt(item.difference, money)}
                    {item.differencePercent != null ? ` · ${formatPercent(item.differencePercent)}` : ""}
                  </div>
                </div>
                {item.status ? (
                  <RiskBadge
                    label={item.status}
                    tone={item.status.includes("Atingiu") || item.status.includes("Dentro") ? "good" : "warn"}
                  />
                ) : (
                  <RiskBadge label="Sem comparação" />
                )}
              </div>
            </div>
          ))}
        </section>
        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <GoalForm companyId={id} period={period} goals={dash.goals} />
        </section>
      </div>
    </AppShell>
  );
}

function fmt(value: number | null, money: boolean): string {
  if (value == null) return "Sem dado informado";
  return money ? moneyOrMissing(value, true) : percentOrMissing(value);
}
