export function PageSkeleton({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-[1480px] space-y-4 px-4 py-6 lg:px-8" aria-busy="true" aria-label={label}>
      <div className="teia-skeleton h-7 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="teia-skeleton h-24" />
        <div className="teia-skeleton h-24" />
        <div className="teia-skeleton h-24" />
        <div className="teia-skeleton h-24" />
      </div>
      <div className="teia-skeleton h-64" />
    </div>
  );
}
