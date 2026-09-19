import Link from "next/link";
import { COVERAGE_LABELS, companyStatusLabel, displaySegment } from "@/lib/company-ux";
import type { CompanyDirectoryRow } from "@/services/companyService";

export function CompanyDirectory({
  companies,
  hrefFor,
}: {
  companies: CompanyDirectoryRow[];
  hrefFor?: (id: string) => string;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-left text-[13px]">
          <thead style={{ color: "var(--text-3)" }}>
            <tr>
              {["Empresa", "Segmento", "Status", "Dados", "Prioridade", "Próxima ação", ""].map((col) => (
                <th key={col || "acoes"} className="px-3 py-2.5 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const href = hrefFor?.(company.id) ?? `/empresas/${company.id}`;
              return (
                <tr key={company.id} className="border-t transition hover:bg-white/[0.03]" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-3 font-bold">
                    <Link href={href}>{company.name}</Link>
                  </td>
                  <td className="px-3 py-3" style={{ color: "var(--text-2)" }}>
                    {displaySegment(company.segment)}
                  </td>
                  <td className="px-3 py-3">{companyStatusLabel(company.status, company.isDemo)}</td>
                  <td className="px-3 py-3">
                    {COVERAGE_LABELS[company.coverage.level]}
                    <span className="block text-[11px]" style={{ color: "var(--text-3)" }}>
                      {company.coverage.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">{company.priorityLabel}</td>
                  <td className="px-3 py-3" style={{ color: "var(--text-2)" }}>
                    {company.nextAction.title}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={href}
                      className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
                      style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
                    >
                      Abrir empresa
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {companies.map((company) => {
          const href = hrefFor?.(company.id) ?? `/empresas/${company.id}`;
          return (
            <article key={company.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {displaySegment(company.segment)} · {companyStatusLabel(company.status, company.isDemo)}
              </p>
              <h3 className="mt-1 text-[16px] font-bold">{company.name}</h3>
              <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                {COVERAGE_LABELS[company.coverage.level]} · {company.coverage.label}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                Prioridade: {company.priorityLabel}
              </p>
              <p className="mt-1 text-[12px] font-semibold">{company.nextAction.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={href}
                  className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
                  style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
                >
                  Abrir empresa
                </Link>
                <Link href={company.nextAction.href} className="rounded-xl border px-3 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
                  {company.nextAction.cta}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
