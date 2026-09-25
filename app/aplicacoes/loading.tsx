import { AppShell } from "@/components/layout/AppShell";

export default function AplicacoesLoading() {
  return (
    <AppShell title="Aplicações">
      <div className="surface-card h-40 animate-pulse" />
    </AppShell>
  );
}
