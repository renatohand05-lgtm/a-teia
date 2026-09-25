import { AppShell } from "@/components/layout/AppShell";

export default function AplicacaoLoading() {
  return (
    <AppShell title="Aplicação">
      <div className="mx-auto max-w-[920px] space-y-4">
        <div className="surface-card h-28 animate-pulse" />
        <div className="surface-card h-40 animate-pulse" />
      </div>
    </AppShell>
  );
}
