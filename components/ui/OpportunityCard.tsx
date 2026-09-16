import { DemoBadge } from "@/components/ui/DemoBadge";

export function OpportunityCard({
  title,
  description,
  score,
  demo = true,
}: {
  title: string;
  description: string;
  score?: number;
  demo?: boolean;
}) {
  return (
    <div className="surface-card p-[18px]" style={{ minHeight: 110 }}>
      <div className="flex items-start justify-between gap-2">
        <b className="text-[13px]">{title}</b>
        {demo ? <DemoBadge /> : null}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        {description}
      </p>
      {typeof score === "number" ? (
        <span
          className="mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold text-[#241a08]"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          {score}
        </span>
      ) : null}
    </div>
  );
}
