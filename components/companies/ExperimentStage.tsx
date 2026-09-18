import { EXPERIMENT_CLASSIFICATION_LABELS, EXPERIMENT_STATUS_LABELS, isDraftStatus } from "@/lib/experiment-engine";
import { RiskBadge } from "@/components/ui/RiskBadge";

const STAGES = ["HIPÓTESE", "TESTE", "MEDIÇÕES", "RESULTADO", "EVIDÊNCIA"] as const;

export function ExperimentStage({
  status,
  hasMeasurements,
  hasEvidence,
}: {
  status: string;
  hasMeasurements: boolean;
  hasEvidence: boolean;
}) {
  const current =
    hasEvidence || status === "COMPLETED"
      ? "EVIDÊNCIA"
      : hasMeasurements
        ? "MEDIÇÕES"
        : status === "RUNNING"
          ? "TESTE"
          : "HIPÓTESE";
  const index = STAGES.indexOf(current);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em]">
      {STAGES.map((stage, i) => (
        <span key={stage} className="flex items-center gap-2">
          <span style={{ color: i <= index ? "var(--gold-soft)" : "var(--text-3)" }}>{stage}</span>
          {i < STAGES.length - 1 ? <span style={{ color: "var(--text-3)" }}>→</span> : null}
        </span>
      ))}
    </div>
  );
}

export function ExperimentStatusBadge({ status }: { status: string }) {
  const label = EXPERIMENT_STATUS_LABELS[status] ?? status;
  const tone = status === "COMPLETED" ? "good" : status === "RUNNING" ? "warn" : isDraftStatus(status) ? "neutral" : "bad";
  return <RiskBadge label={label} tone={tone} />;
}

export function ExperimentClassBadge({ classification }: { classification: string | null }) {
  if (!classification) return <RiskBadge label="Sem classificação" />;
  const label = EXPERIMENT_CLASSIFICATION_LABELS[classification as keyof typeof EXPERIMENT_CLASSIFICATION_LABELS] ?? classification;
  const tone = classification === "VALIDATED" ? "good" : classification === "REFUTED" ? "bad" : "warn";
  return <RiskBadge label={label} tone={tone} />;
}
