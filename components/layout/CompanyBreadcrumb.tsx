"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY_NAV, companyIdFromPath, findCompanyNav } from "@/lib/company-nav";

export function CompanyBreadcrumb({ title, subtitle }: { title: string; subtitle?: string }) {
  const pathname = usePathname();
  if (!pathname.startsWith("/empresas")) return null;

  const companyId = companyIdFromPath(pathname);
  if (pathname === "/empresas") {
    return (
      <nav className="px-4 pb-0 pt-2 text-[12px] lg:px-8" aria-label="Trilha">
        <span style={{ color: "var(--text-3)" }}>Empresas</span>
      </nav>
    );
  }

  if (pathname === "/empresas/nova") {
    return (
      <nav className="flex flex-wrap items-center gap-1 px-4 pb-0 pt-2 text-[12px] lg:px-8" aria-label="Trilha">
        <Link href="/empresas" style={{ color: "var(--gold-soft)" }}>
          Empresas
        </Link>
        <span style={{ color: "var(--text-3)" }}>/</span>
        <span>Nova empresa</span>
      </nav>
    );
  }

  if (!companyId) return null;

  const moduleLabel =
    COMPANY_NAV.find((item) => item.match(pathname) && item.key !== "central")?.label ??
    findCompanyNav(pathname.split("/").pop() ?? "")?.label ??
    (pathname.endsWith("/onboarding") ? "Onboarding" : null);

  const companyName = moduleLabel ? subtitle || title : title;

  return (
    <nav className="flex flex-wrap items-center gap-1 px-4 pb-0 pt-2 text-[12px] lg:px-8" aria-label="Trilha">
      <Link href="/empresas" style={{ color: "var(--gold-soft)" }}>
        Empresas
      </Link>
      <span style={{ color: "var(--text-3)" }}>/</span>
      <Link href={`/empresas/${companyId}`} className="truncate font-semibold">
        {companyName}
      </Link>
      {moduleLabel ? (
        <>
          <span style={{ color: "var(--text-3)" }}>/</span>
          <span className="truncate" style={{ color: "var(--text-2)" }}>
            {title}
          </span>
        </>
      ) : null}
    </nav>
  );
}
