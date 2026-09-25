import { AppShell } from "@/components/layout/AppShell";

export default function EstrategiaLoading() {
  return (
    <AppShell title="Estratégia">
      <div className="mx-auto max-w-[880px] space-y-4">
        <div className="surface-card h-28 animate-pulse" />
        <div className="surface-card h-40 animate-pulse" />
      </div>
    </AppShell>
  );
}
