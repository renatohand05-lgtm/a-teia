const TONES = {
  good: { bg: "rgba(52,199,111,0.10)", color: "#7bd99a", border: "rgba(52,199,111,0.22)" },
  warn: { bg: "rgba(255,159,10,0.10)", color: "#f0b463", border: "rgba(255,159,10,0.22)" },
  bad: { bg: "rgba(224,86,76,0.10)", color: "#f09a93", border: "rgba(224,86,76,0.22)" },
  neutral: { bg: "rgba(255,255,255,0.06)", color: "var(--text-3)", border: "var(--border)" },
};

export function RiskBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-[11.5px] font-bold"
      style={{ background: t.bg, color: t.color, borderColor: t.border }}
    >
      {label}
    </span>
  );
}
