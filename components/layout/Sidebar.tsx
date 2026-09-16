"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FUTURE_NAV, PRIMARY_NAV } from "@/types";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-full flex-col border-b lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r"
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
            Gestão no Foco
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 pb-6">
        <p className="px-2 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
          Núcleo
        </p>
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 block rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
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
              {item.label}
            </Link>
          );
        })}

        <p className="px-2 pb-2 pt-5 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
          Módulos futuros
        </p>
        {FUTURE_NAV.map((item) => (
          <span
            key={item.label}
            className="mb-0.5 block cursor-not-allowed rounded-xl px-3 py-2 text-[12px] font-medium opacity-45"
            style={{ color: "var(--text-3)" }}
            title="Fora do escopo da Sprint 0"
          >
            {item.label}
          </span>
        ))}
      </nav>
    </aside>
  );
}
