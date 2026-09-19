import { Tooltip } from "@/components/ui/Tooltip";

export function CalculationHelp({ label, text }: { label: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
      <span>{label}</span>
      <Tooltip label={`Como calculamos ${label}`} text={text} />
    </span>
  );
}
