import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialNav, moneyOrMissing, percentOrMissing } from "@/components/companies/FinancialNav";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL, formatPercent } from "@/lib/format";
import { parsePeriod, periodLabel } from "@/lib/period";
import { getFinancialDashboard } from "@/services/financialService";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
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

  const gap = dash.comparisons.revenue.difference;
  const hasHistory = dash.history.filter((item) => item.revenue != null).length >= 2;
  const maxRevenue = Math.max(...dash.history.map((item) => item.revenue ?? 0), 1);

  return (
    <AppShell title="Financeiro" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
          ← Central da empresa
        </Link>
        <FinancialNav companyId={id} period={period} current="resultado" />

        <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
          <div className="text-[11px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>
            Resultado · {periodLabel(period)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Faturamento" value={moneyOrMissing(dash.dre.grossRevenue, dash.dre.informed.grossRevenue)} />
            <Stat label="Receita líquida" value={moneyOrMissing(dash.dre.netRevenue)} />
            <Stat label="EBITDA" value={moneyOrMissing(dash.dre.ebitda)} />
            <Stat label="EBITDA %" value={percentOrMissing(dash.ratios.ebitdaPercent)} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="CMV %" value={percentOrMissing(dash.ratios.cogsPercent)} />
          <Stat label="Margem bruta %" value={percentOrMissing(dash.ratios.grossMarginPercent)} />
          <Stat label="Folha %" value={percentOrMissing(dash.ratios.payrollPercent)} />
          <Stat
            label="Ponto de equilíbrio"
            value={dash.breakEven.value != null ? formatBRL(dash.breakEven.value) : "Sem dado suficiente"}
          />
        </section>
        {dash.breakEven.value == null && dash.breakEven.missing.length > 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
            Ponto de equilíbrio indisponível: {dash.breakEven.missing.join(", ")}.
          </p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <Stat label="Meta de faturamento" value={moneyOrMissing(dash.goals.revenueTarget)} />
          <Stat
            label="Gap para meta"
            value={gap == null ? "Sem meta ou receita" : `${gap >= 0 ? "+" : ""}${formatBRL(gap)}`}
          />
          <Stat label="Resultado projetado" value={moneyOrMissing(dash.dre.ebitda)} />
          <Stat label="Caixa do mês" value={formatBRL(dash.cashMonth.operatingBalance)} />
        </section>

        {dash.previous ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[15px] font-black">Mês atual vs mês anterior</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Compare label="Receita" current={dash.dre.grossRevenue} previous={dash.previous.revenue} money />
              <Compare label="CMV %" current={dash.ratios.cogsPercent} previous={dash.previous.cogsPercent} />
              <Compare label="EBITDA" current={dash.dre.ebitda} previous={dash.previous.ebitda} money />
              <Compare label="EBITDA %" current={dash.ratios.ebitdaPercent} previous={dash.previous.ebitdaPercent} />
            </div>
          </section>
        ) : null}

        {hasHistory ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[15px] font-black">Histórico mensal</h2>
            <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-2">
              {dash.history.map((item) => (
                <div key={`${item.periodYear}-${item.periodMonth}`} className="min-w-14 text-center">
                  <div
                    className="mx-auto w-8 rounded-t-md"
                    style={{
                      height: `${Math.max(8, ((item.revenue ?? 0) / maxRevenue) * 120)}px`,
                      background: "linear-gradient(180deg, var(--gold-soft), var(--gold-deep))",
                    }}
                  />
                  <div className="mt-2 text-[10px]" style={{ color: "var(--text-3)" }}>
                    {periodLabel(item)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead style={{ color: "var(--text-3)" }}>
                  <tr>
                    <th className="pb-2 font-medium">Mês</th>
                    <th className="pb-2 font-medium">Receita</th>
                    <th className="pb-2 font-medium">CMV %</th>
                    <th className="pb-2 font-medium">Folha %</th>
                    <th className="pb-2 font-medium">EBITDA</th>
                    <th className="pb-2 font-medium">EBITDA %</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.history.map((item) => (
                    <tr key={`row-${item.periodYear}-${item.periodMonth}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2">{periodLabel(item)}</td>
                      <td>{moneyOrMissing(item.revenue)}</td>
                      <td>{percentOrMissing(item.cogsPercent)}</td>
                      <td>{percentOrMissing(item.payrollPercent)}</td>
                      <td>{moneyOrMissing(item.ebitda)}</td>
                      <td>{percentOrMissing(item.ebitdaPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
            Gráfico mensal só aparece com pelo menos dois meses de DRE informado.
          </p>
        )}

        {dash.insights.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[15px] font-black">Diagnóstico financeiro</h2>
            {dash.insights.map((step) => (
              <div key={`${step.kind}-${step.title}`} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <RiskBadge label={step.kind} tone={step.kind === "DADO" ? "neutral" : step.kind === "HIPÓTESE" ? "warn" : "good"} />
                <div className="mt-2 font-bold">{step.title}</div>
                <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>{step.body}</p>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-[10px] uppercase tracking-[.14em]" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-2 text-[18px] font-black">{value}</div>
    </div>
  );
}

function Compare({
  label,
  current,
  previous,
  money = false,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  money?: boolean;
}) {
  const fmt = (value: number | null) => {
    if (value == null) return "—";
    return money ? formatBRL(value) : formatPercent(value);
  };
  const delta = current != null && previous != null ? current - previous : null;
  return (
    <div>
      <div className="text-[10px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-1 font-bold">{fmt(current)}</div>
      <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
        anterior {fmt(previous)}
        {delta != null ? ` · Δ ${money ? formatBRL(delta) : formatPercent(delta)}` : ""}
      </div>
    </div>
  );
}
