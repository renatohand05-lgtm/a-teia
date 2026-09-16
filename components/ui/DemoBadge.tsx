export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-[0.12em] ${className}`}
      style={{
        color: "var(--gold-soft)",
        borderColor: "rgba(232,191,122,0.35)",
        background: "rgba(232,191,122,0.1)",
      }}
    >
      DEMO
    </span>
  );
}
