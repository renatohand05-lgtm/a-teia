export function ScoreGauge({
  score,
  label = "Score",
  caption,
  demo = false,
}: {
  score: number;
  label?: string;
  caption?: string;
  demo?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const deg = (clamped / 100) * 360;
  return (
    <div className="text-center">
      <p className="mb-1.5 text-[9.5px]" style={{ color: "var(--text-3)" }}>
        {label} {demo ? "· DEMO" : ""}
      </p>
      <div
        className="mx-auto grid h-[84px] w-[84px] place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--green) 0deg ${deg}deg, rgba(255,255,255,.08) ${deg}deg 360deg)` }}
      >
        <div className="flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full bg-[#141418] text-[15px] font-extrabold">
          {clamped}
          {caption ? <small className="mt-0.5 text-[7px] font-semibold" style={{ color: "var(--text-3)" }}>{caption}</small> : null}
        </div>
      </div>
    </div>
  );
}
