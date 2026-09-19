export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      <div className="teia-skeleton h-7 w-40" />
      <div className="teia-skeleton h-36" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card px-5 py-6">
      <p className="text-[15px] font-bold">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        {body}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="rounded-[14px] border p-4 text-[13px]"
      style={{ background: "rgba(224,86,76,0.08)", borderColor: "rgba(224,86,76,0.25)", color: "var(--danger)" }}
    >
      {message}
    </div>
  );
}
