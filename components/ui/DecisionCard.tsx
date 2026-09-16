export function DecisionCard({
  rank,
  title,
  detail,
  score,
  demo = false,
}: {
  rank: number;
  title: string;
  detail: string;
  score?: number;
  demo?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[38px_1fr_auto] items-center gap-2.5 rounded-[14px] border p-3"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border)" }}
    >
      <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[#1d1d1f] text-[13px] font-black">
        {rank}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <b className="text-[12px]">{title}</b>
          {demo ? (
            <span className="text-[9px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
              DEMO
            </span>
          ) : null}
        </div>
        <p className="m-0 mt-1 text-[10.5px]" style={{ color: "var(--text-2)" }}>
          {detail}
        </p>
      </div>
      {typeof score === "number" ? <div className="text-[18px] font-black">{score}</div> : null}
    </div>
  );
}
