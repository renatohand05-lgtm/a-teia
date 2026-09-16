export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="surface-card p-8 text-center text-[13px]" style={{ color: "var(--text-2)" }}>
      {label}
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
    <div
      className="rounded-[15px] border border-dashed p-[18px] text-[12px] leading-relaxed"
      style={{ borderColor: "rgba(255,255,255,.14)", color: "var(--text-2)" }}
    >
      <b className="block text-[13px]" style={{ color: "var(--text-1)" }}>
        {title}
      </b>
      <p className="mt-1.5">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="rounded-[14px] border p-4 text-[12.5px]"
      style={{ background: "rgba(224,86,76,0.08)", borderColor: "rgba(224,86,76,0.25)", color: "#f09a93" }}
    >
      {message}
    </div>
  );
}
