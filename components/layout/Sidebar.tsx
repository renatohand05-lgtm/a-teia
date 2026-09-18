"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { COMPANY_NAV, GESTAO_NAV, companyIdFromPath, gestaoHref } from "@/lib/company-nav";
import { FUTURE_NAV, INTELLIGENCE_NAV, PRIMARY_NAV } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
  const companyId = companyIdFromPath(pathname);

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-b lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r"
      style={{
        background: "rgba(10,10,13,0.72)",
        borderColor: "var(--border)",
        backdropFilter: "blur(24px) saturate(160%)",
      }}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="h-11 w-11 overflow-hidden rounded-full"
          style={{
            boxShadow: "0 0 0 1px rgba(232,191,122,0.35), 0 0 24px -6px rgba(232,191,122,0.4)",
          }}
        >
          <Image src="/logo-teia.png" alt="A Teia" width={44} height={44} className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="gold-text text-lg font-extrabold tracking-[0.08em]">A TEIA</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--gold-soft)" }}>
            Centro de decisão
          </p>
        </div>
      </div>

      <nav className="flex max-h-[46vh] flex-1 flex-col overflow-auto px-3 pb-6 lg:max-h-none">
        <GroupLabel>Núcleo</GroupLabel>
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <NavLink key={item.href} href={item.href} active={active} label={item.label} />;
        })}

        <GroupLabel>Gestão</GroupLabel>
        {GESTAO_NAV.map((entry) => {
          const item = COMPANY_NAV.find((nav) => nav.key === entry.key);
          if (!item) return null;
          const href = gestaoHref(companyId, entry.key);
          const active = companyId ? item.match(pathname) : false;
          return (
            <div key={entry.key} className="mb-1">
              <NavLink href={href} active={active} label={entry.label} />
              {companyId && item.children ? (
                <div className="ml-2 mt-1 flex flex-col">
                  {item.children.map((child) => {
                    const childHref = child.href(companyId);
                    const childPath = childHref.split("?")[0] ?? childHref;
                    const childActive =
                      child.key === "evidencias"
                        ? pathname.includes("/experimentos")
                        : pathname === childPath || pathname.startsWith(`${childPath}/`);
                    return (
                      <Link
                        key={child.key}
                        href={childHref}
                        className="rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                        style={{ color: childActive ? "var(--gold-soft)" : "var(--text-3)" }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        <GroupLabel>Inteligência</GroupLabel>
        {INTELLIGENCE_NAV.map((item) => {
          const href =
            item.href === "/assistente" && companyId ? `/empresas/${companyId}/assistente` : item.href;
          const active =
            item.href === "/assistente"
              ? pathname.includes("/assistente")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <NavLink key={`intel-${item.href}`} href={href} active={active} label={item.label} />;
        })}

        <GroupLabel>Em breve</GroupLabel>
        {FUTURE_NAV.map((item) => (
          <span
            key={item.label}
            className="mb-0.5 block cursor-not-allowed rounded-xl px-3 py-2 text-[12px] font-medium opacity-45"
            style={{ color: "var(--text-3)" }}
            title="Ainda não disponível"
          >
            {item.label}
          </span>
        ))}
      </nav>
    </aside>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p
      className="px-2 pb-2 pt-5 text-[10px] font-extrabold uppercase tracking-[0.14em] first:pt-1"
      style={{ color: "var(--text-3)" }}
    >
      {children}
    </p>
  );
}

function NavLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`mb-0.5 block rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
        active ? "text-[#241a08]" : "hover:text-[var(--text-1)]"
      }`}
      style={
        active
          ? {
              background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))",
              boxShadow: "0 8px 20px -6px rgba(232,191,122,0.45)",
            }
          : { color: "var(--text-2)" }
      }
    >
      {label}
    </Link>
  );
}
