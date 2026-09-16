export function MetricCard({
  label,
  value,
  hint,
  demo = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  demo?: boolean;
}) {
  return (
    <div
      className="flex overflow-hidden rounded-[20px] border transition hover:-translate-y-0.5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="w-[3px] shrink-0 opacity-65"
        style={{ background: "linear-gradient(180deg, var(--gold), rgba(232,191,122,0.2))" }}
      />
      <div className="min-w-0 flex-1 px-5 py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em]" style={{ color: "var(--text-3)" }}>
            {label}
          </p>
          {demo ? (
            <span className="text-[9px] font-extrabold tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
              DEMO
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[26px] font-extrabold tabular-nums leading-tight tracking-[-0.02em]">{value}</p>
        {hint ? (
          <p className="mt-2 text-[11px]" style={{ color: "var(--text-2)" }}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
