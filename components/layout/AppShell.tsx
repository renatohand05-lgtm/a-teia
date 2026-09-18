import { CompanyModuleNav } from "@/components/layout/CompanyModuleNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({
  title,
  subtitle,
  userName,
  children,
}: {
  title: string;
  subtitle?: string;
  userName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar title={title} subtitle={subtitle} userName={userName} />
        <CompanyModuleNav />
        <main className="animate-fade px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
