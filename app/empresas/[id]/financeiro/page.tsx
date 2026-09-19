import Link from "next/link";
import { assistantHref } from "@/lib/assistant-ui";
import { contextualAssistantPrompt } from "@/lib/journey-ui";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialNav, moneyOrMissing, percentOrMissing } from "@/components/companies/FinancialNav";
import { CalculationHelp } from "@/components/ui/CalculationHelp";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/ui/States";
import { requireOwnedCompany } from "@/lib/access";
import { formatBRL, formatPercent } from "@/lib/format";
import { CALCULATION_HELP, displayMoney, dreCoverage, periodLongLabel, variation } from "@/lib/financial-ui";
import { parsePeriod, periodHref, periodLabel } from "@/lib/period";
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

  const coverage = dreCoverage(dash.dre);
  const gap = dash.comparisons.revenue.difference;
  const hasHistory = dash.history.filter((item) => item.revenue != null).length >= 2;
  const empty = !coverage.filled && !dash.cashMonth.hasMovements && !dash.goals.revenueTarget;

  return (
    <AppShell title="Financeiro" subtitle={company.name} userName={name}>
      <div className="mx-auto max-w-[1320px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/empresas/${id}`} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            ← Central da empresa
          </Link>
          <Link href={assistantHref(id, contextualAssistantPrompt("financeiro"))} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
            Analisar com IA
          </Link>
        </div>
        <FinancialNav companyId={id} period={period} current="resultado" availablePeriods={dash.availablePeriods} />
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
          Competência: {periodLongLabel(period)}
        </p>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          {coverage.label}
        </p>

        {empty ? (
          <EmptyState
            title="Nenhum período financeiro cadastrado."
            body="Informe a DRE da competência para ver faturamento, CMV, EBITDA e gap de meta."
            action={
              <Link href={periodHref(`/empresas/${id}/financeiro/dre`, period)} className="text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
                Adicionar período
              </Link>
            }
          />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Faturamento" value={moneyOrMissing(dash.dre.grossRevenue, dash.dre.informed.grossRevenue)} />
              <Metric label="Receita líquida" value={moneyOrMissing(dash.dre.netRevenue)} />
              <Metric
                label="CMV"
                value={moneyOrMissing(dash.dre.cogs, dash.dre.informed.cogs)}
                hint={percentOrMissing(dash.ratios.cogsPercent)}
              />
              <Metric
                label="Margem bruta"
                value={moneyOrMissing(dash.dre.grossMargin)}
                hint={percentOrMissing(dash.ratios.grossMarginPercent)}
              />
              <Metric
                label="Folha"
                value={moneyOrMissing(dash.dre.input.payroll, dash.dre.informed.payroll)}
                hint={percentOrMissing(dash.ratios.payrollPercent)}
              />
              <Metric
                label="EBITDA"
                value={coverage.definitive ? moneyOrMissing(dash.dre.ebitda) : "Dados incompletos"}
                hint={coverage.definitive ? percentOrMissing(dash.ratios.ebitdaPercent) : coverage.label}
              />
              <Metric
                label="Caixa do mês"
                value={dash.cashMonth.hasMovements ? formatBRL(dash.cashMonth.operatingBalance) : "Sem dados"}
                hint="Não é EBITDA"
              />
              <Metric
                label="Ponto de equilíbrio"
                value={dash.breakEven.value != null ? formatBRL(dash.breakEven.value) : "Não calculável com os dados atuais."}
              />
              <Metric label="Meta" value={moneyOrMissing(dash.goals.revenueTarget)} />
              <Metric
                label="Gap para meta"
                value={gap == null ? "Sem meta ou receita" : `${gap >= 0 ? "+" : ""}${formatBRL(gap)}`}
              />
            </section>
            <div className="grid gap-2 md:grid-cols-2">
              <CalculationHelp label="EBITDA" text={CALCULATION_HELP.ebitda} />
              <CalculationHelp label="Ponto de equilíbrio" text={CALCULATION_HELP.breakEven} />
              <CalculationHelp label="Gap" text={CALCULATION_HELP.gap} />
              <CalculationHelp label="Caixa" text={CALCULATION_HELP.cash} />
            </div>

            <div>
              <Link
                href={`/empresas/${id}/oportunidades`}
                className="inline-flex rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]"
                style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
              >
                Revisar oportunidades
              </Link>
            </div>
          </>
        )}

        {dash.previous && dash.dre.grossRevenue != null && dash.previous.revenue != null ? (
          <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[15px] font-bold">Comparação</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Compare label="Faturamento" current={dash.dre.grossRevenue} previous={dash.previous.revenue} money />
              <Compare label="CMV %" current={dash.ratios.cogsPercent} previous={dash.previous.cogsPercent} />
              <Compare label="EBITDA" current={coverage.definitive ? dash.dre.ebitda : null} previous={dash.previous.ebitda} money />
            </div>
          </section>
        ) : null}

        {hasHistory ? (
          <section className="grid gap-3 md:hidden">
            {dash.history.map((item) => (
              <article key={`${item.periodYear}-${item.periodMonth}`} className="rounded-2xl border p-3" style={{ borderColor: "var(--border)" }}>
                <p className="font-bold">{periodLabel(item)}</p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                  Receita {displayMoney(item.revenue)} · EBITDA {displayMoney(item.ebitda)}
                </p>
              </article>
            ))}
          </section>
        ) : null}

        {hasHistory ? (
          <section className="hidden rounded-2xl border p-5 md:block" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[15px] font-bold">Histórico</h2>
            <table className="mt-3 w-full text-left text-[12px]">
              <thead style={{ color: "var(--text-3)" }}>
                <tr>
                  <th className="pb-2">Mês</th>
                  <th className="pb-2">Receita</th>
                  <th className="pb-2">CMV %</th>
                  <th className="pb-2">EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {dash.history.map((item) => (
                  <tr key={`row-${item.periodYear}-${item.periodMonth}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2">{periodLabel(item)}</td>
                    <td>{moneyOrMissing(item.revenue)}</td>
                    <td>{percentOrMissing(item.cogsPercent)}</td>
                    <td>{moneyOrMissing(item.ebitda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {dash.insights.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[15px] font-bold">Leitura</h2>
            {dash.insights.map((step) => (
              <div key={`${step.kind}-${step.title}`} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <RiskBadge label={step.kind} tone="neutral" />
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

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-2 text-[18px] font-bold">{value}</div>
      {hint ? <div className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>{hint}</div> : null}
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
    if (value == null) return "Sem dados";
    return money ? formatBRL(value) : formatPercent(value);
  };
  const delta = variation(current, previous);
  const deltaText =
    !delta ? "" : delta.amount === 0 ? " · estável" : ` · ${delta.percent != null ? `${delta.percent > 0 ? "+" : ""}${delta.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : fmt(delta.amount)}`;
  return (
    <div>
      <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="mt-1 font-bold">{fmt(current)}</div>
      <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
        anterior {fmt(previous)}
        {deltaText}
      </div>
    </div>
  );
}
