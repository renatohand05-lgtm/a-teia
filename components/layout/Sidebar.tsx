"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { COMPANY_NAV, GESTAO_NAV, companyIdFromPath, gestaoHref } from "@/lib/company-nav";
import { CENTRAL_NAV, FUTURE_NAV, INTELLIGENCE_NAV, PRIMARY_NAV } from "@/types";

export function Sidebar({
  open = false,
  onNavigate,
}: {
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const companyId = companyIdFromPath(pathname);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r transition-transform duration-200 lg:visible lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        open ? "translate-x-0" : "invisible -translate-x-full"
      }`}
      style={{
        background: "rgba(10,10,13,0.94)",
        borderColor: "var(--border)",
        backdropFilter: "blur(24px) saturate(160%)",
      }}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <div
          className="h-10 w-10 overflow-hidden rounded-full"
          style={{ boxShadow: "0 0 0 1px rgba(232,191,122,0.3)" }}
        >
          <Image src="/logo-teia.png" alt="A TEIA" width={40} height={40} className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="gold-text text-[17px] font-extrabold tracking-[0.06em]">A TEIA</p>
          <p className="text-[10px]" style={{ color: "var(--gold-soft)" }}>
            Centro de Decisão Empresarial
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col overflow-auto px-3 pb-6" aria-label="Navegação principal">
        <GroupLabel>Núcleo</GroupLabel>
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <NavLink key={item.href} href={item.href} active={active} label={item.label} onNavigate={onNavigate} />;
        })}

        <GroupLabel>Gestão</GroupLabel>
        {GESTAO_NAV.map((entry) => {
          const item = COMPANY_NAV.find((nav) => nav.key === entry.key);
          if (!item) return null;
          const href = gestaoHref(companyId, entry.key);
          const active = companyId ? item.match(pathname) : false;
          return (
            <div key={entry.key} className="mb-0.5">
              <NavLink href={href} active={active} label={entry.label} onNavigate={onNavigate} />
              {companyId && item.children ? (
                <div className="ml-3 mt-0.5 flex flex-col">
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
                        onClick={onNavigate}
                        className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold-soft)]"
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
          return <NavLink key={`intel-${item.href}`} href={href} active={active} label={item.label} onNavigate={onNavigate} />;
        })}

        <GroupLabel>Central</GroupLabel>
        {CENTRAL_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            active={item.href.startsWith("/") && !item.href.includes("#") ? pathname === item.href : false}
            label={item.label}
            onNavigate={onNavigate}
          />
        ))}

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
      className="px-2 pb-1.5 pt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] first:pt-1"
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
  onNavigate,
}: {
  href: string;
  active: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="mb-0.5 block rounded-xl px-3 py-2 text-[13px] font-semibold transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-soft)]"
      style={
        active
          ? {
              color: "var(--gold-soft)",
              background: "rgba(232,191,122,0.12)",
              boxShadow: "inset 2px 0 0 var(--gold)",
            }
          : { color: "var(--text-2)" }
      }
    >
      {label}
    </Link>
  );
}
