"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { companyBreadcrumbTrail, companyIdFromPath } from "@/lib/company-nav";
import { intelligenceBreadcrumbTrail } from "@/lib/intelligence-nav";

export function CompanyBreadcrumb({ title, subtitle }: { title: string; subtitle?: string }) {
  const pathname = usePathname();
  const intelligence = intelligenceBreadcrumbTrail(pathname, title, subtitle);
  if (intelligence) {
    return <Trail crumbs={intelligence} />;
  }
  if (!pathname.startsWith("/empresas")) return null;

  const companyId = companyIdFromPath(pathname);
  if (pathname === "/empresas") {
    return <Trail crumbs={[{ label: "Empresas" }]} />;
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
  const companyName = subtitle && subtitle !== title ? subtitle : title;
  const crumbs = companyBreadcrumbTrail(pathname, companyId, companyName, title);
  return <Trail crumbs={crumbs} />;
}

function Trail({ crumbs }: { crumbs: Array<{ href?: string; label: string }> }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 px-4 pb-0 pt-2 text-[12px] lg:px-8" aria-label="Trilha">
      {crumbs.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <span style={{ color: "var(--text-3)" }}>/</span> : null}
          {item.href && index < crumbs.length - 1 ? (
            <Link href={item.href} className="truncate" style={{ color: index === 0 ? "var(--gold-soft)" : undefined }}>
              {item.label}
            </Link>
          ) : (
            <span className="truncate" style={{ color: index === crumbs.length - 1 ? "var(--text-2)" : undefined }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
