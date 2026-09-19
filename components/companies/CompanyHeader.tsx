import Link from "next/link";
import { companyStatusLabel, displaySegment } from "@/lib/company-ux";
import type { CompanyDTO } from "@/services/companyService";

export function CompanyHeader({
  company,
  nextTitle,
  nextHref,
  nextCta,
}: {
  company: CompanyDTO;
  nextTitle?: string;
  nextHref?: string;
  nextCta?: string;
}) {
  return (
    <section className="rounded-2xl border px-4 py-4" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
        {displaySegment(company.segment)} · {companyStatusLabel(company.status, company.isDemo)}
      </p>
      <h2 className="mt-1 text-[24px] font-bold tracking-[-0.02em]">{company.name}</h2>
      {nextTitle ? (
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
          Próxima ação: {nextTitle}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-xl px-4 py-2 text-[12px] font-extrabold text-[#241a08]"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            {nextCta ?? "Continuar"}
          </Link>
        ) : null}
        <Link href="#cadastro" className="rounded-xl border px-4 py-2 text-[12px] font-bold" style={{ borderColor: "var(--border)" }}>
          Editar
        </Link>
        <Link
          href={`/empresas/${company.id}/assistente`}
          className="rounded-xl border px-4 py-2 text-[12px] font-bold"
          style={{ borderColor: "var(--border)" }}
        >
          Analisar com IA
        </Link>
      </div>
    </section>
  );
}
