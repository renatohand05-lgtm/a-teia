"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY_MODULE_TABS, COMPANY_NAV, companyIdFromPath } from "@/lib/company-nav";

export function CompanyModuleNav() {
  const pathname = usePathname();
  const companyId = companyIdFromPath(pathname);
  if (!companyId) return null;

  return (
    <div className="border-b px-4 lg:px-8" style={{ borderColor: "var(--border)", background: "rgba(0,0,0,.28)" }}>
      <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Módulos da empresa">
        {COMPANY_MODULE_TABS.map((tab) => {
          const item = COMPANY_NAV.find((entry) => entry.key === tab.key);
          const href = item ? item.href(companyId) : `/empresas/${companyId}`;
          const active = item ? item.match(pathname) : false;
          return (
            <Link
              key={tab.key}
              href={href}
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold-soft)]"
              style={
                active
                  ? {
                      color: "#241a08",
                      background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))",
                    }
                  : { color: "var(--text-2)", background: "rgba(255,255,255,.04)" }
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
