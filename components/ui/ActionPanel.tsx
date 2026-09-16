export function ActionPanel({
  kicker,
  title,
  body,
  children,
}: {
  kicker?: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[15px] border p-3.5"
      style={{ background: "rgba(52,199,111,.07)", borderColor: "rgba(52,199,111,.18)" }}
    >
      {kicker ? (
        <small className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#7bd99a]">{kicker}</small>
      ) : null}
      <b className="mt-1.5 block text-[12px] leading-snug">{title}</b>
      {body ? (
        <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {body}
        </p>
      ) : null}
      {children}
    </div>
  );
}
