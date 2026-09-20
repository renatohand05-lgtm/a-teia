"use client";

import { useState } from "react";
import { CompanyBreadcrumb } from "@/components/layout/CompanyBreadcrumb";
import { CompanyModuleNav } from "@/components/layout/CompanyModuleNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { FocusTrap } from "@/components/ui/FocusTrap";

export function AppFrame({
  title,
  subtitle,
  userName,
  alertCount = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  userName?: string | null;
  alertCount?: number;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <FocusTrap active={menuOpen} onEscape={() => setMenuOpen(false)}>
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={() => setMenuOpen(false)} />
      </FocusTrap>
      <div className="min-w-0 flex-1">
        <Topbar
          title={title}
          subtitle={subtitle}
          userName={userName}
          alertCount={alertCount}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <CompanyBreadcrumb title={title} subtitle={subtitle} />
        <CompanyModuleNav />
        <main className="animate-fade px-4 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
